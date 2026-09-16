"use client";

// /prueba-express — Módulo 5: landing de captación orgánica + "prueba de $10 USD".
// No duplica el flujo de envío: el CTA lleva a /enviar con amount/currency/country
// precargados vía query params (soporte agregado en app/enviar/page.tsx, Módulo 3),
// así que toda la lógica de KYC/ToS/depósito sigue siendo la misma de siempre.
//
// Resiliencia a navegadores in-app (Instagram/Facebook/TikTok): esos navegadores a veces
// limpian localStorage entre "sesiones" del webview. Por eso el estado de la prueba viaja
// en la URL (query params), no en localStorage — mismo patrón de round-trip por URL que ya
// usa /enviar para kyc_done / tos_done.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Zap, Share2 } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/messaging";

const TRIAL_AMOUNT = "10";
const TRIAL_CURRENCY = "USD";
const TRIAL_COUNTRY = "MX";

export default function PruebaExpressPage() {
  const t = useTranslations("pruebaExpress");
  const router = useRouter();
  const [appUrl, setAppUrl] = useState("");

  // window.location solo existe en el cliente — evita mismatch de hidratación
  useEffect(() => { setAppUrl(window.location.origin); }, []);

  const trialLink = `${appUrl}/prueba-express`;
  const shareMessage = `${t("title")} — ${trialLink}`;

  function goToTrial() {
    router.push(`/enviar?amount=${TRIAL_AMOUNT}&currency=${TRIAL_CURRENCY}&country=${TRIAL_COUNTRY}`);
  }

  function shareFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trialLink)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center px-5 pt-14 pb-16 text-center">
      <Zap className="w-10 h-10 text-[#00C9C8] mb-4" />
      <h1 className="text-white font-bold text-2xl max-w-sm">{t("title")}</h1>
      <p className="text-slate-400 text-sm max-w-sm mt-2">{t("subtitle")}</p>

      <button
        onClick={goToTrial}
        className="w-full max-w-xs bg-[#00C9C8] hover:bg-[#00b8b7] text-[#0f172a] font-bold py-3.5 rounded-xl text-sm mt-8 active:scale-[0.98] transition-transform"
      >
        {t("cta")} →
      </button>

      <p className="text-slate-600 text-xs max-w-xs mt-3">{t("footnote")}</p>

      <div className="w-full max-w-xs mt-10 border-t border-[#1f2937] pt-6">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" /> {t("share_title")}
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={buildWhatsAppLink(shareMessage)}
            target="_blank" rel="noopener noreferrer"
            className="w-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-bold py-2.5 rounded-lg text-sm"
          >
            {t("share_whatsapp")}
          </a>
          <button
            onClick={shareFacebook}
            className="w-full bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] font-bold py-2.5 rounded-lg text-sm"
          >
            {t("share_facebook")}
          </button>
        </div>
      </div>
    </main>
  );
}
