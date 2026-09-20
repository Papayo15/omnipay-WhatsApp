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
//   3. Bridge (getOrCreateCustomer — misma función que usa la web) — si no tiene KYC
//      aprobado, link a /kyc (Persona, sin reimplementar KYC)
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
import { sendWhatsAppMessage, stripKnownTrunkPrefix } from "@/lib/whatsapp";
import { buildWhatsAppLink }          from "@/lib/messaging";
import { getWaTranslator, localeFromPhone, type WaLocale } from "@/lib/wa-i18n";
import {
  getEmailForPhone, setEmailForPhone, setPendingTransfer, hashPhone, recordLastMessage,
  setAwaitingEmailChange, isAwaitingEmailChange, clearAwaitingEmailChange,
  setLastOrder, getLastOrder, hasSharedReferralLink, markReferralLinkShared,
  setPendingReferralCode, getPendingReferralCode, clearPendingReferralCode,
  setPendingEmailOtp, getPendingEmailOtp, clearPendingEmailOtp, incrementEmailOtpAttempts,
  EMAIL_OTP_MAX_ATTEMPTS,
} from "@/lib/wa-identity";
import { getOrCreateCustomer }       from "@/providers/bridge/customers";
import { sendEmailNotification }     from "@/lib/notify";
import { emailStrings }              from "@/lib/email-i18n";
import {
  validateAccountDetails, parseAccountField, mergeSecondAccountField, secondAccountPromptKey,
  accountPromptKey, fullAccountSummary,
} from "@/lib/wa-validation";
import {
  getSession, setSession, clearSession, beginRecipientCollection, fetchQuote,
  requestDepositInstructions, isSupportedSourceCurrency, getOrderAsync, statusLabelKey,
} from "@/lib/wa-flow";
import { computeCompetitorGets } from "@/lib/competitor-compare";
import { getCountry } from "@/constants/countries";

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

// ── Session TTL: 10 min — hay más pasos ahora (nombre + cuenta + confirmación) ───
// (ver lib/wa-flow.ts — la sesión ahora vive ahí para compartirse con el webhook de Bridge)
// 1 = need amount+country · 3 = need email · 5 = need recipient name
// 6 = need account field #1 (routing/sort code/CLABE/IBAN/PIX/account — depends on país)
// 65 = need account field #2 (only US routing→account, GB sort code→account — two-field countries)
// 7 = awaiting SI/CANCELAR confirmation

// Países de UN solo dato de cuenta (MX: CLABE · CO: cuenta · BR: PIX).
// Todo lo demás — US (routing→cuenta), GB (sort code→cuenta), zona SEPA (IBAN→BIC,
// Bridge lo exige), y el catch-all genérico SWIFT+cuenta para el resto del mundo vía
// Conduit — pide DOS datos, uno a la vez en dos mensajes (nunca "los dos separados por
// un espacio").
const SINGLE_FIELD_COUNTRIES = new Set(["MX", "CO", "BR"]);
function isTwoFieldCountry(country: string): boolean {
  return !SINGLE_FIELD_COUNTRIES.has(country.toUpperCase());
}

// Países que Bridge ya soporta de forma nativa hoy (ver providers/bridge/liquidation.ts
// → NATIVE_RAILS) — el resto del mundo depende del riel "swift" de Conduit, que solo se
// activa cuando CONDUIT_MODULE_ENABLED="true" (mismo patrón que SERVICES_MODULE_ENABLED
// del Módulo 4) — es decir, hasta que Conduit nos autorice, no antes.
const BRIDGE_NATIVE_COUNTRIES = new Set([
  "US", "MX", "BR", "CO", "GB",
  "DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR",
  "SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI",
  "AD","MC","SM","XK","VA",
]);
function isConduitOnlyCountry(country: string): boolean {
  return !BRIDGE_NATIVE_COUNTRIES.has(country.toUpperCase());
}
const CONDUIT_MODULE_ENABLED = process.env.CONDUIT_MODULE_ENABLED === "true";

// ── Parse incoming message text ───────────────────────────────────────────────

