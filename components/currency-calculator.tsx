"use client";

// Calculadora comparativa transparente — Módulo 1
// Reutiliza el motor FX/fees existente vía /api/bridge/fx-quote (lib/bridge-fees.ts,
// lib/fx-server.ts) — no duplica lógica de comisiones ni introduce un endpoint nuevo.
//
// Muestra lo que el usuario migrante realmente decide en 2 segundos: cuánto MÁS
// recibe su beneficiario con OmniPay vs. el spread oculto promedio de la competencia.

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { COUNTRIES } from "@/constants/countries";

// Alcance actual: solo los corredores P2P/B2B que YA corren en vivo por Bridge —
// MXN, USD, COP y zona EUR. El resto de NATIVE_RAILS (BR, GB, etc.) se habilita en la
// calculadora cuando entre Conduit (mediados de octubre) como riel adicional.
const SUPPORTED_DEST_CODES = [
  "MX", "US", "CO",
  "DE", "FR", "ES", "IT", "NL", "PT", "BE", "AT", "IE", "FI",
];

const SOURCE_CURRENCIES = ["USD", "EUR"] as const;

// Spread oculto promedio estimado de la competencia (remesadoras tradicionales) sobre
// la tasa interbancaria — usado solo para la comparación visual, no afecta ningún cobro real.
const COMPETITOR_SPREAD_PCT = 0.032;

// Tarifa fija promedio que cobran remesadoras tradicionales (ej. Western Union, MoneyGram)
// además del spread oculto — equivalente aproximado por moneda origen (no requiere otra
// llamada a la API; son valores de referencia de mercado, no cobros reales de OmniPay).
const COMPETITOR_FIXED_FEE: Record<string, number> = {
  USD: 3.99, EUR: 3.69, GBP: 3.19, CAD: 5.49,
};

interface FxQuoteResponse {
  from_currency:   string;
  target_currency: string;
  fx_rate:          number;
  recipient_gets:   number;
  bridge_fee:        number;
  omnipay_fee:       number;
  total_fee:         number;
  sender_deposits:   number;
}

