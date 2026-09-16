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
  await fetch(`https://graph.facebook.com/v20.0/${TOKEN_ID}/messages`, {
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
  }).catch(e => console.error("[whatsapp] sendWhatsAppMessage error:", (e as Error).message));
}
