// One-shot: adds "kyc.done_title"/"done_subtitle"/"done_cta"/"done_prefill" — the
// "Volver a WhatsApp" deep-link screen shown after Persona finishes (app/kyc/page.tsx,
// ?done=1). Mobile browsers can't self-close a tab they didn't open via same-origin
// script, so this is the standard fintech pattern (Félix Pago etc.) for getting the user
// back into the chat with one tap instead of manually switching apps.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    done_title: "Identity verified!",
    done_subtitle: "Your identity has been confirmed. Go back to WhatsApp to continue your transfer.",
    done_cta: "Back to WhatsApp",
    done_prefill: "Done, I just verified my identity",
  },
  es: {
    done_title: "¡Identidad verificada!",
    done_subtitle: "Tu identidad quedó confirmada. Regresa a WhatsApp para continuar con tu envío.",
    done_cta: "Volver a WhatsApp",
    done_prefill: "Listo, ya verifiqué mi identidad",
  },
  de: {
    done_title: "Identität bestätigt!",
    done_subtitle: "Deine Identität wurde bestätigt. Geh zurück zu WhatsApp, um deine Überweisung fortzusetzen.",
    done_cta: "Zurück zu WhatsApp",
    done_prefill: "Fertig, ich habe meine Identität gerade bestätigt",
  },
  fr: {
    done_title: "Identité vérifiée !",
    done_subtitle: "Ton identité a été confirmée. Retourne sur WhatsApp pour continuer ton envoi.",
    done_cta: "Retour à WhatsApp",
    done_prefill: "C'est fait, je viens de vérifier mon identité",
  },
  it: {
    done_title: "Identità verificata!",
    done_subtitle: "La tua identità è stata confermata. Torna su WhatsApp per continuare il tuo invio.",
    done_cta: "Torna su WhatsApp",
    done_prefill: "Fatto, ho appena verificato la mia identità",
  },
  nl: {
    done_title: "Identiteit geverifieerd!",
    done_subtitle: "Je identiteit is bevestigd. Ga terug naar WhatsApp om je overboeking voort te zetten.",
    done_cta: "Terug naar WhatsApp",
    done_prefill: "Klaar, ik heb net mijn identiteit geverifieerd",
  },
  pt: {
    done_title: "Identidade verificada!",
    done_subtitle: "Sua identidade foi confirmada. Volte para o WhatsApp para continuar seu envio.",
    done_cta: "Voltar ao WhatsApp",
    done_prefill: "Pronto, acabei de verificar minha identidade",
  },
  tr: {
    done_title: "Kimlik doğrulandı!",
    done_subtitle: "Kimliğin onaylandı. Transferine devam etmek için WhatsApp'a geri dön.",
    done_cta: "WhatsApp'a dön",
    done_prefill: "Tamam, kimliğimi az önce doğruladım",
  },
  ru: {
    done_title: "Личность подтверждена!",
    done_subtitle: "Твоя личность подтверждена. Вернись в WhatsApp, чтобы продолжить перевод.",
    done_cta: "Вернуться в WhatsApp",
    done_prefill: "Готово, я только что подтвердил личность",
  },
  vi: {
    done_title: "Đã xác minh danh tính!",
    done_subtitle: "Danh tính của bạn đã được xác nhận. Quay lại WhatsApp để tiếp tục giao dịch.",
    done_cta: "Quay lại WhatsApp",
    done_prefill: "Xong, tôi vừa xác minh danh tính",
  },
  id: {
    done_title: "Identitas terverifikasi!",
    done_subtitle: "Identitas Anda telah dikonfirmasi. Kembali ke WhatsApp untuk melanjutkan transfer Anda.",
    done_cta: "Kembali ke WhatsApp",
    done_prefill: "Selesai, saya baru saja memverifikasi identitas saya",
  },
  ja: {
    done_title: "本人確認が完了しました！",
    done_subtitle: "本人確認が完了しました。送金を続けるにはWhatsAppに戻ってください。",
    done_cta: "WhatsAppに戻る",
    done_prefill: "完了しました、本人確認をしたところです",
  },
  ko: {
    done_title: "신원 확인 완료!",
    done_subtitle: "신원이 확인되었습니다. 송금을 계속하려면 WhatsApp으로 돌아가세요.",
    done_cta: "WhatsApp으로 돌아가기",
    done_prefill: "완료했어요, 방금 신원 확인을 마쳤어요",
  },
  zh: {
    done_title: "身份验证成功！",
    done_subtitle: "您的身份已确认。请返回WhatsApp继续您的汇款。",
    done_cta: "返回WhatsApp",
    done_prefill: "好了，我刚完成身份验证",
  },
  hi: {
    done_title: "पहचान सत्यापित हो गई!",
    done_subtitle: "आपकी पहचान की पुष्टि हो गई है। अपना ट्रांसफर जारी रखने के लिए WhatsApp पर वापस जाएं।",
    done_cta: "WhatsApp पर वापस जाएं",
    done_prefill: "हो गया, मैंने अभी अपनी पहचान सत्यापित की है",
  },
  ar: {
    done_title: "تم التحقق من الهوية!",
    done_subtitle: "تم تأكيد هويتك. عد إلى WhatsApp لمتابعة تحويلك.",
    done_cta: "العودة إلى WhatsApp",
    done_prefill: "تم، لقد تحققت للتو من هويتي",
  },
  am: {
    done_title: "ማንነት ተረጋግጧል!",
    done_subtitle: "ማንነትዎ ተረጋግጧል። ዝውውርዎን ለመቀጠል ወደ WhatsApp ይመለሱ።",
    done_cta: "ወደ WhatsApp ተመለስ",
    done_prefill: "ተጠናቋል፣ ማንነቴን አሁን አረጋግጫለሁ",
  },
  ha: {
    done_title: "An tabbatar da asali!",
    done_subtitle: "An tabbatar da asalinka. Koma WhatsApp don ci gaba da canja wurinka.",
    done_cta: "Koma WhatsApp",
    done_prefill: "An gama, na tabbatar da asalina yanzu",
  },
  sw: {
    done_title: "Utambulisho umethibitishwa!",
    done_subtitle: "Utambulisho wako umethibitishwa. Rudi WhatsApp kuendelea na uhamisho wako.",
    done_cta: "Rudi WhatsApp",
    done_prefill: "Nimemaliza, nimethibitisha utambulisho wangu",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.kyc = { ...json.kyc, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