export function CurrencyCalculator() {
  const t = useTranslations("calculator");

  const [amount, setAmount]           = useState("300");
  const [sourceCurrency, setSourceCurrency] = useState<string>("USD");
  const [destCountry, setDestCountry] = useState<string>("MX");
  const [quote, setQuote]             = useState<FxQuoteResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destCountryInfo = COUNTRIES.find((c) => c.code === destCountry);
  const destCurrency    = destCountryInfo?.currency ?? "MXN";

  // Fetch en dos pasadas, SIEMPRE dentro de la misma llamada (no depende de estado de
  // un render anterior) — evita que la primera cotización de cualquier visitante salga
  // mal calculada por tratar el monto origen como si ya fuera monto destino.
  useEffect(() => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setQuote(null); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const qs1 = new URLSearchParams({
          from: sourceCurrency, to: destCurrency, amount: String(val), country: destCountry,
        });
        const r1 = await fetch(`/api/bridge/fx-quote?${qs1}`);
        if (!r1.ok) { setQuote(null); setError(true); return; }
        const q1 = await r1.json() as FxQuoteResponse;

        // Segunda pasada: ahora sí con el monto destino aproximado correctamente
        // usando la tasa real que acabamos de recibir.
        const approxTarget = parseFloat((val * q1.fx_rate).toFixed(2));
        const qs2 = new URLSearchParams({
          from: sourceCurrency, to: destCurrency, amount: String(approxTarget), country: destCountry,
        });
        const r2 = await fetch(`/api/bridge/fx-quote?${qs2}`);
        setQuote(r2.ok ? await r2.json() as FxQuoteResponse : q1);
      } catch {
        setQuote(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [amount, sourceCurrency, destCountry, destCurrency]);

  // Competencia: misma tasa interbancaria real, pero un remesador tradicional cobra
  // una tarifa fija visible ADEMÁS de esconder su margen en un peor tipo de cambio.
  // Restamos la tarifa fija del monto (en moneda origen) antes de aplicar el spread.
  const fixedFee = COMPETITOR_FIXED_FEE[sourceCurrency] ?? COMPETITOR_FIXED_FEE.USD;
  const competitorGets = quote
    ? parseFloat((Math.max(quote.sender_deposits - fixedFee, 0) * quote.fx_rate * (1 - COMPETITOR_SPREAD_PCT)).toFixed(2))
    : null;

  // Diferencial SIEMPRE en moneda destino — nunca en la moneda de origen (USD/EUR/GBP/CAD).
  const savings = quote && competitorGets !== null
    ? parseFloat((quote.recipient_gets - competitorGets).toFixed(2))
    : null;

  // Nota de ahorro anual (enviando 1 vez al mes), convertida de vuelta a USD para que
  // sea comparable sin importar el corredor — esta sí en USD, a propósito, por pedido.
  const annualSavingsUsd = savings && quote
    ? parseFloat(((savings / quote.fx_rate) * 12).toFixed(0))
    : null;

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);

  return (
    <section className="w-full max-w-md mx-auto bg-[#111827] border border-[#1f2937] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-white font-bold text-lg">{t("title")}</h2>
        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 px-2 py-0.5 rounded-full">
          {t("p2p_only_label")}
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-4">{t("subtitle")}</p>

      <div className="flex gap-2 mb-3">
        <input
          type="number"
          inputMode="decimal"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-[#0f172a] border border-[#1f2937] rounded-lg px-3 py-2 text-white"
          aria-label={t("amount_label")}
        />
        <select
          value={sourceCurrency}
          onChange={(e) => setSourceCurrency(e.target.value)}
          className="bg-[#0f172a] border border-[#1f2937] rounded-lg px-2 py-2 text-white"
          aria-label={t("currency_label")}
        >
          {SOURCE_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <select
        value={destCountry}
        onChange={(e) => setDestCountry(e.target.value)}
        className="w-full bg-[#0f172a] border border-[#1f2937] rounded-lg px-3 py-2 text-white mb-4"
        aria-label={t("destination_label")}
      >
        {SUPPORTED_DEST_CODES.map((code) => {
          const c = COUNTRIES.find((x) => x.code === code);
          if (!c) return null;
          return <option key={code} value={code}>{c.flag} {c.name} ({c.currency})</option>;
        })}
      </select>

      {loading && <p className="text-slate-500 text-sm">{t("loading")}</p>}
      {error && !loading && <p className="text-red-400 text-sm">{t("error")}</p>}

      {quote && competitorGets !== null && savings !== null && !loading && (
        <>
          {savings > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4 text-center">
              <p className="text-emerald-400 font-extrabold text-lg leading-tight">
                {t("savings_badge", { amount: fmt(savings, destCurrency) })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0f172a] rounded-xl p-3 border border-emerald-500/30">
              <p className="text-emerald-400 text-xs font-bold uppercase mb-1">{t("omnipay_label")}</p>
              <p className="text-white font-bold text-lg">{fmt(quote.recipient_gets, destCurrency)}</p>
              <p className="text-slate-500 text-xs mt-1">
                {t("omnipay_fee_label", { fee: fmt(quote.total_fee, quote.from_currency) })}
              </p>
            </div>
            <div className="bg-[#0f172a] rounded-xl p-3 border border-[#1f2937]">
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">{t("competitor_label")}</p>
              <p className="text-white font-bold text-lg">{fmt(competitorGets, destCurrency)}</p>
              <p className="text-slate-500 text-xs mt-1">
                {t("competitor_spread_label", { fee: fmt(fixedFee, sourceCurrency) })}
              </p>
            </div>
          </div>

          <p className="text-slate-600 text-[11px] mt-3 text-center">{t("disclaimer")}</p>
          {annualSavingsUsd !== null && annualSavingsUsd > 0 && (
            <p className="text-emerald-500/80 text-[11px] mt-1 text-center font-medium">
              {t("annual_savings_note", { amount: `$${annualSavingsUsd}+` })}
            </p>
          )}
        </>
      )}
    </section>
  );
}
