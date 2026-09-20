// Phone ↔ email correlation for the WhatsApp bot — the ONLY piece of state this module
// adds outside Bridge/localStorage/query-params, and only to avoid re-asking a returning
// WhatsApp user for their email on every message.
//
// Bridge remains the sole source of truth for KYC/customer status (see providers/bridge/
// customers.ts — "Bridge is our DB"). Redis here is a short pointer cache, not a database:
//   wa:id2email:{sha256(phone)}  → AES-GCM-encrypted email   (bot looks up by phone)
//   wa:email2wa:{sha256(email)}  → AES-GCM-encrypted phone   (Bridge webhook looks up by email
//                                                              to notify the right WhatsApp user)
// TTL 1 year on both. Same phone-hash algorithm as the original bot (app/api/whatsapp/webhook)
// so lookups agree with the session key it already uses.

import { createHash } from "crypto";
import { getRedis } from "./redis";

const TTL_SECONDS = 365 * 24 * 3600;
const IV_BYTES = 12;

export function hashPhone(waId: string): string {
  return createHash("sha256").update(waId).digest("hex").slice(0, 32);
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

async function importKey(): Promise<CryptoKey> {
  const secret = process.env.LINK_SECRET;
  if (!secret) throw new Error("LINK_SECRET env var is not set");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret + ":wa-identity"));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64url(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}
function fromBase64url(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const packed = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(ciphertext), iv.byteLength);
  return toBase64url(packed);
}

async function decrypt(value: string): Promise<string | null> {
  try {
    const key = await importKey();
    const packed = fromBase64url(value);
    const iv = packed.slice(0, IV_BYTES);
    const ciphertext = packed.slice(IV_BYTES);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

export interface WaIdentity {
  email:  string;
  locale: string; // resolved WaLocale — carried along so the Bridge webhook can reply in the right language
}

export async function getEmailForPhone(waId: string): Promise<WaIdentity | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:id2email:${hashPhone(waId)}`);
    if (!raw) return null;
    const plain = await decrypt(raw);
    return plain ? (JSON.parse(plain) as WaIdentity) : null;
  } catch {
    return null;
  }
}

// Permite al usuario cambiar de correo (ej. probó con uno inventado en sandbox y ahora
// quiere usar el real) — borra solo el puntero teléfono→correo; el siguiente mensaje con
// un correo nuevo (ya sea "cambiar correo" + correo, o "200 USD México nuevo@correo.com"
// directo) lo vuelve a guardar. No borra el puntero inverso correo→teléfono (sirve para
// que Bridge nos encuentre si ese correo viejo ya tenía un envío pendiente en curso).
export async function deleteEmailForPhone(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`wa:id2email:${hashPhone(waId)}`);
  } catch { /* non-critical */ }
}

export async function setEmailForPhone(waId: string, email: string, locale: string): Promise<void> {
  try {
    const redis = await getRedis();
    const payload = JSON.stringify({ email: email.trim().toLowerCase(), locale });
    const [encForward, encPhone] = await Promise.all([encrypt(payload), encrypt(waId)]);
    await Promise.all([
      redis.set(`wa:id2email:${hashPhone(waId)}`, encForward, { EX: TTL_SECONDS }),
      redis.set(`wa:email2wa:${hashEmail(email)}`, encPhone, { EX: TTL_SECONDS }),
    ]);
  } catch { /* non-critical — worst case we ask for the email again next time */ }
}

export async function getPhoneForEmail(email: string): Promise<string | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:email2wa:${hashEmail(email)}`);
    return raw ? await decrypt(raw) : null;
  } catch {
    return null;
  }
}

// Pending transfer context — set right when the bot sends a KYC link (Módulo 2), so that
// when Bridge later fires customer.updated.status_transitioned (status=approved), the
// webhook can message the right WhatsApp number with the SPECIFIC amount/país que estaba
// enviando, en vez de un aviso genérico. Se estira hasta 23:59 — el máximo posible sin
// pasarse de la ventana real de servicio de WhatsApp (24h, ver isWithinMessageWindow) —
// para exprimir al máximo el texto libre gratis: mientras este registro y la ventana de
// 24h sigan vivos al mismo tiempo, el aviso sale como texto libre; la plantilla aprobada
// solo entra si de verdad se cierra la ventana. Antes estaba en 30 min, lo cual cortaba
// a la mitad un KYC real de Persona (ID + selfie), que puede tardar 45-50 min sin ser nada
// raro — el aviso se perdía por completo (ni texto libre ni plantilla).
const PENDING_TTL = 23 * 3600 + 59 * 60; // 23h 59min

export interface PendingTransfer {
  waId:     string;
  locale:   string;
  amount:   number;
  currency: string;
  country:  string;
}

export async function setPendingTransfer(email: string, p: PendingTransfer): Promise<void> {
  try {
    const redis = await getRedis();
    const enc = await encrypt(JSON.stringify(p));
    await redis.set(`wa:pending:${hashEmail(email)}`, enc, { EX: PENDING_TTL });
  } catch { /* non-critical */ }
}

