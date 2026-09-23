// POST /api/bridge/send
//
// Sender-side onboarding — P2P unified endpoint.
// The SENDER is the Bridge customer (KYC'd). The RECIPIENT is only an External Account
// (bank details as payout destination). No KYC required from the recipient.
//
// Flow:
//   1. Create/get Bridge individual customer for the SENDER (KYC)
//   2. KYC gate: if not verified → return kyc_url (202) so UI can redirect sender
//   3. Create External Account + Liquidation Address under SENDER's customer
//      (ownerName = recipient's name for the bank transfer beneficiary)
//   4. Create Virtual Account for SENDER (fiat inbound → USDC → Liq Addr → recipient's bank)
//   5. Return deposit instructions + fee breakdown + order ID

import { NextRequest, NextResponse }        from "next/server";
import {
  getOrCreateCustomer, getCustomer,
  patchCustomerAddress, ensureEndorsements, getKycLink, createKycLink,
  createTosLink, ALPHA2_TO_ALPHA3, RAIL_ENDORSEMENT, simulateKycApproval,
} from "@/providers/bridge/customers";
import { createLiquidationAddress, ensureExternalAccount, NATIVE_RAILS } from "@/providers/bridge/liquidation";
import type { CreateLiquidationParams } from "@/providers/bridge/liquidation";
import { createVirtualAccount, getVirtualAccount } from "@/providers/bridge/virtual-accounts";
import { buildDynamicQuote }                from "@/lib/bridge-fees";
import { createOrder }                      from "@/lib/order-state";
import { getRedis }                         from "@/lib/redis";
import { getRate }                          from "@/lib/fx-server";
import { getTargetCurrency, getProviderForCountry } from "@/lib/routing";

export const runtime = "nodejs"; // needs setTimeout for sandbox poll + Redis

const ENDORSEMENTS = ["base", "sepa", "spei", "pix", "faster_payments", "cop"];

// Map source currency → sender's country (used for Bridge address field)
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  usd: "US", eur: "DE", gbp: "GB", mxn: "MX", brl: "BR",
};

const NETWORK_BY_CURRENCY: Record<string, "polygon" | "ethereum" | "solana"> = {
  usd: "polygon", eur: "polygon", gbp: "polygon", mxn: "polygon", brl: "polygon",
};

interface SendBody {
  // Sender (Bridge customer — KYC'd)
  sender_name:       string;
  sender_email:      string;
  source_currency:   "usd" | "eur" | "gbp" | "mxn" | "brl";
  redirect_uri?:     string;
  // Recipient bank details (External Account only — no Bridge customer)
  recipient_name:    string;
  recipient_country: string;
  clabe?:            string;
  iban?:             string;
  bic?:              string;
  pix_key?:          string;
  routing_number?:   string;
  account_number?:   string;
  sort_code?:        string;
  bank_code?:        string;
  document_number?:  string;
  amount_target:     number;
  // Optional: sent on retry after ToS/KYC to bypass Bridge list-endpoint eventual consistency
  existing_customer_id?: string;
  // Módulo 3 — Sistema de Referidos: waId (or hash) of the referrer, captured from
  // ?ref= by app/enviar/page.tsx (lib/referral.ts) and stored in localStorage — no DB.
  referral_code?:    string;
  // Módulo 2 — "whatsapp" cuando el envío viene del bot (?channel= en el link generado
  // por app/api/whatsapp/webhook/route.ts) — recupera el costo de sesión de Meta del
  // cliente en vez de restarlo del margen (lib/bridge-fees.ts).
  channel?:          "web" | "whatsapp";
}

const SEPA_SET = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR","SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI","AD","MC","SM","XK","VA"]);