// Supported country aliases → ISO code
// Cubre bastante más que los países que de verdad soportamos (BRIDGE_NATIVE_COUNTRIES,
// arriba) — a propósito: un país RECONOCIDO pero no soportado cae en isConduitOnlyCountry()
// y responde "todavía no lo cubrimos" (country_not_available_yet). Un país NO reconocido en
// absoluto (ej. nadie agregó "China") antes caía en el default "MX" en silencio — "500 yenes
// China" se cotizaba como si fuera México. Mientras más países estén aquí, menos casos caen
// en ese default equivocado.
const COUNTRY_ALIASES: Record<string, string> = {
  mexico: "MX", méxico: "MX", mx: "MX",
  usa: "US", "estados unidos": "US", "united states": "US", us: "US", eeuu: "US",
  brasil: "BR", brazil: "BR", br: "BR",
  colombia: "CO", co: "CO",
  uk: "GB", "reino unido": "GB", "united kingdom": "GB", gb: "GB", england: "GB", inglaterra: "GB",
  alemania: "DE", germany: "DE", de: "DE",
  españa: "ES", espana: "ES", spain: "ES", es: "ES",
  francia: "FR", france: "FR", fr: "FR",
  italia: "IT", italy: "IT", it: "IT",
  portugal: "PT", pt: "PT",
  canada: "CA", canadá: "CA", ca: "CA",
  paises_bajos: "NL", holanda: "NL", netherlands: "NL", nl: "NL",
  belgica: "BE", bélgica: "BE", belgium: "BE",
  austria: "AT", irlanda: "IE", ireland: "IE", finlandia: "FI", finland: "FI",
  grecia: "GR", greece: "GR", suecia: "SE", sweden: "SE",
  dinamarca: "DK", denmark: "DK", noruega: "NO", norway: "NO",
  polonia: "PL", poland: "PL", suiza: "CH", switzerland: "CH",
  // Reconocidos pero NO soportados hoy (LatAm más allá de MX/BR/CO, y el resto del mundo) —
  // caen correctamente en "todavía no lo cubrimos" en vez de en el default de México.
  china: "CN", japon: "JP", japón: "JP", japan: "JP",
  argentina: "AR", chile: "CL", peru: "PE", perú: "PE",
  venezuela: "VE", ecuador: "EC", bolivia: "BO", paraguay: "PY", uruguay: "UY",
  "republica dominicana": "DO", "república dominicana": "DO",
  guatemala: "GT", honduras: "HN", "el salvador": "SV", nicaragua: "NI",
  "costa rica": "CR", panama: "PA", panamá: "PA", cuba: "CU",
  india: "IN", australia: "AU", rusia: "RU", russia: "RU",
  corea: "KR", korea: "KR", "corea del sur": "KR",
  sudafrica: "ZA", "south africa": "ZA", nigeria: "NG", egipto: "EG", egypt: "EG",
  israel: "IL", "emiratos arabes unidos": "AE", "united arab emirates": "AE", uae: "AE",
};

// Supported currencies
const CURRENCY_ALIASES: Record<string, string> = {
  usd: "USD", dólares: "USD", dollars: "USD", dollar: "USD", dolar: "USD",
  cad: "CAD", "dólares canadienses": "CAD",
  eur: "EUR", euros: "EUR", euro: "EUR",
  gbp: "GBP", pounds: "GBP", libras: "GBP",
  mxn: "MXN", pesos: "MXN", peso: "MXN",
};

// Alias corto (ej. "co" para Colombia, "it" para Italia) + texto.includes() era una
// bomba de tiempo: casi cualquier correo hace match por accidente ("co" aparece dentro de
// "hotmail.COm", "gmail.COm", cualquier ".com"/".co") — confirmado en vivo: "50 pesos
// mexicanos Canadá paucm@hotmail.com" se leía como Colombia, no Canadá, porque "co" ya
// había hecho match dentro de ".com" antes de llegar a "canadá" en la lista. Dos capas de
// arreglo: (1) quitamos el correo del texto antes de buscar alias — nunca debería buscarse
// ahí un país/moneda — y (2) exigimos límites de palabra reales (no unicode-aware nativo en
// JS \b, así que se arma a mano) para que "co" no matchee dentro de otra palabra tampoco.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function includesWord(text: string, alias: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(alias)}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

