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
import { getOrderAsync, type OrderStatus } from "@/lib/order-state";
import type { WaLocale }       from "@/lib/wa-i18n";
import type { getWaTranslator } from "@/lib/wa-i18n";
import type { AccountDetails } from "@/lib/wa-validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

const SESSION_TTL = 10 * 60; // seconds

export type WaStep = 1 | 2 | 3 | 5 | 6 | 65 | 7 | 8;
// 1 = need amount+country · 2 = post-"comparar", awaiting SI to jump into the send flow
// with the already-parsed amount/currency/country · 3 = need email · 5 = need recipient
// name · 6 = need account field #1 · 65 = need account field #2 · 7 = awaiting SI/CANCELAR
// · 8 = awaiting new email after "cambiar correo"
// (Email-ownership OTP verification is a separate Redis pointer, wa:emailotp:* in
// lib/wa-identity.ts — same pattern as "cambiar correo" above — not a session step, so it
// can be checked independently of whatever step the generic 10-min session is in.)

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
): Promise<{ recipientGets: number; recipientCurrency: string; rate: number; senderDeposits: number } | null> {
  const destCurrency = getCountry(country)?.currency ?? "MXN";
  try {
    const qs1 = new URLSearchParams({ from: currency, to: destCurrency, amount: String(amount), country });
    const r1 = await fetch(`${APP_URL}/api/bridge/fx-quote?${qs1}`);
    if (!r1.ok) return null;
    const q1 = await r1.json() as { fx_rate: number };

    const approxTarget = parseFloat((amount * q1.fx_rate).toFixed(2));
    const qs2 = new URLSearchParams({ from: currency, to: destCurrency, amount: String(approxTarget), country });
    const r2 = await fetch(`${APP_URL}/api/bridge/fx-quote?${qs2}`);
    const q2 = r2.ok
      ? await r2.json() as { fx_rate: number; recipient_gets: number; sender_deposits: number }
      : { fx_rate: q1.fx_rate, recipient_gets: approxTarget, sender_deposits: amount };
    return {
      recipientGets: q2.recipient_gets, recipientCurrency: destCurrency, rate: q2.fx_rate,
      senderDeposits: q2.sender_deposits,
    };
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
    channel: "whatsapp", // Módulo 2 — recupera el costo de sesión de Meta del cliente (lib/bridge-fees.ts)
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

// Fuentes soportadas por /api/bridge/send — mismo set que SendBody["source_currency"] ahí.
const SUPPORTED_SOURCE_CURRENCIES = new Set(["usd", "eur", "gbp", "mxn", "brl"]);

export function isSupportedSourceCurrency(currency: string): boolean {
  return SUPPORTED_SOURCE_CURRENCIES.has(currency.toLowerCase());
}

export interface DepositInstructions {
  orderId: string;
  rail: string; currency: string;
  bank_name?: string | null; beneficiary_name?: string | null;
  routing_number?: string | null; account_number?: string | null;
  iban?: string | null; bic?: string | null; sort_code?: string | null;
  clabe?: string | null; br_code?: string | null;
  amount_to_deposit: string;
}

// Llama a /api/bridge/send (el MISMO endpoint que usa /enviar en la web — nada de lógica
// paralela) para crear la liquidation address + virtual account y devolver la ficha de
// depósito real. Se usa después de la confirmación SI del bot, para dar las instrucciones
// directo en el chat en vez de mandar a un link — "igual al de web solo en chat".
// El sender ya existe en Bridge (se creó/aprobó durante el KYC del bot); usamos un nombre
// de placeholder consistente con el que ya se usa en app/api/whatsapp/kyc-link/route.ts —
// getOrCreateCustomer encuentra al cliente existente por email, así que no se usa para
// renombrar nada.
export async function requestDepositInstructions(params: {
  email: string; sourceCurrency: string; recipientName: string; country: string;
  amountTarget: number; account: AccountDetails; referralCode?: string | null;
}): Promise<DepositInstructions | null> {
  const sc = params.sourceCurrency.toLowerCase();
  if (!SUPPORTED_SOURCE_CURRENCIES.has(sc)) return null;

  try {
    const res = await fetch(`${APP_URL}/api/bridge/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_name: "OmniPay WhatsApp",
        sender_email: params.email,
        source_currency: sc,
        recipient_name: params.recipientName,
        recipient_country: params.country,
        amount_target: params.amountTarget,
        channel: "whatsapp",
        clabe: params.account.clabe,
        iban: params.account.iban,
        bic: params.account.bic,
        pix_key: params.account.pix_key,
        routing_number: params.account.routing_number,
        account_number: params.account.account_number,
        sort_code: params.account.sort_code,
        bank_code: params.account.bank_code,
        ...(params.referralCode ? { referral_code: params.referralCode } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[wa-flow] requestDepositInstructions: /api/bridge/send failed (${res.status}):`, errText);
      return null;
    }
    const data = await res.json() as { needs_kyc?: boolean; needs_tos?: boolean; order_id?: string; deposit_instructions?: Record<string, unknown> };
    if (data.needs_kyc || data.needs_tos || !data.deposit_instructions || !data.order_id) {
      console.error("[wa-flow] requestDepositInstructions: unexpected response shape:", JSON.stringify(data).slice(0, 500));
      return null;
    }
    const di = data.deposit_instructions;
    return {
      orderId: data.order_id,
      rail: String(di.rail ?? ""), currency: String(di.currency ?? sc.toUpperCase()),
      bank_name: (di.bank_name as string) ?? null, beneficiary_name: (di.beneficiary_name as string) ?? null,
      routing_number: (di.routing_number as string) ?? null, account_number: (di.account_number as string) ?? null,
      iban: (di.iban as string) ?? null, bic: (di.bic as string) ?? null, sort_code: (di.sort_code as string) ?? null,
      clabe: (di.clabe as string) ?? null, br_code: (di.br_code as string) ?? null,
      amount_to_deposit: String(di.amount_to_deposit ?? ""),
    };
  } catch (e) {
    console.error("[wa-flow] requestDepositInstructions failed:", (e as Error).message);
    return null;
  }
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

// ── Comando "Estado" — consulta de estado de envío (solo lectura, no crea nada nuevo) ──
// Reusa lib/order-state.ts tal cual (Bridge/Redis siguen siendo la única fuente de
// verdad); solo mapea el estado técnico a algo legible en 3 categorías simples, como
// pidió el usuario: pendiente de depósito, en proceso, completado o fallido.
export function statusLabelKey(status: OrderStatus): string {
  switch (status) {
    case "PENDING_PAYIN":       return "status_label_pending";
    case "PROCESSING_ONCHAIN":
    case "LIQUIDATING_FIAT":    return "status_label_processing";
    case "COMPLETED":           return "status_label_completed";
    case "FAILED":               return "status_label_failed";
  }
}

export { getOrderAsync };
