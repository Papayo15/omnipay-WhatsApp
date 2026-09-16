"use client";

// /pagar-servicio — Módulo 4 (aislado, condicional). UI que consume /api/services/quote y
// /api/services/pay. Estado 100% en localStorage hasta que el webhook de Bridge confirme
// la dispersión SPEI (se resuelve vía polling a /api/bridge/track, mismo endpoint que /enviar).
//
// Si SERVICES_MODULE_ENABLED no está activo, los endpoints devuelven 501 y esta página lo
// muestra como "no disponible" — no rompe nada, no está enlazada desde ninguna navegación
// existente hasta que el módulo se apruebe.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Zap, AlertCircle } from "lucide-react";
import type { ServiceProvider, ServiceQuoteResponse, ServicePaymentState } from "@/lib/types/services";

const PROVIDERS: ServiceProvider[] = ["CFE", "TELMEX", "IZZI"];
const STORAGE_KEY = "omnipay_service_payment";

export default function PagarServicioPage() {
  const t = useTranslations("serviciosMx");

  const [provider, setProvider]   = useState<ServiceProvider>("CFE");
  const [reference, setReference] = useState("");
  const [amountMxn, setAmountMxn] = useState("");
  const [quote, setQuote]         = useState<ServiceQuoteResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [status, setStatus]       = useState<ServicePaymentState["status"] | null>(null);

  // Restaurar estado local si el usuario recarga la página (patrón igual a app/enviar/page.tsx)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ServicePaymentState;
        setStatus(saved.status);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  async function handleQuote() {
    setError(""); setUnavailable(false); setLoading(true);
    try {
      const res = await fetch("/api/services/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, reference: reference.trim(), amountMxn: parseFloat(amountMxn) }),
      });
      if (res.status === 501) { setUnavailable(true); return; }
      if (!res.ok) { setError(t("error")); return; }
      const data = await res.json() as ServiceQuoteResponse;
      setQuote(data);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!quote) return;
    try {
      const res = await fetch("/api/services/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.quote_id, provider, reference, payer_email: "" }),
      });
      if (res.status === 501) { setUnavailable(true); return; }
      const data = await res.json() as { order_id: string };
      const state: ServicePaymentState = {
        quote_id: quote.quote_id, provider, reference,
        amount_mxn: quote.amount_mxn, status: "PENDING_DEPOSIT", savedAt: Date.now(),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
      setStatus("PENDING_DEPOSIT");
      void data.order_id; // tracking se resuelve vía polling en una siguiente iteración de esta UI
    } catch {
      setError(t("error"));
    }
  }

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center px-5 pt-10 pb-16">
      <Zap className="w-8 h-8 text-[#00C9C8] mb-4" />
      <h1 className="text-white font-bold text-xl mb-1 text-center">{t("title")}</h1>
      <p className="text-slate-400 text-sm text-center max-w-md mb-6">{t("subtitle")}</p>

      {unavailable && (
        <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-200 text-sm">{t("unavailable")}</p>
        </div>
      )}

      {!unavailable && !quote && (
        <div className="w-full max-w-md space-y-3">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ServiceProvider)}
            className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-white"
            aria-label={t("provider_label")}
          >
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="text"
            placeholder={t("reference_label")}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-white"
          />
          <input
            type="number"
            placeholder={t("amount_label")}
            value={amountMxn}
            onChange={(e) => setAmountMxn(e.target.value)}
            className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-white"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleQuote}
            disabled={loading || !reference || !amountMxn}
            className="w-full bg-[#00C9C8] hover:bg-[#00b8b7] disabled:opacity-50 text-[#0f172a] font-bold py-3 rounded-xl text-sm"
          >
            {loading ? t("quoting") : t("quote_btn")}
          </button>
        </div>
      )}

      {quote && !status && (
        <div className="w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-2">
          <h2 className="text-white font-bold">{t("deposit_title")}</h2>
          <p className="text-slate-400 text-sm">{t("deposit_note", { provider })}</p>
          <div className="text-white text-sm font-mono space-y-1 mt-3">
            <p>{quote.virtual_account.bank_name}</p>
            <p>{quote.virtual_account.routing_number} / {quote.virtual_account.account_number}</p>
            <p className="text-[#00C9C8]">{quote.amount_usd.toFixed(2)} USD</p>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full bg-[#00C9C8] hover:bg-[#00b8b7] text-[#0f172a] font-bold py-3 rounded-xl text-sm mt-3"
          >
            {t("pay_btn")}
          </button>
        </div>
      )}

      {status && (
        <p className="text-slate-300 text-sm mt-4">
          {status === "PENDING_DEPOSIT" && t("status_pending")}
          {status === "PROCESSING" && t("status_processing")}
          {status === "COMPLETED" && t("status_completed")}
          {status === "FAILED" && t("status_failed")}
        </p>
      )}
    </main>
  );
}