function parseAmount(text: string): { amount: number; currency: string; country: string } | null {
  const withoutEmail = text.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, " ");
  const t = withoutEmail.toLowerCase().trim();

  const numMatch = t.match(/\b(\d{1,6}(?:[.,]\d{1,2})?)\b/);
  if (!numMatch) return null;
  const amount = parseFloat(numMatch[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  let currency = "USD";
  for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
    if (includesWord(t, alias)) { currency = code; break; }
  }

  let country = "MX"; // default
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    if (includesWord(t, alias)) { country = code; break; }
  }

  return { amount, currency, country };
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// Módulo 2 — permite mandar el email en el MISMO primer mensaje ("200 USD México
// juan@correo.com") para ahorrar una vuelta completa de ida y vuelta. Sigue funcionando
// si el usuario lo manda aparte (fallback al step 3 de siempre).
function extractEmail(text: string): string | null {
  const m = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  return m ? m[0] : null;
}

// "correo@ejemplo.com" → "co***o@ejemplo.com" — para mostrar el correo al que mandamos el
// código sin repetirlo completo en el chat (por si alguien más ve la pantalla).
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 3) return `${local[0] ?? ""}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

// ── Verificación de dueño del correo (anti-suplantación) ──────────────────────────
// Se llama SOLO la primera vez que un teléfono presenta un correo (ver los dos call sites
// más abajo) — un teléfono que ya tiene este mismo correo vinculado (getEmailForPhone) nunca
// pasa por aquí de nuevo. Genera un código de 6 dígitos, lo manda por correo (Resend, mismo
// canal que ya usamos para recibos), y deja al usuario en espera de que lo escriba de vuelta
// — ver el gate correspondiente en el handler principal más abajo.
async function requestEmailOtp(
  waId: string, locale: WaLocale, t: Awaited<ReturnType<typeof getWaTranslator>>,
  email: string, purpose: "send" | "change_email",
  amount?: number, currency?: string, country?: string,
): Promise<void> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await setPendingEmailOtp(waId, { email, code, purpose, amount, currency, country, locale, attempts: 0 });
  const eT = emailStrings(locale);
  await sendEmailNotification(email, eT.otp_subject, `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#16a34a;margin:0 0 16px">${eT.otp_h2}</h2>
      <p>${eT.otp_body(code)}</p>
    </div>`);
  await sendWhatsAppMessage(waId, t("otp_sent", { masked_email: maskEmail(email) }));
}

// ── KYC gate — pide email/verifica Bridge, arranca la recolección de destinatario ──
async function startKycOrCollection(
  waId: string, locale: WaLocale, t: Awaited<ReturnType<typeof getWaTranslator>>,
  amount: number, currency: string, country: string, email: string,
): Promise<void> {
  // País fuera de los rieles nativos de Bridge → depende de Conduit (riel "swift"),
  // apagado hasta que nos autoricen. No arrancamos KYC ni pedimos nada para nada.
  if (isConduitOnlyCountry(country) && !CONDUIT_MODULE_ENABLED) {
    await sendWhatsAppMessage(waId, t("country_not_available_yet", { country }));
    await clearSession(waId);
    return;
  }

  // Misma función que ya usa la web (app/api/bridge/send/route.ts,
  // app/api/whatsapp/kyc-link/route.ts) — antes esto tenía su propia revisión simplificada
  // (solo status/kyc_status en "active"/"approved"/"granted") que no contemplaba
  // deposits_restricted (puede seguir enviando, Bridge solo bloquea depósitos entrantes) ni
  // paused/offboarded (bloqueado de verdad) — reenviaba a un cliente restringido a hacer
  // KYC de nuevo en vez de dejarlo pasar, y a uno bloqueado igual, en vez de avisarle.
  const { customer, needsKyc, accountBlocked } = await getOrCreateCustomer({
    type: "individual", email,
    first_name: "OmniPay", last_name: "WhatsApp", country: "USA",
    endorsements: ["base", "sepa", "spei", "pix", "faster_payments", "cop"],
  }).catch(() => ({ customer: null, needsKyc: true, accountBlocked: false }));

  if (accountBlocked) {
    await sendWhatsAppMessage(waId, t("deposit_error"));
    await clearSession(waId);
    return;
  }

  if (needsKyc) {
    // Pasamos el customer_id ya resuelto — evita que /kyc tenga que volver a buscarlo por
    // correo (app/api/whatsapp/kyc-link/route.ts), que para un cliente recién creado aquí
    // mismo puede chocar con el retraso de indexado de Bridge (su búsqueda es eventualmente
    // consistente) y quedarse "Cargando verificación…" varios segundos o de más.
    const customerIdParam = customer?.id ? `&customer_id=${encodeURIComponent(customer.id)}` : "";
    const kycLink = `${APP_URL}/kyc?email=${encodeURIComponent(email)}&wa=${hashPhone(waId)}&locale=${locale}${customerIdParam}`;
    await setPendingTransfer(email, { waId, locale, amount, currency, country });
    await sendWhatsAppMessage(waId, `${t("kyc_needed", { link: kycLink })}\n\n${t("kyc_needed_tip")}`);
    await clearSession(waId);
    return;
  }

  await beginRecipientCollection(waId, locale, t, amount, currency, country, email);
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

  const rawText = String(((msg.text as Record<string,string>)?.body ?? "")).trim();
  if (!rawText || !waId) return NextResponse.json({ ok: true });

  // Cada mensaje real del usuario reinicia la ventana de servicio de 24h (lib/wa-identity.ts)
  // — así los avisos proactivos (KYC aprobado, recompensa de referido) saben si pueden
  // mandar texto libre o si ya toca usar la plantilla aprobada de Meta.
  await recordLastMessage(waId);

  // Módulo 3 — captura "REF:<waId>" del mensaje prellenado del link de invitación de
  // WhatsApp (ver referral_share_prompt más abajo) — mismo rol que ?ref= en localStorage
  // del lado web (lib/referral.ts), pero vía Redis porque el chat no tiene localStorage.
  // Se quita del texto antes de seguir, para que no interfiera con el parseo normal de
  // monto/país/correo.
  const refMatch = rawText.match(/REF:(\d{8,15})/i);
  if (refMatch) await setPendingReferralCode(waId, refMatch[1]);
  // Si el mensaje era SOLO el marcador (p.ej. tocaron el link de invitación sin editar el
  // texto prellenado), queda vacío — cae de forma natural en el saludo normal más abajo,
  // ya con el código de referido guardado.
  const text = rawText.replace(/REF:\d{8,15}/i, "").trim();

  const session = await getSession(waId);
  const locale = session?.locale ?? localeFromPhone(waId);
  const t = await getWaTranslator(locale);

  const trimmed = text.trim();

  // ── Atajos del menú de bienvenida ("1️⃣ Enviar dinero" / "2️⃣ Comparar tarifas") ──
  // Puramente aditivo: escribir el monto/país/correo directo (sin pasar por el menú)
  // sigue funcionando exactamente igual que antes — esto solo le da un segundo camino
  // de entrada a alguien que llega "a mirar" en vez de a enviar ya.
  if (trimmed === "1") {
    await sendWhatsAppMessage(waId, t("menu_option_send_prompt"));
    return NextResponse.json({ ok: true });
  }
  if (trimmed === "2") {
    await sendWhatsAppMessage(waId, t("compare_usage"));
    return NextResponse.json({ ok: true });
  }

  // ── Comando "Cambiar correo" — pide explícitamente el correo nuevo (mejor que borrar y
  // esperar a que lo escriban solos en su próximo mensaje) y lo confirma antes de guardarlo.
  // Usa su propio puntero en Redis (24h, ventana de servicio de WhatsApp) en vez del step de
  // la sesión general (10 min) — confirmado en vivo que alguien puede tardar horas en
  // responder con el correo nuevo, y la sesión de 10 min ya había expirado para entonces.
  const CHANGE_EMAIL_KEYWORDS = new Set(["cambiar correo", "cambiar email", "change email", "cambiar mail"]);
  if (CHANGE_EMAIL_KEYWORDS.has(trimmed.toLowerCase())) {
    const identity = await getEmailForPhone(waId);
    await setAwaitingEmailChange(waId);
    await sendWhatsAppMessage(waId, t("change_email_prompt", { old_email: identity?.email ?? t("change_email_none") }));
    return NextResponse.json({ ok: true });
  }

  // ── Esperando el correo nuevo tras "cambiar correo" ────────────────────────────
  // También pasa por el código de 6 dígitos — sin esto, "cambiar correo" sería un atajo
  // para saltarse la verificación de dueño del correo por completo.
  if (await isAwaitingEmailChange(waId)) {
    if (!isValidEmail(text)) {
      await sendWhatsAppMessage(waId, t("invalid_email"));
      return NextResponse.json({ ok: true });
    }
    const newEmail = text.trim().toLowerCase();
    await clearAwaitingEmailChange(waId);
    await requestEmailOtp(waId, locale, t, newEmail, "change_email");
    return NextResponse.json({ ok: true });
  }

  // ── Esperando el código de 6 dígitos (verificación de dueño del correo) ────────
  if (/^\d{6}$/.test(trimmed)) {
    const pending = await getPendingEmailOtp(waId);
    if (pending) {
      if (trimmed === pending.code) {
        await clearPendingEmailOtp(waId);
        await setEmailForPhone(waId, pending.email, pending.locale);
        const pendingLocale = (pending.locale as WaLocale) ?? locale;
        const pendingT = await getWaTranslator(pendingLocale);
        if (pending.purpose === "change_email") {
          await sendWhatsAppMessage(waId, pendingT("change_email_confirmed", { email: pending.email }));
        } else if (pending.amount && pending.currency && pending.country) {
          await startKycOrCollection(waId, pendingLocale, pendingT, pending.amount, pending.currency, pending.country, pending.email);
        }
        return NextResponse.json({ ok: true });
      }
      const attempts = await incrementEmailOtpAttempts(waId, pending);
      await sendWhatsAppMessage(waId, attempts >= EMAIL_OTP_MAX_ATTEMPTS ? t("otp_too_many_attempts") : t("otp_invalid"));
      return NextResponse.json({ ok: true });
    }
    // Parece un código (6 dígitos) pero ya no hay ninguno pendiente — venció o nunca hubo.
    await sendWhatsAppMessage(waId, t("otp_expired"));
    return NextResponse.json({ ok: true });
  }

  // ── Comando "Estado" — consulta de estado, disponible en cualquier momento (no
  // depende del step de la sesión, y no la toca — si el usuario estaba a mitad de otro
  // flujo puede seguir después). "Estado"/"Status" sin más usa el último order_id que le
  // dimos (puntero corto en Redis, lib/wa-identity.ts); un número de orden explícito
  // (OP-...) siempre tiene prioridad.
  const STATUS_KEYWORDS = new Set(["estado", "status", "seguimiento", "track"]);
  // Insensible a mayúsculas (flag "i") y no atado al formato exacto que generamos hoy
  // (OP-{timestamp}-{random}) — con que empiece con "op-" basta, por si ese formato cambia.
  const ORDER_ID_REGEX = /^op-[\w-]+$/i;
  if (STATUS_KEYWORDS.has(trimmed.toLowerCase()) || ORDER_ID_REGEX.test(trimmed)) {
    try {
      const orderId = ORDER_ID_REGEX.test(trimmed) ? trimmed : await getLastOrder(waId);
      if (!orderId) {
        await sendWhatsAppMessage(waId, t("status_no_order"));
        return NextResponse.json({ ok: true });
      }
      const order = await getOrderAsync(orderId);
      if (!order) {
        await sendWhatsAppMessage(waId, t("status_not_found"));
        return NextResponse.json({ ok: true });
      }
      await sendWhatsAppMessage(waId, t("status_reply", {
        order_id: order.orderId,
        status:   t(statusLabelKey(order.status)),
        recipient: order.recipientName,
        country:   order.destinationCountry,
      }));
    } catch (e) {
      // getLastOrder/getOrderAsync ya atrapan sus propios errores de Redis y devuelven
      // null (eso cae en status_no_order/status_not_found arriba) — este catch es la red
      // de seguridad final para cualquier falla inesperada (ej. sendWhatsAppMessage), para
      // que el chat nunca se quede sin respuesta.
      console.error("[whatsapp/webhook] status command failed:", (e as Error).message);
      await sendWhatsAppMessage(waId, t("status_error")).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  // ── Comando "Comparar" — gancho de conversión, disponible en cualquier momento y
  // SIN requerir email/KYC (a propósito: es para que alguien que ni siquiera es cliente
  // todavía vea el ahorro antes de comprometerse a nada). Misma fórmula que la calculadora
  // web (lib/competitor-compare.ts) — un solo cálculo, no dos que puedan desalinearse.
  const COMPARE_REGEX = /^(comparar|compare|compara|comparación|comparacion)\b\s*(.*)$/i;
  const compareMatch = trimmed.match(COMPARE_REGEX);
  if (compareMatch) {
    const rest = compareMatch[2]?.trim() ?? "";
    const parsedCompare = rest ? parseAmount(rest) : null;
    if (!parsedCompare) {
      await sendWhatsAppMessage(waId, t("compare_usage"));
      return NextResponse.json({ ok: true });
    }
    const { amount, currency, country } = parsedCompare;
    const cq = await fetchQuote(currency, country, amount);
    if (!cq) {
      await sendWhatsAppMessage(waId, t("compare_error"));
      return NextResponse.json({ ok: true });
    }
    const competitorGets = computeCompetitorGets(cq.senderDeposits, cq.rate, currency.toUpperCase());
    const savings = parseFloat((cq.recipientGets - competitorGets).toFixed(2));
    const countryCc = country.toUpperCase();
    // Un solo mensaje fluido (antes salían dos seguidos y se sentía cortado): cifras +
    // los dos caminos claros (SI para enviar esto mismo, u otra cotización / "1" al menú).
    await sendWhatsAppMessage(waId, t("compare_reply", {
      amount: String(amount), currency: currency.toUpperCase(),
      country_name: getCountry(countryCc)?.name ?? countryCc, country_code: countryCc,
      // .toFixed(2), no toLocaleString — la coma de miles corta a la mitad el resaltado
      // automático de números de WhatsApp/Android para montos ≥ 1000.
      omnipay_amount:    cq.recipientGets.toFixed(2),
      competitor_amount: competitorGets.toFixed(2),
      savings:           savings.toFixed(2),
      recipient_currency: cq.recipientCurrency,
    }));
    // Puente directo al envío: guardamos el monto/moneda/país ya parseados (step 2) para
    // que un simple "SI" retome exactamente donde íbamos, sin que el usuario tenga que
    // volver a escribirlo — la sesión en Redis no se pierde entre la comparación y el envío.
    await setSession(waId, { step: 2, amount, currency, country, locale });
    return NextResponse.json({ ok: true });
  }

  // ── Step 2: post-"comparar", esperando SI para saltar directo al envío con el
  // monto/moneda/país que ya se cotizaron — evita que el usuario tenga que volver a
  // teclearlos. Si no contesta "SI" simplemente no entra aquí y cae al parseo normal
  // de abajo (Step 1), tratando el mensaje como una consulta nueva.
  if (session?.step === 2 && session.amount && session.currency && session.country
      && (trimmed.toLowerCase() === "si" || trimmed.toLowerCase() === "sí")) {
    const identity = await getEmailForPhone(waId);
    if (identity) {
      const identityLocale = (identity.locale as WaLocale) ?? session.locale ?? locale;
      await startKycOrCollection(
        waId, identityLocale, await getWaTranslator(identityLocale),
        session.amount, session.currency, session.country, identity.email,
      );
    } else {
      await setSession(waId, { step: 3, amount: session.amount, currency: session.currency, country: session.country, locale });
      await sendWhatsAppMessage(waId, t("ask_email"));
    }
    return NextResponse.json({ ok: true });
  }

  // ── Step 7: esperando SI / CANCELAR ───────────────────────────────────────
  if (session?.step === 7 && session.account && session.recipientName && session.email
      && session.amount && session.currency && session.country) {
    const answer = text.trim().toLowerCase();
    if (answer === "si" || answer === "sí") {
      if (!isSupportedSourceCurrency(session.currency)) {
        await sendWhatsAppMessage(waId, t("currency_not_supported_source", { currency: session.currency }));
        await clearSession(waId);
        return NextResponse.json({ ok: true });
      }
      const pendingReferralCode = await getPendingReferralCode(waId);
      const di = await requestDepositInstructions({
        email: session.email, sourceCurrency: session.currency, recipientName: session.recipientName,
        country: session.country, amountTarget: session.recipientGets ?? session.amount,
        account: session.account, referralCode: pendingReferralCode,
      });
      if (di) {
        await setLastOrder(waId, di.orderId);
        if (pendingReferralCode) await clearPendingReferralCode(waId);
        const lines = [
          // Lo más importante primero, en negritas: esta cuenta es del destinatario y sirve
          // para siempre, no solo para este envío — feedback en vivo: antes esto quedaba
          // hasta el final de un mensaje largo y se perdía.
          t("confirmed_deposit_lead", {
            recipient_name: session.recipientName,
            country_name: getCountry(session.country)?.name ?? session.country,
          }),
          "",
          t("confirmed_deposit_intro", { amount: di.amount_to_deposit, currency: di.currency, rail: di.rail }),
          "",
          ...(di.bank_name        ? [`${t("label_bank")}: ${di.bank_name}`] : []),
          ...(di.beneficiary_name ? [`${t("label_beneficiary")}: ${di.beneficiary_name}`] : []),
          ...(di.routing_number   ? [`${t("label_routing")}: ${di.routing_number}`] : []),
          ...(di.clabe            ? [`${t("label_clabe")}: ${di.clabe}`] : []),
          ...(di.iban             ? [`${t("label_iban")}: ${di.iban}`] : []),
          ...(di.bic              ? [`${t("label_bic")}: ${di.bic}`] : []),
          ...(di.sort_code        ? [`${t("label_sort_code")}: ${di.sort_code}`] : []),
          ...(di.account_number   ? [`${t("label_account")}: ${di.account_number}`] : []),
          ...(di.br_code          ? [`${t("label_pix")}: ${di.br_code}`] : []),
          "",
          t("confirmed_deposit_footer", {
            recipient_name: session.recipientName,
            // .toFixed(2), NUNCA toLocaleString — la coma de "9,842.75" corta el
            // reconocimiento automático de números de WhatsApp/Android a la mitad
            // (confirmado en vivo: solo "842.75" quedaba resaltado, el "9," se veía
            // suelto). amount_to_deposit (arriba) ya usaba .toFixed(2) y por eso ese sí
            // se resaltaba completo — misma cantidad, dos formatos distintos era el bug.
            recipient_amount: (session.recipientGets ?? session.amount).toFixed(2),
            recipient_currency: session.recipientCurrency ?? session.currency,
          }),
        ];
        await sendWhatsAppMessage(waId, lines.join("\n"));
        // Módulo 3 — le damos a Juan su propio link para invitar amigos, pero UNA SOLA VEZ
        // por usuario (no en cada envío que haga) — puntero corto en Redis, no una tabla de
        // usuarios. Siempre texto libre cuando se manda: como acaba de escribirnos "SI" hace
        // segundos, está garantizado que sigue dentro de su ventana de 24h.
        if (!(await hasSharedReferralLink(waId))) {
          // El link abre WhatsApp del amigo directo con un mensaje prellenado AL NÚMERO
          // DEL BOT (no a la web) — el amigo solo le da "enviar" y ya arrancó la
          // conversación. El "REF:<waId>" viaja en el texto y el propio bot lo detecta y
          // lo guarda (arriba, al recibir el mensaje) sin que el amigo tenga que hacer nada.
          const botRaw    = process.env.WHATSAPP_BOT_NUMBER ?? "";
          const botNumber = stripKnownTrunkPrefix(botRaw) ?? botRaw;
          const inviteLink = buildWhatsAppLink(t("referral_invite_message", { ref: waId }), botNumber);
          await sendWhatsAppMessage(waId, t("referral_share_prompt", { link: inviteLink }));
          await markReferralLinkShared(waId);
        }
      } else {
        // /api/bridge/send falló (Bridge caído, needs_kyc/needs_tos inesperado, etc.) —
        // sin link de respaldo: se le pide reintentar el SI en vez de mandarlo a la web.
        await sendWhatsAppMessage(waId, t("deposit_error"));
      }
      await clearSession(waId);
    } else if (answer === "cancelar" || answer === "cancel") {
      await sendWhatsAppMessage(waId, t("cancelled"));
      await clearSession(waId);
    } else {
      await sendWhatsAppMessage(waId, t("confirm_retry"));
    }
    return NextResponse.json({ ok: true });
  }

  // ── Step 6.5: esperando el SEGUNDO dato de cuenta (US/GB/SEPA/genérico) ───
  if (session?.step === 65 && session.recipientName && session.country && session.account
      && session.amount && session.currency && session.email) {
    const merged = mergeSecondAccountField(session.country, session.account, text);
    const result = validateAccountDetails(session.country, merged);
    if (!result.isValid) {
      await sendWhatsAppMessage(waId, t(`validation_${result.errorKey ?? "generic"}`));
      return NextResponse.json({ ok: true });
    }
    const summary = fullAccountSummary(session.country, merged);
    await setSession(waId, { ...session, step: 7, account: merged });
    await sendWhatsAppMessage(waId, t("confirm_summary", {
      name:     session.recipientName,
      account:  summary,
      amount:   (session.recipientGets ?? session.amount).toFixed(2),
      currency: session.recipientCurrency ?? session.currency,
    }));
    return NextResponse.json({ ok: true });
  }

  // ── Step 6: esperando el primer (o único) dato de cuenta del destinatario ──
  if (session?.step === 6 && session.recipientName && session.country
      && session.amount && session.currency && session.email) {
    const parsed = parseAccountField(session.country, text);

    // Países de dos datos (US/GB, y el resto del mundo vía Conduit): pedimos el
    // segundo dato por separado — nunca juntos en un mensaje.
    if (isTwoFieldCountry(session.country)) {
      await setSession(waId, { ...session, step: 65, account: parsed });
      await sendWhatsAppMessage(waId, t(secondAccountPromptKey(session.country)));
      return NextResponse.json({ ok: true });
    }

    // Países de un solo dato: se valida completo de una vez.
    const result = validateAccountDetails(session.country, parsed);
    if (!result.isValid) {
      await sendWhatsAppMessage(waId, t(`validation_${result.errorKey ?? "generic"}`));
      return NextResponse.json({ ok: true });
    }
    const summary = fullAccountSummary(session.country, parsed);
    await setSession(waId, { ...session, step: 7, account: parsed });
    await sendWhatsAppMessage(waId, t("confirm_summary", {
      name:     session.recipientName,
      account:  summary,
      amount:   (session.recipientGets ?? session.amount).toFixed(2),
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
    await requestEmailOtp(waId, locale, t, email, "send", session.amount, session.currency, session.country);
    return NextResponse.json({ ok: true });
  }

  // ── Step 1 (default): cualquier mensaje → intentar parsear "monto + país" ─
  const parsed = parseAmount(text);

  if (!parsed) {
    // Primer contacto → saludo completo con ejemplos. Ya saludado y sigue sin
    // parsear → mensaje corto de "no entendí" en vez de repetir todo.
    await setSession(waId, { step: 1, locale });
    if (session) {
      await sendWhatsAppMessage(waId, t("parse_error"));
    } else {
      // Solo a usuarios recurrentes (ya tienen KYC hecho alguna vez) les recordamos que
      // no hace falta volver aquí para reenviar al mismo destinatario — un usuario
      // totalmente nuevo todavía no tiene ningún destinatario que reutilizar.
      const knownIdentity = await getEmailForPhone(waId);
      const greetingText = knownIdentity ? `${t("greeting")}\n\n${t("greeting_reuse_hint")}` : t("greeting");
      await sendWhatsAppMessage(waId, greetingText);
    }
    return NextResponse.json({ ok: true });
  }

  const { amount, currency, country } = parsed;
  const identity = await getEmailForPhone(waId);

  if (identity) {
    // Usuario recurrente — nos saltamos pedir el email de nuevo (ya está verificado en
    // Bridge desde su primer envío; si mandó un email distinto en este mensaje lo
    // ignoramos, la cuenta ya asociada a este teléfono manda).
    const identityLocale = (identity.locale as WaLocale) ?? locale;
    await startKycOrCollection(waId, identityLocale, await getWaTranslator(identityLocale), amount, currency, country, identity.email);
    return NextResponse.json({ ok: true });
  }

  // Primera vez que vemos este número. Si el email ya vino en el mismo mensaje
  // ("200 USD México juan@correo.com") nos ahorramos la vuelta de pedirlo aparte.
  const email = extractEmail(text);
  if (email && isValidEmail(email)) {
    const cleanEmail = email.trim().toLowerCase();
    await requestEmailOtp(waId, locale, t, cleanEmail, "send", amount, currency, country);
    return NextResponse.json({ ok: true });
  }

  await setSession(waId, { step: 3, amount, currency, country, locale });
  await sendWhatsAppMessage(waId, t("ask_email"));
  return NextResponse.json({ ok: true });
}