// Read env vars at call time (not module load) so Vercel changes take effect after redeploy.
// SEPA Instant is not a separate API rail — Bridge auto-selects it when the recipient bank
// supports it. Always send "sepa"; Bridge picks the fastest path automatically.
function getRailForCountry(country: string): string {
  if (country === "US") {
    if (process.env.BRIDGE_USE_FEDNOW === "true") return "fednow";
    if (process.env.BRIDGE_USE_WIRE   === "true") return "wire";
    return "ach";
  }
  return NATIVE_RAILS[country]?.rail ?? "ach";
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: SendBody;
  try { body = await req.json() as SendBody; }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const {
    sender_name, sender_email, source_currency, redirect_uri,
    recipient_name, recipient_country,
    clabe, iban, bic, pix_key, routing_number, account_number,
    sort_code, bank_code, document_number,
    amount_target, existing_customer_id, referral_code, channel,
  } = body;

  if (!sender_name || !sender_email || !source_currency || !recipient_name || !recipient_country || !amount_target) {
    return NextResponse.json(
      { error: "sender_name, sender_email, source_currency, recipient_name, recipient_country, amount_target son requeridos" },
      { status: 400 },
    );
  }

  const country  = recipient_country.toUpperCase();
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

  if (!NATIVE_RAILS[country]) {
    // País fuera de los rieles nativos de Bridge — puede seguir siendo válido vía Conduit
    // (riel "swift"/genérico), apagado por completo hasta CONDUIT_MODULE_ENABLED="true"
    // (nunca en producción todavía — ver lib/conduit/rails.ts para qué falta confirmar antes
    // de activarlo de verdad). El bot de WhatsApp y /enviar siguen llamando siempre a este
    // mismo endpoint sin saber nada de Conduit — la decisión de a quién reenviar vive aquí,
    // en un solo lugar, en vez de duplicar esta lógica en cada punto de entrada.
    if (getProviderForCountry(country) === "conduit" && process.env.CONDUIT_MODULE_ENABLED === "true") {
      const conduitRes = await fetch(`${appUrl}/api/conduit/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const conduitData = await conduitRes.json();
      return NextResponse.json(conduitData, { status: conduitRes.status });
    }
    return NextResponse.json(
      { error: "País del receptor no soportado. Disponibles: MX, US, BR, CO, GB y zona SEPA." },
      { status: 400 },
    );
  }

  const isSandbox = (process.env.BRIDGE_API_BASE ?? "").includes("sandbox");

  try {
    // Convert recipient amount → USD for quote and validation
    const targetCurrency = getTargetCurrency(country);
    let amountUSD = amount_target;
    if (targetCurrency !== "USD") {
      const rate = await getRate(targetCurrency, "USD").catch(() => null);
      if (rate) amountUSD = parseFloat((amount_target * rate).toFixed(2));
    }

    if (amountUSD < 20) {
      return NextResponse.json({ error: "El monto mínimo de envío es $20 USD equivalente." }, { status: 400 });
    }

    // 1. Get or create Bridge individual customer for the SENDER.
    //    On retry (after ToS/KYC), pass existing_customer_id to bypass Bridge's list-endpoint
    //    eventual consistency lag — otherwise findCustomerByEmail can return null for a customer
    //    that was just created, causing getOrCreateCustomer to spin up a duplicate and re-trigger
    //    the ToS gate.
    let senderCustomer: Awaited<ReturnType<typeof getOrCreateCustomer>>["customer"];
    let needsKyc: boolean;
    let isSenderNew: boolean;
    if (existing_customer_id) {
      try {
        const c = await getCustomer(existing_customer_id);
        const c2 = c as unknown as Record<string, unknown>;
        const isOk = (s?: unknown) => s === "active" || s === "approved" || s === "granted";
        const kycApproved = isOk(c.status) || isOk(c2.kyc_status) || isOk(c2.kyb_status);
        senderCustomer = c;
        needsKyc       = !kycApproved;
        isSenderNew    = false; // already exists — skip ToS gate
      } catch {
        // Fallback: ID lookup failed (e.g., wrong env) — use email lookup instead
        const result = await getOrCreateCustomer({
          type:        "individual",
          email:       sender_email.toLowerCase(),
          first_name:  sender_name.split(" ")[0],
          last_name:   sender_name.split(" ").slice(1).join(" ") || "-",
          country:     ALPHA2_TO_ALPHA3[CURRENCY_TO_COUNTRY[source_currency] ?? "US"] ?? "USA",
          endorsements: ENDORSEMENTS,
        });
        senderCustomer = result.customer;
        needsKyc       = result.needsKyc;
        isSenderNew    = false; // Known customer — skip ToS gate
      }
    } else {
      const result = await getOrCreateCustomer({
        type:        "individual",
        email:       sender_email.toLowerCase(),
        first_name:  sender_name.split(" ")[0],
        last_name:   sender_name.split(" ").slice(1).join(" ") || "-",
        country:     ALPHA2_TO_ALPHA3[CURRENCY_TO_COUNTRY[source_currency] ?? "US"] ?? "USA",
        endorsements: ENDORSEMENTS,
      });
      senderCustomer = result.customer;
      needsKyc       = result.needsKyc;
      isSenderNew    = result.isNew;
    }

    const senderCountry = CURRENCY_TO_COUNTRY[source_currency] ?? "US";
    try { await patchCustomerAddress(senderCustomer.id, senderCountry, true); } catch { /* best-effort */ }

    // 2. Sandbox KYC gate — show simulate button for new OR unverified customers.
    //    Re-check by ID when existing customer shows needsKyc: list endpoint lags
    //    behind getCustomer after simulate-kyc runs.
    let kycStillNeeded = isSenderNew || needsKyc;
    if (isSandbox && !isSenderNew && needsKyc) {
      try {
        const fresh = await getCustomer(senderCustomer.id);
        const isOk2 = (s?: unknown) => s === "active" || s === "approved" || s === "granted";
        const freshActive = isOk2(fresh.status) || isOk2(fresh.kyc_status);
        if (freshActive) kycStillNeeded = false;
      } catch { /* best-effort */ }
    }
    if (isSandbox && kycStillNeeded) {
      const kycRedirectUri = redirect_uri ?? `${appUrl}/enviar?kyc_done=1`;
      return NextResponse.json({
        needs_kyc:   true,
        kyc_url:     null,
        customer_id: senderCustomer.id,
        is_sandbox:  true,
        message:     "Sandbox: usa el botón Simular KYC para continuar.",
        redirect_uri: kycRedirectUri,
      }, { status: 202 });
    }

    // 3. ToS gate for new sender in production
    if (!isSandbox && isSenderNew) {
      // ToS redirects to ?tos_done=1 so the app calls kyc-link directly (not full checkout).
      // KYC redirects to ?kyc_done=1 so the app polls approval then retries checkout.
      const tosRedirectUri = `${appUrl}/enviar?tos_done=1`;
      try {
        const tosLink = await createTosLink({
          full_name:    sender_name,
          email:        sender_email.toLowerCase(),
          type:         "individual",
          customer_id:  senderCustomer.id,
          redirect_uri: tosRedirectUri,
        });
        return NextResponse.json({
          needs_tos:   true,
          tos_url:     tosLink.url,
          customer_id: senderCustomer.id,
          message:     "Debes aceptar los Términos de Bridge antes de continuar.",
        }, { status: 202 });
      } catch { /* proceed if ToS link fails */ }
    }

    // 4. KYC gate (production)
    // Try GET /customers/{id}/kyc_link first — Bridge embeds redirect_uri into Persona URL.
    // If that fails (e.g. customer just created, Bridge not yet propagated), fall back to
    // POST /kyc_links which also embeds redirect_uri.
    const skipKyc = process.env.BRIDGE_SKIP_KYC === "true";
    if (needsKyc && !skipKyc && !isSandbox) {
      const kycRedirectUri = redirect_uri ?? `${appUrl}/enviar?kyc_done=1`;
      let kycUrl: string | null = null;
      try {
        const kl = await getKycLink(senderCustomer.id, { redirect_uri: kycRedirectUri });
        kycUrl = kl.url ?? kl.kyc_link ?? null;
        console.log(`[send] getKycLink customer=${senderCustomer.id} url=${kycUrl} raw=${JSON.stringify(kl).slice(0, 200)}`);
      } catch (e1) {
        console.error(`[send] getKycLink error: ${(e1 as Error).message}`);
      }
      // Fallback: POST /kyc_links for customers where GET returned no URL
      if (!kycUrl) {
        try {
          const kl2 = await createKycLink({
            full_name:   sender_name,
            email:       sender_email.toLowerCase(),
            type:        "individual",
            endorsements: ENDORSEMENTS,
            redirect_uri: kycRedirectUri,
          });
          kycUrl = kl2.url ?? kl2.kyc_link ?? null;
          console.log(`[send] createKycLink fallback customer=${senderCustomer.id} url=${kycUrl}`);
        } catch (e2) {
          console.error(`[send] createKycLink fallback error: ${(e2 as Error).message}`);
        }
      }
      return NextResponse.json({
        needs_kyc:   true,
        kyc_url:     kycUrl,
        customer_id: senderCustomer.id,
        message:     "Completa tu verificación de identidad y vuelve a intentarlo.",
      }, { status: 202 });
    }

    // 5. Ensure endorsements for sender (needed before creating liq addr)
    const railEndorsement   = RAIL_ENDORSEMENT[country];
    const fullEndorsements  = railEndorsement && !ENDORSEMENTS.includes(railEndorsement)
      ? [...ENDORSEMENTS, railEndorsement]
      : ENDORSEMENTS;
    try { await ensureEndorsements(senderCustomer.id, fullEndorsements); } catch { /* best-effort */ }

    // SANDBOX ÚNICAMENTE — mismo patrón que ya usa app/api/bridge/pay/route.ts (y checkout/
    // b2b/invite). Bridge sandbox aprueba el endorsement "base" (identidad) casi al instante
    // cuando Persona termina, pero los endorsements por riel/país (spei/pix/cop) se quedan
    // en "incomplete" — atorados en un requisito "account_processing" que nunca avanza solo.
    // Este endpoint (usado por el bot de WhatsApp) era el único de todos los que mueven
    // dinero que no llamaba simulate_kyc_approval — confirmado en vivo: un remitente que sí
    // completó Persona de verdad seguía recibiendo 403 missing_required_endorsements al
    // intentar depositar por SPEI. Nunca corre en producción.
    if (isSandbox) {
      try { await simulateKycApproval(senderCustomer.id); } catch { /* best-effort, may already be approved */ }
    }

    // 6. Create External Account + Liquidation Address under SENDER's customer.
    //    ownerName = recipient_name — this is the bank transfer beneficiary name on the payout.
    //    Bridge does not require ownerName to match the Bridge customer's KYC name.
    let actualRail = getRailForCountry(country);
    const liqParams: CreateLiquidationParams = {
      customerId:    senderCustomer.id,
      country,
      receiveMethod: "bank",
      ownerName:     recipient_name,
      ownerType:     "individual",
      rail:          actualRail,  // explicit — avoids NATIVE_RAILS module-load-time evaluation
      clabe, iban, bic, pixKey: pix_key,
      routingNumber: routing_number, accountNumber: account_number,
      sortCode: sort_code, bankCode: bank_code, documentNumber: document_number,
    };
    try { await ensureExternalAccount(liqParams); } catch { /* best-effort */ }

    const isEndorsementErr = (e: unknown) =>
      (e as Error)?.message?.toLowerCase().includes("endorsement")
      || (e as Error)?.message?.toLowerCase().includes("not active");

    const isUnsupportedRail = (e: unknown) =>
      (e as Error)?.message?.toLowerCase().includes("unsupported rail")
      || (e as Error)?.message?.toLowerCase().includes("unsupported_rail")
      || JSON.stringify((e as { details?: unknown })?.details ?? "").toLowerCase().includes("unsupported");

    let liqAddr: { id: string; address: string };
    try {
      liqAddr = await createLiquidationAddress(liqParams);
    } catch (e1) {
      if (isUnsupportedRail(e1)) {
        // Bridge hasn't enabled this rail (fednow / sepa_instant) for this account yet — fall back gracefully
        const fallbackRail = country === "US" ? "ach"
          : SEPA_SET.has(country) ? "sepa"
          : NATIVE_RAILS[country]?.rail ?? "ach";
        console.warn(`[bridge/send] Rail ${liqParams.rail ?? "unknown"} unsupported by Bridge, retrying with ${fallbackRail}`);
        liqAddr = await createLiquidationAddress({ ...liqParams, rail: fallbackRail });
        actualRail = fallbackRail;
      } else if (isEndorsementErr(e1)) {
        await new Promise(r => setTimeout(r, 5000));
        try { await ensureEndorsements(senderCustomer.id, fullEndorsements); } catch { /* ignore */ }
        liqAddr = await createLiquidationAddress(liqParams);
      } else {
        throw e1;
      }
    }

    // 7. Build fee quote — Módulo 3: a valid referral code waives OmniPay's 0.6% service
    // fee for this one transaction (first-transaction incentive for the referred sender).
    // Gated on isSenderNew — NOT just "a referral_code is present" — otherwise a user could
    // keep the code in localStorage (lib/referral.ts, 30-day TTL) or re-add ?ref= to the URL
    // and get the discount on every send instead of only their genuine first transfer.
    const quote = await buildDynamicQuote({
      amount:  amountUSD,
      country,
      email:   sender_email.toLowerCase(),
      type:    "p2p",
      waiveServiceFee: !!referral_code && isSenderNew,
      channel: channel === "whatsapp" ? "whatsapp" : "web",
    });

    // 8. Create Virtual Account for sender (fiat → USDC → liq addr → recipient's bank)
    //    "Efecto Memoria": Redis caches the VA ID so repeat sends reuse the same bank routing.
    const network   = NETWORK_BY_CURRENCY[source_currency] ?? "polygon";
    const vaRedisKey = `va-${senderCustomer.id}-${source_currency}-${liqAddr.id}`;
    let va: Awaited<ReturnType<typeof createVirtualAccount>>;
    try {
      const redis    = await getRedis();
      const cachedId = await redis.get(vaRedisKey);
      if (cachedId) {
        va = await getVirtualAccount(senderCustomer.id, cachedId);
      } else {
        va = await createVirtualAccount({
          customerId:          senderCustomer.id,
          sourceCurrency:      source_currency,
          destinationAddress:  liqAddr.address,
          destinationNetwork:  network,
          developerFeePercent: "0.50",
          reference:           liqAddr.id,
          developerReference:  `liq-${liqAddr.id}`,
        });
        await redis.set(vaRedisKey, va.id, { EX: 365 * 24 * 3600 });
      }
    } catch {
      va = await createVirtualAccount({
        customerId:          senderCustomer.id,
        sourceCurrency:      source_currency,
        destinationAddress:  liqAddr.address,
        destinationNetwork:  network,
        developerFeePercent: "0.50",
        reference:           liqAddr.id,
        developerReference:  `liq-${liqAddr.id}`,
      });
    }

    // 9. Store VA → liq addr mapping for webhook auto-order (no PII)
    if (process.env.REDIS_URL) {
      try {
        const redis = await getRedis();
        await redis.set(`va:${va.id}`, JSON.stringify({
          liq_addr_id:         liqAddr.id,
          destination_country: country,
          target_currency:     targetCurrency,
          source_currency,
        }), { EX: 365 * 86400 });
      } catch { /* best-effort */ }
    }

    // 10. Create tracking order
    const orderId = `OP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const senderLocale = req.cookies.get("OMNIPAY_LOCALE")?.value ?? "es";
    createOrder(orderId, {
      orderType:          "p2p",
      destinationCountry: country,
      targetCurrency,
      recipientName:      recipient_name,
      recipientAccount:   liqAddr.id,
      payInProvider:      "bridge-va",
      payOutProvider:     "bridge-liq",
      amount:             amountUSD,
      senderEmail:        sender_email.toLowerCase(),
      trackUrl:           `${appUrl}/api/bridge/track?order_id=${orderId}`,
      senderLocale,
      ...(referral_code ? { referralCode: referral_code } : {}),
    });

    const di = va.source_deposit_instructions;
    const railLabel = source_currency === "eur" ? "SEPA"
      : source_currency === "mxn" ? "SPEI"
      : source_currency === "brl" ? "PIX"
      : source_currency === "gbp" ? "Faster Payments"
      : "ACH";

    // Convert deposit amount from USD to source currency
    const usdToSource = source_currency === "usd"
      ? 1
      : (await getRate("USD", source_currency.toUpperCase()).catch(() => null)) ?? 1;
    const depositAmountInSource = parseFloat((quote.total_sender_pays * usdToSource).toFixed(2));

    return NextResponse.json({
      order_id: orderId,
      status:   "PENDING_PAYIN",
      deposit_instructions: {
        rail:                railLabel,
        currency:            source_currency.toUpperCase(),
        bank_name:           di.bank_name,
        bank_address:        di.bank_address,
        routing_number:      di.bank_routing_number,
        account_number:      di.bank_account_number,
        beneficiary_name:    di.bank_beneficiary_name,
        beneficiary_address: di.bank_beneficiary_address,
        iban:                di.iban,
        bic:                 di.bic,
        account_holder:      di.account_holder_name,
        clabe:               di.clabe,
        br_code:             di.br_code,
        sort_code:           di.sort_code,
        payment_rails:       di.payment_rails,
        amount_to_deposit:   depositAmountInSource.toFixed(2),
        instructions:        `Deposita exactamente ${depositAmountInSource.toFixed(2)} ${source_currency.toUpperCase()} a esta cuenta.`,
      },
      fee_breakdown: {
        amount_principal: quote.amount_principal,
        provider:         quote.provider,
        bridge_onramp:    quote.bridge_onramp,
        bridge_offramp:   quote.bridge_offramp,
        provider_cost:    quote.provider_cost_total,
        omnipay_service:  quote.omnipay_service,
        omnipay_flat:     quote.omnipay_flat,
        kyc_surcharge:    quote.kyc_surcharge,
        is_new_customer:  quote.is_new_customer,
        total_to_send:    quote.total_sender_pays,
        recipient_gets:   `${amount_target.toLocaleString("es-MX")} ${targetCurrency}`,
      },
      recipient: {
        name:    recipient_name,
        country,
        method:  "bank",
      },
      target_currency:    targetCurrency,
      amount_target,
      destination_rail:   actualRail,
      needs_kyc:  false,
      is_sandbox: isSandbox,
      track_url:  `${appUrl}/api/bridge/track?order_id=${orderId}`,
    });
  } catch (e) {
    const err = e as Error & { type?: string; status?: number; details?: unknown };
    console.error("[bridge/send]", err.message, err.type, JSON.stringify(err.details ?? {}));
    const msg = err.message ?? "";
    const detailsStr = JSON.stringify(err.details ?? "");
    const notEnabled = msg.toLowerCase().includes("not fully enabled")
      || detailsStr.toLowerCase().includes("not fully enabled");
    if (notEnabled) {
      return NextResponse.json({
        error: `${source_currency?.toUpperCase() ?? ""} no está habilitado aún. Por el momento usa USD o EUR.`,
      }, { status: 422 });
    }
    return NextResponse.json({ error: err.message ?? "Error interno" }, { status: err.status ?? 500 });
  }
}
