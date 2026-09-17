// POST /api/whatsapp/webhook — Meta WhatsApp Cloud API bot
// GET  /api/whatsapp/webhook — Meta webhook verification (challenge echo)
//
// Costo: $0 — conversaciones donde el usuario escribe primero son gratuitas (ventana 24h)
// Sin Twilio — solo fetch() a la Graph API de Meta
//
// Regla de Oro: CERO PII almacenado sin cifrar, y CERO datos bancarios almacenados EN
// ABSOLUTO — ni cifrados. El único dato adicional persistido (Módulo 2) es un puntero
// cifrado teléfono↔email en Redis (lib/wa-identity.ts) para no volver a pedir el email;
// Bridge sigue siendo la única fuente de verdad del estado KYC. Los datos del destinatario
// (nombre, CLABE/IBAN/cuenta) viajan solo dentro de la conversación (sesión Redis de 10 min,
// TTL corto, se borra al terminar) y en el link final a /enviar — nunca se guardan más allá
// de eso, ni siquiera para "destinatarios frecuentes".
//
// Módulo 2/3 — flujo conversacional + KYC + recolección de destinatario + confirmación:
//   1. "200 USD México" → parseamos monto/moneda/país
//   2. Si no conocemos su email (primera vez) → lo pedimos una sola vez
//   3. Bridge (findCustomerByEmail) — si no tiene KYC aprobado, link a /kyc (Persona, sin
//      reimplementar KYC)
//   4. Si ya está aprobado → pedimos nombre del destinatario y su cuenta bancaria (formato
//      según el país — CLABE/IBAN/routing+account/sort code+account/PIX)
//   5. Validamos con lib/wa-validation.ts (checksums reales: CLABE módulo 10, IBAN módulo 97,
//      ABA routing módulo 10) — si falla, pedimos corregir
//   6. Mostramos un resumen enmascarado y pedimos confirmación explícita (SI/CANCELAR)
//   7. Al confirmar: entregamos un link a /enviar con TODO precargado — el depósito real
//      solo se dispara ahí, en la web ya probada en producción, nunca directo desde el chat
//      (mismo patrón que usa Félix Pago: "envía un link seguro para completar el pago" —
//      un número de WhatsApp comprometido, ej. por SIM-swap, no basta para mover dinero real)
//   8. Cuando Bridge aprueba el KYC (webhook customer.approved) avisamos por WhatsApp
//      — ver app/api/bridge/webhook/route.ts
//   9. Al completarse un envío con código de referido, notificamos al referidor
//      — ver app/api/bridge/webhook/route.ts
//
// Todo el texto sale de messages/*.json (namespace "whatsapp") en los 19 idiomas soportados,
// con el idioma inferido del código de país del teléfono (lib/wa-i18n.ts).
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRedis }                  from "@/lib/redis";
import { sendWhatsAppMessage }       from "@/lib/whatsapp";
import { getWaTranslator, localeFromPhone, type WaLocale } from "@/lib/wa-i18n";
import { getEmailForPhone, setEmailForPhone, setPendingTransfer, hashPhone } from "@/lib/wa-identity";
import { findCustomerByEmail }       from "@/providers/bridge/customers";
import { getCountry }                from "@/constants/countries";
import {
  validateAccountDetails, parseAccountInput, accountPromptKey, maskedAccountSummary,
  type AccountDetails,
} from "@/lib/wa-validation";

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

// ── Session TTL: 10 min — hay más pasos ahora (nombre + cuenta + confirmación) ───
const SESSION_TTL = 10 * 60; // seconds

type WaStep = 1 | 3 | 5 | 6 | 7;
// 1 = need amount+country · 3 = need email · 5 = need recipient name
// 6 = need account details · 7 = awaiting SI/CANCELAR confirmation

interface WaSession {
  step:      WaStep;
  amount?:   number;
  currency?: string;
  country?:  string;
  locale?:   WaLocale;
  email?:    string;
  recipientName?: string;
  account?:  AccountDetails;
  recipientGets?: number;
  recipientCurrency?: string;
}

