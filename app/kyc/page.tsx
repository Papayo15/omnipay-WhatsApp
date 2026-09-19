"use client";

// /kyc — thin landing page linked from the WhatsApp bot (Módulo 2).
// Does not reimplement KYC: fetches a Bridge/Persona-hosted verification URL from
// /api/whatsapp/kyc-link and redirects the browser there, same as app/enviar/page.tsx
// already does for its own KYC step (Bridge manages KYC via its Persona widget — no
// direct document-upload API exists, so we never build our own upload UI).

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";

function KycInner() {
  const t = useTranslations("kyc");
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "missing" | "done">("loading");

  useEffect(() => {
    const email      = params.get("email");
    const wa         = params.get("wa") ?? "";
    const locale     = params.get("locale") ?? "en";
    const done       = params.get("done");
    const tosDone    = params.get("tos_done") ?? "";
    const customerId = params.get("customer_id") ?? "";

    if (done) return; // returned from Persona — bot sends the confirmation via WhatsApp

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

  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <Zap className="w-8 h-8 text-[#00C9C8] mb-4" />
      <h1 className="text-white font-bold text-xl mb-2">{t("title")}</h1>
      <p className="text-slate-400 text-sm max-w-sm">{t("subtitle")}</p>
      {status === "loading" && <p className="text-slate-500 text-xs mt-6 animate-pulse">{t("loading")}</p>}
      {status === "error" && <p className="text-red-400 text-xs mt-6">{t("error")}</p>}
      {status === "missing" && <p className="text-red-400 text-xs mt-6">{t("missing_params")}</p>}
      {status === "done" && <p className="text-emerald-400 text-xs mt-6">✓</p>}
      {params.get("done") && <p className="text-emerald-400 text-xs mt-6">✓</p>}
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