export async function getPendingTransfer(email: string): Promise<PendingTransfer | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:pending:${hashEmail(email)}`);
    if (!raw) return null;
    const plain = await decrypt(raw);
    return plain ? (JSON.parse(plain) as PendingTransfer) : null;
  } catch {
    return null;
  }
}

// GET + DEL por separado (getPendingTransfer + clearPendingTransfer) NO es atómico: Bridge
// dispara customer.updated varias veces EN PARALELO (no una tras otra) durante la misma
// aprobación, cada una en su propia invocación de la función — dos invocaciones pueden leer
// "pending" != null antes de que cualquiera alcance a borrarlo, y las dos mandan el aviso.
// Confirmado en vivo (el mismo mensaje llegó 3 veces seguidas sin que el usuario hiciera
// nada). GETDEL es atómico en Redis (una sola operación, un solo viaje) — solo UNA
// invocación puede "ganar" el valor; las demás ven null y no hacen nada.
export async function takePendingTransfer(email: string): Promise<PendingTransfer | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.getDel(`wa:pending:${hashEmail(email)}`);
    if (!raw) return null;
    const plain = await decrypt(raw);
    return plain ? (JSON.parse(plain) as PendingTransfer) : null;
  } catch {
    return null;
  }
}

// ── Ventana de servicio de WhatsApp (texto libre vs. plantilla) ──────────────────
// Meta: "cuando un usuario te escribe, arranca una ventana de servicio de 24 horas.
// Si te vuelve a escribir antes de que expire, la ventana se reinicia a 24 horas
// completas. Mientras esté abierta, puedes mandar texto libre; una vez cerrada, solo
// plantillas aprobadas." (Meta Business Docs — Conversation windows; confirmado por
// búsqueda, no asumido). Guardamos el timestamp real del último mensaje — no una
// base de datos de usuarios (Supabase/Postgres), sino el mismo tipo de puntero corto
// en Redis que ya usa este archivo para teléfono↔email, con TTL de limpieza de 48h
// (el doble de la ventana, solo para no dejar basura si Redis nunca expira algo).
const MESSAGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const LAST_MESSAGE_TTL_SECONDS = 48 * 3600;

export async function recordLastMessage(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:lastmsg:${hashPhone(waId)}`, String(Date.now()), { EX: LAST_MESSAGE_TTL_SECONDS });
  } catch { /* non-critical — peor caso: usamos plantilla cuando texto libre habría bastado */ }
}

// ── Link de referido — se manda UNA SOLA VEZ por usuario, nunca en cada envío ────
// Puntero corto (no PII, solo un flag), mismo TTL largo que el puntero teléfono↔correo —
// "una vez por usuario" se interpreta como indefinido, no "una vez al día".
const REFERRAL_SHARED_TTL_SECONDS = 365 * 24 * 3600;

export async function hasSharedReferralLink(waId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    return (await redis.get(`wa:referralshared:${hashPhone(waId)}`)) !== null;
  } catch {
    return false; // conservador: peor caso, se lo mandamos una vez de más
  }
}

export async function markReferralLinkShared(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:referralshared:${hashPhone(waId)}`, "1", { EX: REFERRAL_SHARED_TTL_SECONDS });
  } catch { /* non-critical */ }
}

// ── Código de referido capturado del link de WhatsApp ("REF:<waId>" en el texto
// prellenado) — puntero corto hasta que el usuario complete su primer envío, mismo TTL
// de 30 días que usa el lado web (lib/referral.ts) para el equivalente ?ref= en localStorage.
const PENDING_REFERRAL_TTL_SECONDS = 30 * 24 * 3600;

export async function setPendingReferralCode(waId: string, code: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:pendingref:${hashPhone(waId)}`, code, { EX: PENDING_REFERRAL_TTL_SECONDS });
  } catch { /* non-critical — peor caso, no se aplica el descuento de referido */ }
}

export async function getPendingReferralCode(waId: string): Promise<string | null> {
  try {
    const redis = await getRedis();
    return await redis.get(`wa:pendingref:${hashPhone(waId)}`);
  } catch {
    return null;
  }
}

export async function clearPendingReferralCode(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`wa:pendingref:${hashPhone(waId)}`);
  } catch { /* non-critical */ }
}

// ── "Cambiar correo" — bandera propia con TTL largo, NO la sesión de 10 min ──────────
// La sesión general (lib/wa-flow.ts) dura 10 minutos, pensada para un flujo de envío que
// se hace de corrido. "Cambiar correo" es una acción puntual que alguien puede iniciar y
// no terminar de inmediato (ej. se distrae, revisa su correo real primero) — confirmado en
// vivo: pasaron 3+ horas entre pedirlo y escribir el correo nuevo, la sesión ya había
// expirado y el mensaje cayó como si nada. Usamos las mismas 24h que la ventana de servicio
// al cliente de WhatsApp (después de eso Meta ya no deja responder libremente sin plantilla,
// así que no tiene sentido esperar más que eso de todas formas).
const AWAITING_EMAIL_CHANGE_TTL_SECONDS = 24 * 60 * 60;