async function getSession(waId: string): Promise<WaSession | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:session:${hashPhone(waId)}`);
    return raw ? JSON.parse(raw) as WaSession : null;
  } catch { return null; }
}

async function setSession(waId: string, session: WaSession): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(
      `wa:session:${hashPhone(waId)}`,
      JSON.stringify(session),
      { EX: SESSION_TTL },
    );
  } catch { /* non-critical */ }
}

async function clearSession(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`wa:session:${hashPhone(waId)}`);
  } catch { /* non-critical */ }
}

// ── Parse incoming message text ───────────────────────────────────────────────

// Supported country aliases → ISO code
const COUNTRY_ALIASES: Record<string, string> = {
  mexico: "MX", méxico: "MX", mx: "MX",
  usa: "US", "estados unidos": "US", "united states": "US", us: "US", eeuu: "US",
  brasil: "BR", brazil: "BR", br: "BR",
  colombia: "CO", co: "CO",
  uk: "GB", "reino unido": "GB", "united kingdom": "GB", gb: "GB", england: "GB",
  alemania: "DE", germany: "DE", de: "DE",
  españa: "ES", espana: "ES", spain: "ES", es: "ES",
  francia: "FR", france: "FR", fr: "FR",
  italia: "IT", italy: "IT", it: "IT",
  portugal: "PT", pt: "PT",
  canada: "CA", canadá: "CA", ca: "CA",
};

// Supported currencies
const CURRENCY_ALIASES: Record<string, string> = {
  usd: "USD", dólares: "USD", dollars: "USD", dollar: "USD", dolar: "USD",
  cad: "CAD", "dólares canadienses": "CAD",
  eur: "EUR", euros: "EUR", euro: "EUR",
  gbp: "GBP", pounds: "GBP", libras: "GBP",
  mxn: "MXN", pesos: "MXN", peso: "MXN",
};

function parseAmount(text: string): { amount: number; currency: string; country: string } | null {
  const t = text.toLowerCase().trim();

  const numMatch = t.match(/\b(\d{1,6}(?:[.,]\d{1,2})?)\b/);
  if (!numMatch) return null;
  const amount = parseFloat(numMatch[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  let currency = "USD";
  for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
    if (t.includes(alias)) { currency = code; break; }
  }

  let country = "MX"; // default
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    if (t.includes(alias)) { country = code; break; }
  }

  return { amount, currency, country };
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// Fetches a guaranteed-rate quote — same engine as /api/bridge/fx-quote (lib/bridge-fees.ts).
// Two-pass refine (approx → exact), same pattern as components/currency-calculator.tsx.
async function fetchQuote(currency: string, country: string, amount: number): Promise<{ recipientGets: number; recipientCurrency: string; rate: number } | null> {
  const destCurrency = getCountry(country)?.currency ?? "MXN";
  try {
    const qs1 = new URLSearchParams({ from: currency, to: destCurrency, amount: String(amount), country });
    const r1 = await fetch(`${APP_URL}/api/bridge/fx-quote?${qs1}`);
    if (!r1.ok) return null;
    const q1 = await r1.json() as { fx_rate: number };

    const approxTarget = parseFloat((amount * q1.fx_rate).toFixed(2));
    const qs2 = new URLSearchParams({ from: currency, to: destCurrency, amount: String(approxTarget), country });
    const r2 = await fetch(`${APP_URL}/api/bridge/fx-quote?${qs2}`);
    const q2 = r2.ok ? await r2.json() as { fx_rate: number; recipient_gets: number } : { fx_rate: q1.fx_rate, recipient_gets: approxTarget };
    return { recipientGets: q2.recipient_gets, recipientCurrency: destCurrency, rate: q2.fx_rate };
  } catch {
    return null;
  }
}

// Construye el link final a /enviar con TODO precargado (email, monto, destinatario y
// cuenta ya validados) — el depósito real solo se dispara ahí, nunca desde el chat.
function buildEnviarLink(params: {
  email: string; currency: string; country: string; amount: string;
  recipientName: string; account: AccountDetails;
}): string {
  const qs = new URLSearchParams({
    email: params.email, currency: params.currency, country: params.country,
    amount: params.amount, recipient_name: params.recipientName,
    channel: "whatsapp", // Módulo 2 — absorbe el costo de sesión de Meta internamente (lib/bridge-fees.ts)
  });
  const cc = params.country.toUpperCase();
  if (cc === "MX") qs.set("account", params.account.clabe ?? "");
  else if (cc === "US") { qs.set("routing", params.account.routing_number ?? ""); qs.set("account", params.account.account_number ?? ""); }
  else if (cc === "GB") { qs.set("sortCode", params.account.sort_code ?? ""); qs.set("account", params.account.account_number ?? ""); }
  else if (params.account.iban) { qs.set("account", params.account.iban); if (params.account.bic) qs.set("bic", params.account.bic); }
  else if (params.account.pix_key) qs.set("account", params.account.pix_key);
  else { qs.set("account", params.account.account_number ?? ""); if (params.account.bic) qs.set("bic", params.account.bic); }
  return `${APP_URL}/enviar?${qs.toString()}`;
}

// ── KYC gate — pide email/verifica Bridge, arranca la recolección de destinatario ──
async function startKycOrCollection(
  waId: string, locale: WaLocale, t: Awaited<ReturnType<typeof getWaTranslator>>,
  amount: number, currency: string, country: string, email: string,
): Promise<void> {
  const customer = await findCustomerByEmail(email).catch(() => null);
  const isOk = (s?: string) => s === "active" || s === "approved" || s === "granted";
  const kycApproved = !!customer && (isOk(customer.status) || isOk(customer.kyc_status));

  if (!kycApproved) {
    const kycLink = `${APP_URL}/kyc?email=${encodeURIComponent(email)}&wa=${hashPhone(waId)}&locale=${locale}`;
    await setPendingTransfer(email, { waId, locale, amount, currency, country });
    await sendWhatsAppMessage(waId, t("kyc_needed", { link: kycLink }));
    await clearSession(waId);
    return;
  }

  const quote = await fetchQuote(currency, country, amount);
  await setSession(waId, {
    step: 5, amount, currency, country, locale, email,
    recipientGets: quote?.recipientGets, recipientCurrency: quote?.recipientCurrency,
  });

  if (quote) {
    await sendWhatsAppMessage(waId, t("quote_ready_precheck", {
      recipient_amount:   quote.recipientGets.toLocaleString("en-US"),
      recipient_currency: quote.recipientCurrency,
      rate:                quote.rate,
      from_currency:       currency,
    }));
  }
  await sendWhatsAppMessage(waId, t("ask_recipient_name"));
}

// ── GET — Meta webhook verification ──────────────────────────────────────────
export function GET(req: NextRequest): Response {
  const verifyToken  = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode         = req.nextUrl.searchParams.get("hub.mode");
  const token        = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge    = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ── POST — incoming WhatsApp messages ────────────────────────────────────────
export async function POST(req: NextRequest): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const entry = (body.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
  if (!entry) return NextResponse.json({ ok: true });

  const changes = (entry.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
  const value   = changes?.value as Record<string, unknown> | undefined;
  const messages = value?.messages as unknown[] | undefined;

  if (!messages?.length) return NextResponse.json({ ok: true });

  const msg    = messages[0] as Record<string, unknown>;
  const waId   = String((msg.from as string) ?? "");
  const msgType = String((msg.type as string) ?? "");

  if (msgType !== "text") return NextResponse.json({ ok: true });

  const text = String(((msg.text as Record<string,string>)?.body ?? "")).trim();
  if (!text || !waId) return NextResponse.json({ ok: true });

  const session = await getSession(waId);
  const locale = session?.locale ?? localeFromPhone(waId);
  const t = await getWaTranslator(locale);

  // ── Step 7: esperando SI / CANCELAR ───────────────────────────────────────
  if (session?.step === 7 && session.account && session.recipientName && session.email
      && session.amount && session.currency && session.country) {
    const answer = text.trim().toLowerCase();
    if (answer === "si" || answer === "sí") {
      const link = buildEnviarLink({
        email: session.email, currency: session.currency, country: session.country,
        amount: String(session.recipientGets ?? session.amount),
        recipientName: session.recipientName, account: session.account,
      });
      await sendWhatsAppMessage(waId, t("confirmed_link", { link }));
      await clearSession(waId);
    } else if (answer === "cancelar" || answer === "cancel") {
      await sendWhatsAppMessage(waId, t("cancelled"));
      await clearSession(waId);
    } else {
      await sendWhatsAppMessage(waId, t("confirm_retry"));
    }
    return NextResponse.json({ ok: true });
  }

  // ── Step 6: esperando los datos de cuenta del destinatario ────────────────
  if (session?.step === 6 && session.recipientName && session.country
      && session.amount && session.currency && session.email) {
    const parsed = parseAccountInput(session.country, text);
    const result = validateAccountDetails(session.country, parsed);
    if (!result.isValid) {
      await sendWhatsAppMessage(waId, t(`validation_${result.errorKey ?? "generic"}`));
      return NextResponse.json({ ok: true });
    }
    const summary = maskedAccountSummary(session.country, parsed);
    await setSession(waId, { ...session, step: 7, account: parsed });
    await sendWhatsAppMessage(waId, t("confirm_summary", {
      name:     session.recipientName,
      account:  summary,
      amount:   (session.recipientGets ?? session.amount).toLocaleString("en-US"),
      currency: session.recipientCurrency ?? session.currency,
    }));
    return NextResponse.json({ ok: true });
  }

  // ── Step 5: esperando el nombre del destinatario ──────────────────────────
  if (session?.step === 5 && session.amount && session.currency && session.country && session.email) {
    const name = text.trim();
    if (name.length < 2) {
      await sendWhatsAppMessage(waId, t("invalid_name"));
      return NextResponse.json({ ok: true });
    }
    await setSession(waId, { ...session, step: 6, recipientName: name });
    await sendWhatsAppMessage(waId, t(accountPromptKey(session.country)));
    return NextResponse.json({ ok: true });
  }

  // ── Step 3: esperando el email ─────────────────────────────────────────────
  if (session?.step === 3 && session.amount && session.currency && session.country) {
    if (!isValidEmail(text)) {
      await sendWhatsAppMessage(waId, t("invalid_email"));
      return NextResponse.json({ ok: true });
    }
    const email = text.trim().toLowerCase();
    await setEmailForPhone(waId, email, locale);
    await startKycOrCollection(waId, locale, t, session.amount, session.currency, session.country, email);
    return NextResponse.json({ ok: true });
  }

  // ── Step 1 (default): cualquier mensaje → intentar parsear "monto + país" ─
  const parsed = parseAmount(text);

  if (!parsed) {
    // Primer contacto → saludo completo con ejemplos. Ya saludado y sigue sin
    // parsear → mensaje corto de "no entendí" en vez de repetir todo.
    await setSession(waId, { step: 1, locale });
    await sendWhatsAppMessage(waId, session ? t("parse_error") : t("greeting"));
    return NextResponse.json({ ok: true });
  }

  const { amount, currency, country } = parsed;
  const identity = await getEmailForPhone(waId);

  if (identity) {
    // Usuario recurrente — nos saltamos pedir el email de nuevo.
    const identityLocale = (identity.locale as WaLocale) ?? locale;
    await startKycOrCollection(waId, identityLocale, await getWaTranslator(identityLocale), amount, currency, country, identity.email);
    return NextResponse.json({ ok: true });
  }

  // Primera vez que vemos este número — pedimos el email una sola vez.
  await setSession(waId, { step: 3, amount, currency, country, locale });
  await sendWhatsAppMessage(waId, t("ask_email"));
  return NextResponse.json({ ok: true });
}
