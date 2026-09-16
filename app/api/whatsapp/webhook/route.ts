// POST /api/whatsapp/webhook — Meta WhatsApp Cloud API bot
// GET  /api/whatsapp/webhook — Meta webhook verification (challenge echo)
//
// Costo: $0 — conversaciones donde el usuario escribe primero son gratuitas (ventana 24h)
// Sin Twilio — solo fetch() a la Graph API de Meta
//
// Regla de Oro: CERO PII almacenado sin cifrar. El número de teléfono se hashea con
// SHA-256; el único dato adicional persistido (Módulo 2) es un puntero cifrado
// teléfono↔email en Redis (lib/wa-identity.ts) para no volver a pedir el email — Bridge
// sigue siendo la única fuente de verdad del estado KYC (ver providers/bridge/customers.ts).
//
// Módulo 2 — flujo conversacional + KYC embebido:
//   1. Usuario pide un envío ("200 USD México") → parseamos monto/moneda/país (igual que antes)
//   2. Si no conocemos su email (primera vez) → lo pedimos una sola vez
//   3. Consultamos Bridge (findCustomerByEmail) — si no tiene KYC aprobado, mandamos el link
//      a /kyc (Persona embebido vía Bridge, sin reimplementar KYC)
//   4. Si ya está aprobado → cotización garantizada (misma fórmula que /api/bridge/fx-quote)
//      + link a /enviar precargado para terminar el envío
//   5. Cuando Bridge aprueba el KYC (webhook customer.approved) le avisamos por WhatsApp
//      — ver app/api/bridge/webhook/route.ts
//
// Todo el texto sale de messages/*.json (namespace "whatsapp") en los 19 idiomas soportados,
// con el idioma inferido del código de país del teléfono (lib/wa-i18n.ts).
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRedis }                  from "@/lib/redis";
import { createHash }                from "crypto";
import { sendWhatsAppMessage }       from "@/lib/whatsapp";
import { getWaTranslator, localeFromPhone, type WaLocale } from "@/lib/wa-i18n";
import { getEmailForPhone, setEmailForPhone, setPendingTransfer, hashPhone } from "@/lib/wa-identity";
import { findCustomerByEmail }       from "@/providers/bridge/customers";
import { getCountry }                from "@/constants/countries";

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

// ── Session TTL: 5 min — long enough for the conversation ────────────────────
const SESSION_TTL = 5 * 60; // seconds

type WaStep = 1 | 3; // 1 = need amount+country, 3 = need email (only for unknown numbers)

interface WaSession {
  step:      WaStep;
  amount?:   number;
  currency?: string;
  country?:  string;
  locale?:   WaLocale;
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

// ── KYC + quote step (shared by the "known number" and "just gave email" paths) ──

async function sendKycOrQuote(
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
    return;
  }

  // Guaranteed-rate quote — same engine as /api/bridge/fx-quote (lib/bridge-fees.ts),
  // no parallel fee formula. Two-pass refine (approx → exact) same as components/currency-calculator.tsx.
  const destCurrency = getCountry(country)?.currency ?? "MXN";
  const enviarLink = (targetAmount: string) =>
    `${APP_URL}/enviar?email=${encodeURIComponent(email)}&currency=${currency}&country=${country}&amount=${targetAmount}`;

  try {
    const qs1 = new URLSearchParams({ from: currency, to: destCurrency, amount: String(amount), country });
    const r1 = await fetch(`${APP_URL}/api/bridge/fx-quote?${qs1}`);
    if (!r1.ok) { await sendWhatsAppMessage(waId, t("link_ready", { link: enviarLink(String(amount)) })); return; }
    const q1 = await r1.json() as { fx_rate: number };

    const approxTarget = parseFloat((amount * q1.fx_rate).toFixed(2));
    const qs2 = new URLSearchParams({ from: currency, to: destCurrency, amount: String(approxTarget), country });
    const r2 = await fetch(`${APP_URL}/api/bridge/fx-quote?${qs2}`);
    const q2 = r2.ok ? await r2.json() as { fx_rate: number; recipient_gets: number } : q1 as unknown as { fx_rate: number; recipient_gets: number };
    const recipientGets = q2.recipient_gets ?? approxTarget;

    await sendWhatsAppMessage(waId, t("quote_ready", {
      recipient_amount:   recipientGets.toLocaleString("en-US"),
      recipient_currency: destCurrency,
      rate:                q2.fx_rate,
      from_currency:       currency,
      link:                enviarLink(String(recipientGets)),
    }));
  } catch {
    await sendWhatsAppMessage(waId, t("link_ready", { link: enviarLink(String(amount)) }));
  }
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

  // ── Step 3: we're waiting for their email ─────────────────────────────────
  if (session?.step === 3 && session.amount && session.currency && session.country) {
    if (!isValidEmail(text)) {
      await sendWhatsAppMessage(waId, t("invalid_email"));
      return NextResponse.json({ ok: true });
    }
    const email = text.trim().toLowerCase();
    await setEmailForPhone(waId, email, locale);
    await clearSession(waId);
    await sendKycOrQuote(waId, locale, t, session.amount, session.currency, session.country, email);
    return NextResponse.json({ ok: true });
  }

  // ── Step 1 (default): any message → try to parse "amount + country" ──────
  const parsed = parseAmount(text);

  if (!parsed) {
    // First contact → full greeting with examples. Already greeted once and still
    // couldn't parse → shorter "didn't understand" nudge instead of repeating it.
    await setSession(waId, { step: 1, locale });
    await sendWhatsAppMessage(waId, session ? t("parse_error") : t("greeting"));
    return NextResponse.json({ ok: true });
  }

  const { amount, currency, country } = parsed;
  const identity = await getEmailForPhone(waId);

  if (identity) {
    // Returning user — skip email + KYC re-check delay, straight to quote/link.
    await clearSession(waId);
    await sendKycOrQuote(waId, (identity.locale as WaLocale) ?? locale, await getWaTranslator((identity.locale as WaLocale) ?? locale), amount, currency, country, identity.email);
    return NextResponse.json({ ok: true });
  }

  // First time we see this number — ask for email once.
  await setSession(waId, { step: 3, amount, currency, country, locale });
  await sendWhatsAppMessage(waId, t("ask_email"));
  return NextResponse.json({ ok: true });
}
