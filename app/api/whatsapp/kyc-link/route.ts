// GET /api/whatsapp/kyc-link?email=...&wa=<waId>&locale=<19-locale>
//
// Called by app/kyc/page.tsx (the page the WhatsApp bot links users to). Gets or creates
// the Bridge individual customer for this email and returns a Persona-hosted KYC URL —
// same functions app/api/bridge/send/route.ts already uses, no parallel KYC logic.
//
// We don't have the user's legal name yet at this point (the bot only collected amount/
// country/email) — Persona collects the real legal name during identity verification
// itself, so a placeholder name on the Bridge customer record is fine here.

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCustomer, getKycLink, createKycLink } from "@/providers/bridge/customers";

export const runtime = "nodejs";

const ENDORSEMENTS = ["base", "sepa", "spei", "pix", "faster_payments", "cop"];

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const email  = (searchParams.get("email") ?? "").trim().toLowerCase();
  const wa     = searchParams.get("wa") ?? "";
  const locale = searchParams.get("locale") ?? "en";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";
  const redirectUri = `${appUrl}/kyc?done=1&wa=${encodeURIComponent(wa)}&locale=${locale}`;

  try {
    const { customer, needsKyc } = await getOrCreateCustomer({
      type:        "individual",
      email,
      first_name:  "OmniPay",
      last_name:   "WhatsApp",
      country:     "USA",
      endorsements: ENDORSEMENTS,
    });

    if (!needsKyc) {
      return NextResponse.json({ needs_kyc: false, customer_id: customer.id });
    }

    let kycUrl: string | null = null;
    try {
      const kl = await getKycLink(customer.id, { redirect_uri: redirectUri });
      kycUrl = kl.url ?? kl.kyc_link ?? null;
    } catch { /* fall through to createKycLink */ }

    if (!kycUrl) {
      const kl2 = await createKycLink({
        full_name:    "OmniPay WhatsApp",
        email,
        type:         "individual",
        endorsements: ENDORSEMENTS,
        redirect_uri: redirectUri,
      });
      kycUrl = kl2.url ?? kl2.kyc_link ?? null;
    }

    return NextResponse.json({ needs_kyc: true, kyc_url: kycUrl, customer_id: customer.id });
  } catch (e) {
    const err = e as Error;
    console.error("[whatsapp/kyc-link]", err.message);
    return NextResponse.json({ error: "Could not start verification" }, { status: 500 });
  }
}
