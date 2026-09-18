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
// webhook can message the right WhatsApp number with the SPECIFIC amount/country they were
// trying to send, instead of a generic "you're verified" text. Una verificación de Persona
// real (subir ID + selfie) puede tardar 45-50 minutos sin ser nada anormal — un TTL de
// 30 min lo cortaba a medias y el usuario se quedaba sin ningún aviso (ni texto libre ni
// plantilla, porque este registro ya no existía). 3 horas da margen de sobra para
// cualquier KYC lento real, y sigue muy por debajo de la ventana de 24h de WhatsApp, así
// que el aviso casi siempre sale como texto libre, no como plantilla.
const PENDING_TTL = 3 * 60 * 60; // 3 horas

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
