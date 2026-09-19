"use client";

// /kyc — thin landing page linked from the WhatsApp bot (Módulo 2).
// Does not reimplement KYC: fetches a Bridge/Persona-hosted verification URL from
// /api/whatsapp/kyc-link and redirects the browser there, same as app/enviar/page.tsx
// already does for its own KYC step (Bridge manages KYC via its Persona widget — no
// direct document-upload API exists, so we never build our own upload UI).

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Zap, CheckCircle2, MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/messaging";

// Cuánto esperamos confirmación real de Bridge antes de rendirnos y mostrar el botón de
// todos modos (con un mensaje honesto de que la verificación sigue en proceso) — Persona
// regresa al navegador en cuanto el usuario TERMINA de subir sus datos, no cuando Bridge ya
// aprobó, así que sin este sondeo el botón se activaría antes de que fuera cierto.
const APPROVAL_POLL_INTERVAL_MS = 3000;
const APPROVAL_POLL_MAX_ATTEMPTS = 40; // ~2 minutos

function KycInner() {
  const t = useTranslations("kyc");
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "verifying" | "error" | "missing" | "done" | "pending">("loading");

  useEffect(() => {
    const email      = params.get("email");
    const wa         = params.get("wa") ?? "";
    const locale     = params.get("locale") ?? "en";
    const done       = params.get("done");
    const tosDone    = params.get("tos_done") ?? "";
    const customerId = params.get("customer_id") ?? "";

    if (done) {
      // Regresó de Persona — eso solo confirma que TERMINÓ de subir sus datos, no que
      // Bridge ya lo aprobó (esa revisión puede tardar más). Sin correo (links viejos, sin
      // el parámetro) no hay forma de confirmar — mostramos la pantalla de una vez, como
      // antes. Con correo, sondeamos /api/whatsapp/kyc-link hasta ver needs_kyc:false antes
      // de activar el botón de verdad.
      if (!email) { setStatus("done"); return; }

      let cancelled = false;
      let attempts = 0;
      setStatus("verifying");

      const poll = async () => {
        if (cancelled) return;
        attempts += 1;
        try {
          const qs = new URLSearchParams({ email, wa, locale });
          const res = await fetch(`/api/whatsapp/kyc-link?${qs}`);
          if (res.ok) {
            const data = await res.json() as { needs_kyc: boolean };
            if (!data.needs_kyc) { if (!cancelled) setStatus("done"); return; }
          }
        } catch { /* red intermitente — seguimos intentando hasta agotar los intentos */ }

        if (cancelled) return;
        if (attempts >= APPROVAL_POLL_MAX_ATTEMPTS) { setStatus("pending"); return; }
        setTimeout(poll, APPROVAL_POLL_INTERVAL_MS);
      };
      poll();

      return () => { cancelled = true; };
    }

    if (!email) { setStatus("missing"); return; }

    // customer_id (cuando el bot de WhatsApp ya resolvió/creó el cliente momentos antes)
    // evita que este endpoint tenga que volver a buscarlo por correo — la búsqueda de
    // Bridge es eventualmente consistente, así que para un cliente recién creado esa
    // segunda búsqueda puede tardar varios segundos en encontrarlo (reintentos con espera)
    // o incluso agotar el tiempo de la función, dejando esta pantalla en "Cargando…" para
    // siempre. Con el ID de por medio, /api/whatsapp/kyc-link lo busca directo, sin carrera.
    const qs = new URLSearchParams({
      email, wa, locale,
      ...(tosDone ? { tos_done: tosDone } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
    });
    fetch(`/api/whatsapp/kyc-link?${qs}`)
      .then(async (res) => {
        if (!res.ok) { setStatus("error"); return; }
        const data = await res.json() as { needs_tos: boolean; needs_kyc: boolean; tos_url?: string | null; kyc_url?: string | null };
        if (!data.needs_kyc) {
          // Already verified — nothing to do here, bot will message with next steps.
          setStatus("done");
          return;
        }
        // ToS primero para clientes nuevos en producción (Bridge lo exige antes del KYC,
        // ver providers/bridge/customers.ts) — el link de ToS ya trae ?tos_done=1 para
        // volver aquí y seguir directo a KYC.
        const nextUrl = data.needs_tos ? data.tos_url : data.kyc_url;
        if (nextUrl) window.location.replace(nextUrl);
        else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [params]);

  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER ?? "";
  const whatsAppLink = buildWhatsAppLink(t("done_prefill"), botNumber);

  // "done": Bridge ya confirmó la aprobación en vivo (o no había correo para confirmar,
  // fallback a links viejos) — el botón está realmente activo. "pending": se agotó el
  // tiempo de espera sin confirmación — igual dejamos el botón (mejor que dejar a alguien
  // varado en una pantalla web), pero el texto es honesto sobre que sigue en proceso.
  if (status === "done" || status === "pending") {
    return (
      <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
        <Image src="/icon-512.png" alt="OmniPay" width={64} height={64} className="rounded-2xl mb-5" />
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-9 h-9 text-emerald-400" />
        </div>
        <h1 className="text-white font-bold text-xl mb-2">
          {status === "done" ? t("done_title") : t("pending_title")}
        </h1>
        <p className="text-slate-400 text-sm max-w-xs mb-8">
          {status === "done" ? t("done_subtitle") : t("pending_subtitle")}
        </p>
        <a
          href={whatsAppLink}
          className="w-full max-w-xs py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <span>{t("done_cta")}</span>
          <MessageCircle className="w-5 h-5" />
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <Zap className="w-8 h-8 text-[#00C9C8] mb-4" />
      <h1 className="text-white font-bold text-xl mb-2">{t("title")}</h1>
      <p className="text-slate-400 text-sm max-w-sm">{t("subtitle")}</p>
      {status === "loading" && <p className="text-slate-500 text-xs mt-6 animate-pulse">{t("loading")}</p>}
      {status === "verifying" && <p className="text-slate-500 text-xs mt-6 animate-pulse">{t("verifying")}</p>}
      {status === "error" && <p className="text-red-400 text-xs mt-6">{t("error")}</p>}
      {status === "missing" && <p className="text-red-400 text-xs mt-6">{t("missing_params")}</p>}
    </main>
  );
}

export default function KycPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0f172a]" />}>
      <KycInner />
    </Suspense>
  );
}
