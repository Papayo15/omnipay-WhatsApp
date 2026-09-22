// Country → rail mapping for Conduit payouts. Extracted out of
// app/api/conduit/send/route.ts into its own module so lib/routing.ts
// (getProviderForCountry) can share the exact same list — before this, "which countries
// does Conduit cover" only lived inside a route file, unreachable from anywhere else.
//
// TODO: Confirm SPEI support with Conduit before activating Mexico corridor.
// TODO (antes de activar CONDUIT_MODULE_ENABLED en producción): CA/AU/CN usan el riel
// genérico "swift" (Conduit documenta swift como "country-agnostic", no atado a un país
// fijo) — pero la cobertura real (jurisdicciones bloqueadas por sanciones/compliance para tu
// cuenta específica) NO está confirmada con Conduit, solo inferida de su documentación
// pública, que no da una respuesta clara sobre estos 3 países. Confirmar con su soporte
// antes de dar esto por bueno — ver plan de la sesión que agregó esto.
export const CONDUIT_RAIL_MAP: Record<string, { rail: string; currency: string }> = {
  MX: { rail: "spei",  currency: "MXN" },
  US: { rail: "ach",   currency: "USD" },
  BR: { rail: "pix",   currency: "BRL" },
  GB: { rail: "fps",   currency: "GBP" },
  DE: { rail: "sepa",  currency: "EUR" },
  FR: { rail: "sepa",  currency: "EUR" },
  ES: { rail: "sepa",  currency: "EUR" },
  IT: { rail: "sepa",  currency: "EUR" },
  NL: { rail: "sepa",  currency: "EUR" },
  PT: { rail: "sepa",  currency: "EUR" },
  CO: { rail: "local", currency: "COP" },
  // Sin confirmar con Conduit — ver TODO arriba.
  CA: { rail: "swift", currency: "CAD" },
  AU: { rail: "swift", currency: "AUD" },
  CN: { rail: "swift", currency: "CNY" },
};
