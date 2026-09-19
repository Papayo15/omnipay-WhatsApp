// GET /api/whatsapp/kyc-link?email=...&wa=<waId>&locale=<19-locale>&tos_done=1
//
// Called by app/kyc/page.tsx (the page the WhatsApp bot links users to). Gets or creates
// the Bridge individual customer for this email and returns a ToS or Persona-hosted KYC
// URL — same functions and same ToS→KYC ordering app/api/bridge/send/route.ts already
// uses for new customers in production, no parallel logic:
//   - Sandbox: ToS gate doesn't apply (Bridge auto-signs via signed_agreement_id) — straight to KYC.
//   - Production, brand-new customer: ToS MUST be accepted before KYC, or Bridge never marks
//     the customer active/approved even after Persona verification completes — see
//     providers/bridge/customers.ts:250 ("incomplete/not_started = customer record exists
//     in Bridge but never went through ToS+KYC").
//   - `tos_done=1` (redirect back from the ToS link below) → skip straight to KYC.
//
// We don't have the user's legal name yet at this point (the bot only collected amount/
// country/email) — Persona collects the real legal name during identity verification
// itself, so a placeholder name on the Bridge customer record is fine here.

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCustomer, evaluateCustomerById, getKycLink, createKycLink, createTosLink } from "@/providers/bridge/customers";

export const runtime = "nodejs";

const ENDORSEMENTS = ["base", "sepa", "spei", "pix", "faster_payments", "cop"];

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const email      = (searchParams.get("email") ?? "").trim().toLowerCase();
  const wa         = searchParams.get("wa") ?? "";
  const locale     = searchParams.get("locale") ?? "en";
  const tosDone    = searchParams.get("tos_done") === "1";
  const customerId = searchParams.get("customer_id") ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";
  const isSandbox   = (process.env.BRIDGE_API_BASE ?? "").includes("sandbox");
  // email va en el redirect para que /kyc?done=1 pueda confirmar en vivo contra Bridge que
  // el cliente ya quedó aprobado de verdad, antes de activar el botón "Volver a WhatsApp" —
  // Persona regresa al usuario en cuanto TERMINA de subir sus datos, no cuando Bridge ya
  // lo aprobó (esa revisión puede tardar más), así que "regresó de Persona" ≠ "ya aprobado".
  const kycRedirect = `${appUrl}/kyc?done=1&email=${encodeURIComponent(email)}&wa=${encodeURIComponent(wa)}&locale=${locale}`;

  try {
    // Si el bot de WhatsApp ya nos dio el customer_id (lo resolvió momentos antes), lo
    // buscamos directo por ID — sin esto, buscar de nuevo por correo puede chocar con el
    // indexado eventualmente consistente de Bridge para un cliente recién creado y dejar
    // esta pantalla cargando varios segundos (o de más).
    const { customer, isNew, needsKyc } = customerId
      ? await evaluateCustomerById(customerId, "individual")
      : await getOrCreateCustomer({
          type:        "individual",
          email,
          first_name:  "OmniPay",
          last_name:   "WhatsApp",
          country:     "USA",
          endorsements: ENDORSEMENTS,
        });

    if (!needsKyc) {
      return NextResponse.json({ needs_tos: false, needs_kyc: false, customer_id: customer.id });
    }

    // Producción, cliente nuevo, ToS no aceptado todavía → mandarlo ahí primero.
    if (!isSandbox && isNew && !tosDone) {
      const tosRedirect = `${appUrl}/kyc?email=${encodeURIComponent(email)}&wa=${encodeURIComponent(wa)}&locale=${locale}&tos_done=1`;
      try {
        const tosLink = await createTosLink({
          full_name: "OmniPay WhatsApp", email, type: "individual",
          customer_id: customer.id, redirect_uri: tosRedirect,
        });
        return NextResponse.json({ needs_tos: true, tos_url: tosLink.url, needs_kyc: true, customer_id: customer.id });
      } catch { /* si falla el link de ToS, seguimos directo a KYC en vez de trabar al usuario */ }
    }

    let kycUrl: string | null = null;
    try {
      const kl = await getKycLink(customer.id, { redirect_uri: kycRedirect });
      kycUrl = kl.url ?? kl.kyc_link ?? null;
    } catch { /* fall through to createKycLink */ }

    if (!kycUrl) {
      const kl2 = await createKycLink({
        full_name:    "OmniPay WhatsApp",
        email,
        type:         "individual",
        endorsements: ENDORSEMENTS,
        redirect_uri: kycRedirect,
      });
      kycUrl = kl2.url ?? kl2.kyc_link ?? null;
    }

    return NextResponse.json({ needs_tos: false, needs_kyc: true, kyc_url: kycUrl, customer_id: customer.id });
  } catch (e) {
    const err = e as Error;
    console.error("[whatsapp/kyc-link]", err.message);
    return NextResponse.json({ error: "Could not start verification" }, { status: 500 });
  }
}
