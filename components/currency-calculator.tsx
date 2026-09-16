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

// Únicamente los corredores que Bridge soporta de forma nativa (ver providers/bridge/liquidation.ts
// → NATIVE_RAILS). El resto de COUNTRIES existe para otros flujos (Wise/B2B) y no aplica aquí.
const SUPPORTED_DEST_CODES = [
  "US", "MX", "BR", "CO", "GB",
  "DE", "FR", "ES", "IT", "NL", "PT", "BE", "AT", "IE", "FI",
  "GR", "SK", "SI", "HR",
  "SE", "DK", "NO", "PL", "CZ", "HU", "RO", "BG", "CH",
];

const SOURCE_CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

// Spread oculto promedio estimado de la competencia (remesadoras tradicionales) sobre
// la tasa interbancaria — usado solo para la comparación visual, no afecta ningún cobro real.
const COMPETITOR_SPREAD_PCT = 0.032;

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

  // Misma estrategia de debounce que app/enviar/page.tsx: monto en moneda origen
  // se convierte a un estimado en moneda destino para pedir la cotización exacta.
  useEffect(() => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setQuote(null); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        // El endpoint espera `amount` en la moneda destino (recipient_gets). Pedimos
        // primero una cotización aproximada 1:1 y luego reconvertimos si hace falta;
        // en la práctica /api/bridge/fx-quote acepta amount en target currency, así que
        // convertimos el monto origen a un estimado destino usando fx_rate de la respuesta previa,
        // o —en la primera carga— usamos el monto tal cual como aproximación inicial.
        const approxTarget = quote ? val * quote.fx_rate : val;
        const qs = new URLSearchParams({
          from:    sourceCurrency,
          to:      destCurrency,
          amount:  String(approxTarget.toFixed(2)),
          country: destCountry,
        });
        const res = await fetch(`/api/bridge/fx-quote?${qs}`);
        if (res.ok) setQuote(await res.json());
        else { setQuote(null); setError(true); }
      } catch {
        setQuote(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, sourceCurrency, destCountry, destCurrency]);

  // Competencia: misma tasa interbancaria (fx_rate) pero con spread oculto de 3.2%
  // aplicado sobre el monto que el emisor deposita (sender_deposits real de OmniPay).
  const competitorGets = quote
    ? parseFloat((quote.sender_deposits * quote.fx_rate * (1 - COMPETITOR_SPREAD_PCT)).toFixed(2))
    : null;

  const savings = quote && competitorGets !== null
    ? parseFloat((quote.recipient_gets - competitorGets).toFixed(2))
    : null;

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n);

  return (
    <section className="w-full max-w-md mx-auto bg-[#111827] border border-[#1f2937] rounded-2xl p-5 mt-8">
      <h2 className="text-white font-bold text-lg mb-1">{t("title")}</h2>
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
              <p className="text-slate-500 text-xs mt-1">{t("competitor_spread_label")}</p>
            </div>
          </div>

          <p className="text-slate-600 text-[11px] mt-3 text-center">{t("disclaimer")}</p>
        </>
      )}
    </section>
  );
}
