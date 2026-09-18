// Meta WhatsApp Cloud API — outbound text messages.
// Shared by app/api/whatsapp/webhook/route.ts (bot replies) and
// app/api/bridge/webhook/route.ts (proactive confirmation after KYC approval).
// No Twilio — plain fetch() to the Graph API, same as the original bot implementation.

const TOKEN_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN_AT = process.env.WHATSAPP_ACCESS_TOKEN;

// A handful of countries have a well-known WhatsApp quirk: the wa_id reported on inbound
// webhooks (the "from" field) includes an extra trunk/mobile digit right after the country
// code that Meta's outbound send API does NOT want back — sending the raw wa_id as-is fails
// with error 131030 ("Recipient phone number not in allowed list") even for an already-
// authorized number, because Meta's allow-list match is against the typed/normalized form,
// not the resolved wa_id. Confirmed directly against the Graph API for Mexico:
// 529993825321 accepted, 5219993825321 (the real wa_id) rejected.
//   MX: 521XXXXXXXXXX (13 digits) → 52XXXXXXXXXX  — extra "1"
//   AR: 549XXXXXXXXXX (13 digits) → 54XXXXXXXXXX  — extra "9" (long-reported WhatsApp/Argentina quirk)
const KNOWN_TRUNK_PREFIXES: Array<{ cc: string; extra: string; len: number }> = [
  { cc: "52", extra: "1", len: 13 }, // Mexico
  { cc: "54", extra: "9", len: 13 }, // Argentina
];

function stripKnownTrunkPrefix(waId: string): string | null {
  for (const { cc, extra, len } of KNOWN_TRUNK_PREFIXES) {
    if (waId.length === len && waId.startsWith(cc + extra)) {
      return cc + waId.slice((cc + extra).length);
    }
  }
  return null;
}

async function attemptSend(to: string, body: string): Promise<Response> {
  return fetch(`https://graph.facebook.com/v20.0/${TOKEN_ID}/messages`, {
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
}

// Sends, and — for the countries we know have this quirk — proactively tries the stripped
// form first. If Meta STILL rejects with 131030 (unrecognized country, or our known-list is
// wrong/incomplete), retries once with whichever form we haven't tried yet, so a number from
// anywhere in the world self-corrects instead of failing outright.
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!TOKEN_ID || !TOKEN_AT) {
    console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set");
    return;
  }

  const stripped = stripKnownTrunkPrefix(to);
  const firstTry = stripped ?? to;

  try {
    let res = await attemptSend(firstTry, body);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const isAllowListError = errText.includes("131030");

      // Try the other form once — covers both "we stripped but Meta actually wanted the
      // original" and "we didn't strip because this country isn't in our known list, but
      // it has the same quirk anyway".
      const secondTry = firstTry === to
        ? (stripped ?? guessAlternateForm(to))
        : to;

      if (isAllowListError && secondTry && secondTry !== firstTry) {
        console.warn(`[whatsapp] ${firstTry} rejected (131030), retrying as ${secondTry}`);
        res = await attemptSend(secondTry, body);
        if (!res.ok) {
          const retryErrText = await res.text().catch(() => "");
          console.error(`[whatsapp] sendWhatsAppMessage failed on both forms (${res.status}) to=${secondTry}:`, retryErrText);
        }
      } else {
        console.error(`[whatsapp] sendWhatsAppMessage failed (${res.status}) to=${firstTry}:`, errText);
      }
    }
  } catch (e) {
    console.error("[whatsapp] sendWhatsAppMessage network error:", (e as Error).message);
  }
}

// Best-effort guess for countries NOT in our known list: try inserting/removing a single
// digit right after a 2-digit country code, since that's the shape of every quirk we've
// seen so far. Cheap safety net — worst case the retry also fails and we just log it.
function guessAlternateForm(waId: string): string | null {
  if (waId.length < 11 || waId.length > 15) return null;
  const cc = waId.slice(0, 2);
  const rest = waId.slice(2);
  // If it looks like cc + extra-digit + 10-digit-number, strip the extra digit.
  if (rest.length === 11) return cc + rest.slice(1);
  return null;
}
