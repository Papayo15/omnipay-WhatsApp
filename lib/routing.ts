// Route utilities.
// getTargetCurrency() is used across API routes and providers.

import { NATIVE_RAILS } from "@/providers/bridge/liquidation";
import { CONDUIT_RAIL_MAP } from "@/lib/conduit/rails";

export type PaymentProvider = "bridge" | "conduit" | "unsupported";

// Fuente única de verdad de qué proveedor mueve el dinero para cada país destino. Antes
// vivía duplicada a mano en dos lugares que no se importaban entre sí — NATIVE_RAILS
// (providers/bridge/liquidation.ts) y un Set re-tecleado a mano dentro de
// app/api/whatsapp/webhook/route.ts (BRIDGE_NATIVE_COUNTRIES) — sin nada que forzara que
// se mantuvieran sincronizados. Bridge tiene prioridad si un país estuviera (no debería)
// en los dos mapas a la vez.
export function getProviderForCountry(country: string): PaymentProvider {
  const cc = country.toUpperCase();
  if (NATIVE_RAILS[cc]) return "bridge";
  if (CONDUIT_RAIL_MAP[cc]) return "conduit";
  return "unsupported";
}

// Returns the local fiat currency for a given 2-letter country code.
export function getTargetCurrency(targetCountry: string): string {
  const map: Record<string, string> = {
    MX: "MXN", BR: "BRL", CO: "COP", AR: "ARS",
    US: "USD", CA: "CAD", GB: "GBP",
    // Eurozone SEPA
    DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR",
    BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", CY: "EUR",
    EE: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", SK: "EUR",
    SI: "EUR", HR: "EUR",
    // Non-Eurozone SEPA (Bridge delivers EUR via SEPA IBAN)
    SE: "EUR", DK: "EUR", NO: "EUR", PL: "EUR", CZ: "EUR", HU: "EUR",
    RO: "EUR", BG: "EUR", CH: "EUR", IS: "EUR", LI: "EUR",
    EU: "EUR",
    IN: "INR", PH: "PHP", NG: "NGN", KE: "KES", GH: "GHS",
    AU: "AUD", JP: "JPY", KR: "KRW", VN: "VND", ID: "IDR",
    MA: "MAD", EG: "EGP", ZA: "ZAR", SN: "XOF", CI: "XOF",
    TZ: "TZS", UG: "UGX", ZM: "ZMW", ET: "ETB", RW: "RWF",
    PK: "PKR", BD: "BDT", LK: "LKR", NP: "NPR",
    TR: "TRY", SA: "SAR", AE: "AED", QA: "QAR", KW: "KWD",
    TH: "THB", MY: "MYR", SG: "SGD", UA: "UAH",
    CL: "CLP", PE: "PEN", EC: "USD", DO: "DOP", GT: "GTQ",
    HN: "HNL", SV: "USD", CR: "CRC", PA: "USD", BO: "BOB",
    PY: "PYG", UY: "UYU",
  };
  return map[targetCountry.toUpperCase()] ?? "USD";
}
