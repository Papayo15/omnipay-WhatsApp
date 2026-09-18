// Meta WhatsApp Cloud API — outbound text messages.
// Shared by app/api/whatsapp/webhook/route.ts (bot replies) and
// app/api/bridge/webhook/route.ts (proactive confirmation after KYC approval).
// No Twilio — plain fetch() to the Graph API, same as the original bot implementation.

const TOKEN_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN_AT = process.env.WHATSAPP_ACCESS_TOKEN;

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!TOKEN_ID || !TOKEN_AT) {
    console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${TOKEN_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_AT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body },
      }),
    });
    // fetch() resolving does NOT mean Meta accepted the message — a 4xx/5xx with an
    // error body still resolves here. Log it, or these fail completely silently.
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[whatsapp] sendWhatsAppMessage failed (${res.status}) to=${to}:`, errText);
    }
  } catch (e) {
    console.error("[whatsapp] sendWhatsAppMessage network error:", (e as Error).message);
  }
}
