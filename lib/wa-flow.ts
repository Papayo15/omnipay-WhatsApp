// Shared conversational-flow helpers — used by BOTH the inbound bot
// (app/api/whatsapp/webhook/route.ts, user-initiated messages) and the Bridge webhook
// (app/api/bridge/webhook/route.ts, business-initiated) so that a KYC approval landing
// while the 24h message window is still open can reactivate the SAME chat-based
// recipient-collection flow a returning/already-approved user gets, instead of only
// sending a link to /enviar. Extracted from startKycOrCollection's "already approved"
// tail — no behavior change for the inbound bot, just de-duplication.
//
// Session (Redis, 10 min TTL) lives here too since both call sites need to read/write it.

import { getRedis }            from "@/lib/redis";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { hashPhone }           from "@/lib/wa-identity";
import { getCountry }          from "@/constants/countries";
import type { WaLocale }       from "@/lib/wa-i18n";
import type { getWaTranslator } from "@/lib/wa-i18n";
import type { AccountDetails } from "@/lib/wa-validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

const SESSION_TTL = 10 * 60; // seconds

export type WaStep = 1 | 3 | 5 | 6 | 65 | 7;
// 1 = need amount+country · 3 = need email · 5 = need recipient name
// 6 = need account field #1 · 65 = need account field #2 · 7 = awaiting SI/CANCELAR

export interface WaSession {
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

export async function getSession(waId: string): Promise<WaSession | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:session:${hashPhone(waId)}`);
    return raw ? JSON.parse(raw) as WaSession : null;
  } catch { return null; }
}

export async function setSession(waId: string, session: WaSession): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:session:${hashPhone(waId)}`, JSON.stringify(session), { EX: SESSION_TTL });
  } catch { /* non-critical */ }
}

export async function clearSession(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`wa:session:${hashPhone(waId)}`);
  } catch { /* non-critical */ }
}

// Fetches a guaranteed-rate quote — same engine as /api/bridge/fx-quote (lib/bridge-fees.ts).
// Two-pass refine (approx → exact), same pattern as components/currency-calculator.tsx.
export async function fetchQuote(
  currency: string, country: string, amount: number,
): Promise<{ recipientGets: number; recipientCurrency: string; rate: number } | null> {
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
export function buildEnviarLink(params: {
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

// Reanuda el flujo de chat justo donde lo tendría un usuario ya aprobado: cotiza,
// guarda la sesión en el paso 5 (nombre del destinatario) y manda los mensajes de
// precheck + "dame el nombre". Usado por:
//   - app/api/whatsapp/webhook/route.ts (usuario ya aprobado, mismo día)
//   - app/api/bridge/webhook/route.ts (KYC recién aprobado por Bridge, ventana de 24h
//     todavía abierta — "debe ser el flujo igual al de web solo en chat")
export async function beginRecipientCollection(
  waId: string, locale: WaLocale, t: Awaited<ReturnType<typeof getWaTranslator>>,
  amount: number, currency: string, country: string, email: string,
): Promise<void> {
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
