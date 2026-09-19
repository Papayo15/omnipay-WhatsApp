// Bridge.xyz Webhook Signature Verification
// Bridge signs webhook payloads with RSA-SHA256 using a per-endpoint private key.
// The matching public key is returned once when the webhook subscription is created
// (POST /v0/webhooks) — store it in BRIDGE_WEBHOOK_PUBLIC_KEY env var (full PEM string).
// Confirmed against real Bridge sandbox deliveries (2026-09-19, 9 retries logged before
// this fix): header is "X-Webhook-Signature", format "t=<unix ms>,v0=<base64 RSA sig>" —
// the signed message is "{t}.{raw body}", not the raw body alone (timestamped signing,
// same idea as Stripe/Svix-style — protects against replay). The previous implementation
// assumed a plain "X-Bridge-Signature: <sig>" header signing the raw body directly, which
// never matched any real delivery (this webhook had never actually fired successfully
// before last night, so the mismatch went unnoticed).

export interface BridgeWebhookEvent {
  id:         string;
  type:       string;
  data:       Record<string, unknown>;
  created_at: string;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

export async function verifyBridgeWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const publicKeyPem = process.env.BRIDGE_WEBHOOK_PUBLIC_KEY;
  const hmacSecret   = process.env.BRIDGE_WEBHOOK_SECRET;

  // No credentials configured → block in production, warn in dev
  if (!publicKeyPem && !hmacSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BRIDGE_WEBHOOK_PUBLIC_KEY or BRIDGE_WEBHOOK_SECRET must be configured in production");
    }
    console.warn("[bridge/webhook] No verification credentials set — skipping (dev only)");
    return true;
  }
  if (!signatureHeader) return false;

  // RSA-SHA256 (Bridge default — public key from webhook creation response)
  if (publicKeyPem) {
    try {
      // Formato real: "t=<unix ms>,v0=<base64 RSA sig>" — se firma "{t}.{rawBody}", no
      // el body solo (confirmado contra entregas reales, ver comentario arriba del archivo).
      const parts = Object.fromEntries(
        signatureHeader.split(",").map((p) => p.trim().split("=") as [string, string]),
      );
      const timestamp = parts.t;
      const sigB64     = parts.v0;
      if (!timestamp || !sigB64) return false;

      const keyBuf = pemToArrayBuffer(publicKeyPem);
      const cryptoKey = await crypto.subtle.importKey(
        "spki",
        keyBuf,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const sigBinary = atob(sigB64.replace(/\s+/g, ""));
      const sigBuf    = new Uint8Array(sigBinary.length);
      for (let i = 0; i < sigBinary.length; i++) sigBuf[i] = sigBinary.charCodeAt(i);

      return await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        sigBuf,
        new TextEncoder().encode(`${timestamp}.${rawBody}`),
      );
    } catch (e) {
      console.error("[bridge/webhook] RSA verification error:", e);
      return false;
    }
  }

  // HMAC-SHA256 fallback (format: "sha256=<hex>")
  if (hmacSecret) {
    const [algo, hex] = signatureHeader.split("=");
    if (algo !== "sha256" || !hex) return false;

    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(hmacSecret),
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"],
    );
    const sig     = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    if (computed.length !== hex.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hex.charCodeAt(i);
    return diff === 0;
  }

  return false;
}

export function parseWebhookEvent(rawBody: string): BridgeWebhookEvent {
  const raw = JSON.parse(rawBody) as Record<string, unknown>;
  // Normalize both Bridge webhook formats into a single shape:
  //   Old: { id, type, data, created_at }
  //   New: { event_id, event_type, event_object, event_object_status, event_created_at }
  const isNewFormat = typeof raw.event_type === "string";
  if (isNewFormat) {
    return {
      id:         String(raw.event_id ?? ""),
      type:       String(raw.event_type ?? ""),
      data:       (raw.event_object as Record<string, unknown>) ?? {},
      created_at: String(raw.event_created_at ?? ""),
    };
  }
  return raw as unknown as BridgeWebhookEvent;
}
