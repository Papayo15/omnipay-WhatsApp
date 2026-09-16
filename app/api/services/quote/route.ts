// POST /api/services/quote — Módulo 4 (aislado, condicional)
//
// NOTA DE REVISIÓN: el payout SPEI hacia cuentas concentradoras de servicios (CFE, Telmex,
// Izzi) requiere validación de Compliance con Bridge antes de activarse en producción.
// Mientras SERVICES_MODULE_ENABLED !== "true", este endpoint responde 501 sin tocar Bridge.
//
// Cuando está habilitado: calcula el equivalente en USD del monto en MXN (lib/fx-server,
// mismo motor de tasas que el resto de la app), crea/reutiliza un customer Bridge y una
// cuenta virtual en USD para el depósito del pagador — mismo patrón que
// app/api/bridge/send/route.ts, sin duplicar la lógica de Bridge.

import { NextRequest, NextResponse } from "next/server";
import { getRate } from "@/lib/fx-server";
import { getOrCreateCustomer, patchCustomerAddress, ensureEndorsements } from "@/providers/bridge/customers";
import { createLiquidationAddress } from "@/providers/bridge/liquidation";
import { createVirtualAccount } from "@/providers/bridge/virtual-accounts";
import type { ServiceProvider, ServiceQuoteRequest, ServiceQuoteResponse } from "@/lib/types/services";

export const runtime = "nodejs";

const QUOTE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Cuentas concentradoras (CLABE) por proveedor — configuradas por env, nunca hardcodeadas.
// Ninguna está disponible hoy; el módulo permanece en 501 hasta que Compliance las confirme.
const CONCENTRADORA_CLABE: Record<ServiceProvider, string | undefined> = {
  CFE:     process.env.SERVICE_CLABE_CFE,
  TELMEX:  process.env.SERVICE_CLABE_TELMEX,
  IZZI:    process.env.SERVICE_CLABE_IZZI,
};

export async function POST(req: NextRequest): Promise<Response> {
  if (process.env.SERVICES_MODULE_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Servicio no disponible — módulo pendiente de validación de Compliance." },
      { status: 501 },
    );
  }

  let body: ServiceQuoteRequest;
  try { body = await req.json() as ServiceQuoteRequest; }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { provider, reference, amountMxn } = body;

  if (!provider || !reference || !amountMxn || amountMxn <= 0) {
    return NextResponse.json({ error: "provider, reference y amountMxn son requeridos" }, { status: 400 });
  }

  const clabe = CONCENTRADORA_CLABE[provider];
  if (!clabe) {
    return NextResponse.json({ error: `Proveedor ${provider} no configurado aún` }, { status: 501 });
  }

  try {
    const rate = await getRate("MXN", "USD"); // 1 MXN = X USD
    if (!rate) return NextResponse.json({ error: "Tasa de cambio no disponible" }, { status: 503 });
    const amountUsd = parseFloat((amountMxn * rate).toFixed(2));

    // Cliente anónimo por pago — no requiere KYC completo para depositar (mismo patrón
    // que un customer nuevo en app/api/bridge/send/route.ts; Bridge aplica sus propios
    // límites de monto sin verificación).
    const payerEmail = `service-${reference}-${Date.now()}@omnipay.solutions`;
    const { customer } = await getOrCreateCustomer({
      type: "individual", email: payerEmail,
      first_name: provider, last_name: "OmniPay",
      country: "USA", endorsements: ["base", "spei"],
    });
    try { await patchCustomerAddress(customer.id, "USA", true); } catch { /* best-effort */ }
    try { await ensureEndorsements(customer.id, ["base", "spei"]); } catch { /* best-effort */ }

    const liqAddr = await createLiquidationAddress({
      customerId:    customer.id,
      country:       "MX",
      receiveMethod: "bank",
      ownerName:     `${provider} ${reference}`.slice(0, 40),
      ownerType:     "business",
      rail:          "spei",
      clabe,
    });

    const va = await createVirtualAccount({
      customerId:          customer.id,
      sourceCurrency:      "usd",
      destinationAddress:  liqAddr.address,
      destinationNetwork:  "polygon",
      developerFeePercent: "0.50",
      reference:           `svc-${provider}-${reference}`,
      developerReference:  `svc-${provider}-${reference}`,
    });

    const di = va.source_deposit_instructions;
    const response: ServiceQuoteResponse = {
      provider, reference,
      amount_mxn: amountMxn,
      amount_usd: amountUsd,
      fx_rate:    parseFloat((1 / rate).toFixed(4)), // 1 USD = X MXN, para mostrar al usuario
      quote_id:   `svc-${provider}-${reference}-${Date.now()}`,
      virtual_account: {
        currency:          "USD",
        bank_name:         di.bank_name,
        routing_number:    di.bank_routing_number,
        account_number:    di.bank_account_number,
        beneficiary_name:  di.bank_beneficiary_name,
        instructions:      `Deposita exactamente ${amountUsd.toFixed(2)} USD a esta cuenta.`,
      },
      expires_at: Date.now() + QUOTE_TTL_MS,
    };
    return NextResponse.json(response);
  } catch (e) {
    const err = e as Error;
    console.error("[services/quote]", err.message);
    return NextResponse.json({ error: "Error generando la cotización" }, { status: 500 });
  }
}
