"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { TrustBanner } from "@/components/TrustBanner";
import { FaqAccordion } from "@/components/FaqAccordion";
import { CurrencyCalculator } from "@/components/currency-calculator";

export default function Home() {
  const tl = useTranslations("landing");
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [b2bMode, setB2bMode] = useState<"card" | "wire">("card");

  useEffect(() => {
    // Redirect legacy checkout links (?t=...&s=...) to /b2b
    const p = new URLSearchParams(window.location.search);
    const tok = p.get("t");
    const sig = p.get("s");
    if (tok && sig) {
      const type = p.get("type") ?? "";
      router.replace(`/b2b?t=${tok}&s=${sig}${type ? `&type=${type}` : ""}`);
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Zap className="w-8 h-8 text-[#00C9C8] animate-pulse" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center px-5 pt-10 pb-16">

      {/* Logo */}
      <div className="w-full max-w-md flex items-center gap-2 mb-6">
        <Zap className="w-6 h-6 text-[#00C9C8]" />
        <span className="text-xl font-bold text-white tracking-tight">OmniPay</span>
      </div>

      {/* Calculadora comparativa — arriba del todo, para captar antes de que decidan */}
      <div className="w-full max-w-md mb-6">
        <CurrencyCalculator />
      </div>

      {/* 2 cards lado a lado — Empresa izquierda, Personal derecha */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">

        {/* Card: B2B con toggle Tarjeta | Wire */}
        <div className="w-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-[#00C9C8]/30 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 pb-3">
            <p className="text-[#00C9C8] text-[10px] font-bold uppercase tracking-widest mb-1">{tl("b2b_eyebrow")}</p>
            <h2 className="text-white font-bold text-base leading-tight mb-1">{tl("send_b2b_title")}</h2>
            <p className="text-slate-400 text-xs leading-relaxed">{tl("send_b2b_sub")}</p>
          </div>

          {/* Toggle */}
          <div className="flex bg-slate-900/60 rounded-xl p-1 mx-4 mb-3">
            <button
              onClick={() => setB2bMode("card")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150 ${
                b2bMode === "card"
                  ? "bg-[#00C9C8] text-[#0f172a]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💳 {tl("b2b_mode_card")}
            </button>
            <button
              onClick={() => setB2bMode("wire")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150 ${
                b2bMode === "wire"
                  ? "bg-[#00C9C8] text-[#0f172a]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏦 {tl("b2b_mode_wire")}
            </button>
          </div>

          {/* Fee + tiempo según modo */}
          {b2bMode === "card" ? (
            <div className="bg-slate-900/50 rounded-xl p-2.5 mx-4 mb-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[9px]">{tl("b2b_fee_label")}</span>
                <span className="text-slate-300 text-[9px] font-mono">~4.4%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[9px]">{tl("b2b_time_label")}</span>
                <span className="text-amber-400 text-[9px] font-semibold">4–5 {tl("b2b_days")}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 rounded-xl p-2.5 mx-4 mb-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[9px]">{tl("b2b_fee_label")}</span>
                <span className="text-slate-300 text-[9px] font-mono">~1.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[9px]">{tl("b2b_time_label")}</span>
                <span className="text-emerald-400 text-[9px] font-semibold">{tl("b2b_time_instant")}</span>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 mt-auto">
            <button
              onClick={() => router.push(b2bMode === "card" ? "/enviar-empresa" : "/enviar-empresa-wire")}
              className="w-full bg-[#00C9C8] hover:bg-[#00b8b7] text-[#0f172a] font-bold py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-[0.98]"
            >
              {tl("send_b2b_cta")} →
            </button>
          </div>
        </div>

        {/* Card: P2P personal */}
        <div className="w-full bg-gradient-to-br from-emerald-950/60 to-slate-900/80 border border-emerald-700/50 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4">
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">{tl("p2p_eyebrow")}</p>
            <h2 className="text-white font-bold text-base leading-tight mb-1">{tl("send_p2p_title")}</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-1">{tl("send_p2p_sub")}</p>
            <p className="text-slate-500 text-[10px] leading-relaxed">{tl("send_p2p_desc")}</p>
          </div>
          <div className="px-4 pb-4 mt-auto">
            <button
              onClick={() => router.push("/enviar")}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0f172a] font-bold py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-[0.98]"
            >
              {tl("send_p2p_cta")} →
            </button>
          </div>
        </div>
      </div>

      <p className="text-slate-500 text-[11px] text-center mt-4 max-w-md">
        {tl("landing_subtitle")}
      </p>

      <div className="w-full max-w-md mt-8">
        <TrustBanner variant="footer" />
      </div>

      <div className="w-full max-w-md mt-8">
        <FaqAccordion />
      </div>
    </main>
  );
}