export async function setAwaitingEmailChange(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:awaitingemail:${hashPhone(waId)}`, "1", { EX: AWAITING_EMAIL_CHANGE_TTL_SECONDS });
  } catch { /* non-critical */ }
}

export async function isAwaitingEmailChange(waId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    return (await redis.get(`wa:awaitingemail:${hashPhone(waId)}`)) !== null;
  } catch {
    return false;
  }
}

export async function clearAwaitingEmailChange(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`wa:awaitingemail:${hashPhone(waId)}`);
  } catch { /* non-critical */ }
}

// ── Verificación de dueño del correo (OTP por email) — anti-suplantación ─────────────
// Bridge identifica clientes por correo, no por teléfono — sin esto, cualquiera que sepa o
// adivine un correo ya aprobado en Bridge (el de otra persona, uno filtrado, uno de pruebas
// viejas) puede escribirle al bot con ese correo y moverse como si fuera esa persona: el bot
// nunca comprobaba que quien escribe es el dueño real del correo. Confirmado en vivo: un
// correo de pruebas de hace un mes, ya aprobado en Bridge, dejó pasar a un número de
// WhatsApp nuevo sin pedir ninguna verificación. Mismo patrón que usa la competencia
// (Félix Pago, Remitly, etc.): la PRIMERA vez que un teléfono presenta un correo, se manda
// un código de 6 dígitos a ese correo y se exige de vuelta en el chat antes de continuar.
// Una vez verificado, el puntero normal (wa:id2email, arriba) recuerda esa relación para
// siempre — no se repite el código en envíos futuros desde el mismo teléfono.
const EMAIL_OTP_TTL_SECONDS = 10 * 60;
const EMAIL_OTP_MAX_ATTEMPTS = 5;

export interface PendingEmailOtp {
  email:    string;
  code:     string;
  // "send": viene de un envío en curso, retoma startKycOrCollection con estos datos tras
  // verificar. "change_email": viene de "cambiar correo", solo actualiza el puntero — no
  // hay envío en curso, así que amount/currency/country quedan vacíos.
  purpose:  "send" | "change_email";
  amount?:   number;
  currency?: string;
  country?:  string;
  locale:   string;
  attempts: number;
}

export async function setPendingEmailOtp(waId: string, p: PendingEmailOtp): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:emailotp:${hashPhone(waId)}`, JSON.stringify(p), { EX: EMAIL_OTP_TTL_SECONDS });
  } catch { /* non-critical */ }
}

export async function getPendingEmailOtp(waId: string): Promise<PendingEmailOtp | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:emailotp:${hashPhone(waId)}`);
    return raw ? (JSON.parse(raw) as PendingEmailOtp) : null;
  } catch {
    return null;
  }
}

// Registra un intento fallido — no consume el código, solo cuenta. El llamador decide
// cuándo tirar todo (EMAIL_OTP_MAX_ATTEMPTS) para forzar pedir un código nuevo en vez de
// dejar intentos ilimitados contra un código de 6 dígitos (1 millón de combinaciones).
export async function incrementEmailOtpAttempts(waId: string, current: PendingEmailOtp): Promise<number> {
  const attempts = current.attempts + 1;
  if (attempts < EMAIL_OTP_MAX_ATTEMPTS) {
    await setPendingEmailOtp(waId, { ...current, attempts });
  } else {
    await clearPendingEmailOtp(waId);
  }
  return attempts;
}

export { EMAIL_OTP_MAX_ATTEMPTS };

export async function clearPendingEmailOtp(waId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`wa:emailotp:${hashPhone(waId)}`);
  } catch { /* non-critical */ }
}

// ── Último order_id del usuario — para el comando "Estado" del bot ───────────
// Puntero corto (no PII: solo el order_id que /api/bridge/send ya generó), mismo TTL
// que lib/order-state.ts (48h) — no tiene caso recordarlo más tiempo que el propio pedido.
const LAST_ORDER_TTL_SECONDS = 48 * 3600;

export async function setLastOrder(waId: string, orderId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`wa:lastorder:${hashPhone(waId)}`, orderId, { EX: LAST_ORDER_TTL_SECONDS });
  } catch { /* non-critical — peor caso: "Estado" sin ID no encuentra nada */ }
}

export async function getLastOrder(waId: string): Promise<string | null> {
  try {
    const redis = await getRedis();
    return await redis.get(`wa:lastorder:${hashPhone(waId)}`);
  } catch {
    return null;
  }
}

export async function isWithinMessageWindow(waId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(`wa:lastmsg:${hashPhone(waId)}`);
    if (!raw) return false;
    const lastMessageAt = Number(raw);
    return Date.now() - lastMessageAt < MESSAGE_WINDOW_MS;
  } catch {
    return false; // conservador: si no podemos confirmarlo, usamos plantilla (nunca falla)
  }
}
