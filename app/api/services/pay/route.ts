// POST /api/services/pay — Módulo 4 (aislado, condicional)
//
// Registra la intención de pago tras /api/services/quote (que ya creó la cuenta virtual
// y las instrucciones de depósito). Solo abre una orden de seguimiento — no vuelve a
// tocar Bridge. El estado real avanza únicamente cuando llega el webhook de depósito/
// dispersión SPEI (app/api/bridge/webhook/route.ts).
//
// Gateado igual que /api/services/quote — 501 hasta validación de Compliance.

import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/order-state";
import type { ServicePayRequest } from "@/lib/types/services";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  if (process.env.SERVICES_MODULE_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Servicio no disponible — módulo pendiente de validación de Compliance." },
      { status: 501 },
    );
  }

  let body: ServicePayRequest;
  try { body = await req.json() as ServicePayRequest; }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { quote_id, provider, reference, payer_email } = body;
  if (!quote_id || !provider || !reference) {
    return NextResponse.json({ error: "quote_id, provider y reference son requeridos" }, { status: 400 });
  }

  const orderId = `OP-SVC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnipay.solutions";

  createOrder(orderId, {
    orderType:          "service",
    destinationCountry: "MX",
    targetCurrency:     "MXN",
    recipientName:      `${provider} — ${reference}`,
    recipientAccount:   quote_id,
    payInProvider:      "bridge-va",
    payOutProvider:     "bridge-liq",
    senderEmail:        payer_email,
    trackUrl:           `${appUrl}/api/bridge/track?order_id=${orderId}`,
  });

  return NextResponse.json({
    order_id: orderId,
    status:   "PENDING_DEPOSIT",
    track_url: `${appUrl}/api/bridge/track?order_id=${orderId}`,
  });
}
