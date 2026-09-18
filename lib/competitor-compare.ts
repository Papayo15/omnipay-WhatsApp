// Comparación transparente vs. remesadoras tradicionales — Módulo 1.
// Matemática pura, sin llamadas a red ni imports server-only: la usan tanto
// components/currency-calculator.tsx (cliente, web) como app/api/whatsapp/webhook/route.ts
// (servidor, comando "comparar" del bot) — una sola fuente de verdad para el cálculo,
// nunca dos fórmulas que puedan desalinearse.

// Spread oculto promedio estimado de la competencia (remesadoras tradicionales) sobre
// la tasa interbancaria — usado solo para la comparación visual/informativa, no afecta
// ningún cobro real de OmniPay.
export const COMPETITOR_SPREAD_PCT = 0.032;

// Tarifa fija promedio que cobran remesadoras tradicionales (ej. Western Union, MoneyGram)
// además del spread oculto — valores de referencia de mercado, no cobros reales de OmniPay.
export const COMPETITOR_FIXED_FEE: Record<string, number> = {
  USD: 3.99, EUR: 3.69, GBP: 3.19, CAD: 5.49,
};

// Misma tasa interbancaria real que ya devuelve /api/bridge/fx-quote, pero un remesador
// tradicional cobra una tarifa fija visible ADEMÁS de esconder su margen en un peor tipo
// de cambio. Restamos la tarifa fija del monto (en moneda origen) antes de aplicar el spread.
export function computeCompetitorGets(senderDeposits: number, fxRate: number, sourceCurrency: string): number {
  const fixedFee = COMPETITOR_FIXED_FEE[sourceCurrency] ?? COMPETITOR_FIXED_FEE.USD;
  return parseFloat((Math.max(senderDeposits - fixedFee, 0) * fxRate * (1 - COMPETITOR_SPREAD_PCT)).toFixed(2));
}
