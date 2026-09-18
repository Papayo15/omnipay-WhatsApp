// One-shot: adds "whatsapp.status_error" (generic fallback if the status lookup itself
// throws unexpectedly — Redis/API hiccup, not "order not found") across all 19 locales.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "Something went wrong checking your transfer status. Please try again in a moment.",
  es: "Algo salió mal consultando el estado de tu envío. Intenta de nuevo en un momento.",
  de: "Beim Abrufen deines Überweisungsstatus ist etwas schiefgelaufen. Bitte versuche es gleich noch einmal.",
  fr: "Un problème est survenu lors de la vérification du statut de ton envoi. Réessaie dans un instant.",
  it: "Si è verificato un problema nel controllare lo stato del tuo invio. Riprova tra un momento.",
  nl: "Er ging iets mis bij het opzoeken van je overboekingsstatus. Probeer het zo opnieuw.",
  pt: "Algo deu errado ao consultar o status do seu envio. Tente novamente em instantes.",
  tr: "Transfer durumunu kontrol ederken bir sorun oluştu. Lütfen biraz sonra tekrar dene.",
  ru: "Что-то пошло не так при проверке статуса перевода. Попробуй снова через минуту.",
  vi: "Đã có lỗi khi kiểm tra trạng thái giao dịch của bạn. Vui lòng thử lại sau một chút.",
  id: "Terjadi kesalahan saat memeriksa status transfer Anda. Coba lagi sebentar lagi.",
  ja: "送金状況の確認中に問題が発生しました。少ししてからもう一度お試しください。",
  ko: "송금 상태를 확인하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  zh: "查询汇款状态时出了点问题。请稍后再试。",
  hi: "आपके ट्रांसफर की स्थिति जांचने में कुछ गड़बड़ हो गई। कृपया थोड़ी देर में फिर से कोशिश करें।",
  ar: "حدث خطأ أثناء التحقق من حالة تحويلك. حاول مرة أخرى بعد قليل.",
  am: "የዝውውርዎን ሁኔታ በማጣራት ላይ ችግር ተከስቷል። እባክዎ ከጥቂት ጊዜ በኋላ እንደገና ይሞክሩ።",
  ha: "Wani abu ya faru ba daidai ba wajen bincika matsayin canja wurinka. Sake gwadawa bayan ɗan lokaci.",
  sw: "Kuna hitilafu wakati wa kukagua hali ya uhamisho wako. Tafadhali jaribu tena baada ya muda.",
};

for (const [locale, status_error] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, status_error };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
