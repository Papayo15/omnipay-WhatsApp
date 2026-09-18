import { readFileSync, writeFileSync } from "fs";
const T = {
  en: { currency_not_supported_source: "We can't yet accept deposits in {currency} for this transfer. Please try again in USD, EUR, GBP, MXN or BRL.", deposit_error: "Something went wrong generating your deposit instructions. Please reply *YES* again in a moment, or start over." },
  es: { currency_not_supported_source: "Todavía no podemos recibir depósitos en {currency} para este envío. Intenta de nuevo en USD, EUR, GBP, MXN o BRL.", deposit_error: "Algo salió mal generando tus instrucciones de depósito. Responde *SI* de nuevo en un momento, o empieza de nuevo." },
  de: { currency_not_supported_source: "Wir können für diese Überweisung noch keine Einzahlungen in {currency} annehmen. Versuche es erneut mit USD, EUR, GBP, MXN oder BRL.", deposit_error: "Beim Erstellen deiner Einzahlungsanweisungen ist etwas schiefgelaufen. Antworte gleich noch einmal mit *JA*, oder fang neu an." },
  fr: { currency_not_supported_source: "Nous ne pouvons pas encore accepter de dépôts en {currency} pour ce transfert. Réessaie en USD, EUR, GBP, MXN ou BRL.", deposit_error: "Un problème est survenu lors de la génération de tes instructions de dépôt. Réponds à nouveau *OUI* dans un instant, ou recommence." },
  it: { currency_not_supported_source: "Per ora non possiamo accettare depositi in {currency} per questo invio. Riprova con USD, EUR, GBP, MXN o BRL.", deposit_error: "Si è verificato un problema nel generare le istruzioni di deposito. Rispondi di nuovo *SI* tra un momento, oppure ricomincia." },
  nl: { currency_not_supported_source: "We kunnen voor deze overboeking nog geen stortingen in {currency} accepteren. Probeer het opnieuw met USD, EUR, GBP, MXN of BRL.", deposit_error: "Er ging iets mis bij het maken van je stortingsinstructies. Antwoord zo weer met *JA*, of begin opnieuw." },
  pt: { currency_not_supported_source: "Ainda não podemos aceitar depósitos em {currency} para este envio. Tente novamente em USD, EUR, GBP, MXN ou BRL.", deposit_error: "Algo deu errado ao gerar suas instruções de depósito. Responda *SIM* de novo em instantes, ou comece de novo." },
  tr: { currency_not_supported_source: "Bu transfer için henüz {currency} cinsinden yatırım kabul edemiyoruz. USD, EUR, GBP, MXN veya BRL ile tekrar dene.", deposit_error: "Yatırım talimatların oluşturulurken bir sorun oluştu. Biraz sonra tekrar *EVET* yaz, ya da baştan başla." },
  ru: { currency_not_supported_source: "Мы пока не можем принимать депозиты в {currency} для этого перевода. Попробуй снова в USD, EUR, GBP, MXN или BRL.", deposit_error: "Что-то пошло не так при создании инструкций для депозита. Напиши *ДА* ещё раз через минуту, либо начни заново." },
  vi: { currency_not_supported_source: "Chúng tôi chưa thể nhận tiền gửi bằng {currency} cho giao dịch này. Hãy thử lại bằng USD, EUR, GBP, MXN hoặc BRL.", deposit_error: "Đã có lỗi khi tạo hướng dẫn nạp tiền của bạn. Hãy trả lời *CÓ* lại sau một chút, hoặc bắt đầu lại." },
  id: { currency_not_supported_source: "Kami belum bisa menerima setoran dalam {currency} untuk transfer ini. Coba lagi dengan USD, EUR, GBP, MXN, atau BRL.", deposit_error: "Ada masalah saat membuat instruksi setoranmu. Balas *YA* lagi sebentar lagi, atau mulai ulang." },
  ja: { currency_not_supported_source: "この送金では{currency}での入金にまだ対応していません。USD、EUR、GBP、MXN、BRLのいずれかで再度お試しください。", deposit_error: "入金案内の作成中に問題が発生しました。少ししてからもう一度「はい」と返信するか、最初からやり直してください。" },
  ko: { currency_not_supported_source: "이 송금에서는 아직 {currency} 입금을 받을 수 없습니다. USD, EUR, GBP, MXN, BRL 중 하나로 다시 시도해 주세요.", deposit_error: "입금 안내를 만드는 중 문제가 발생했습니다. 잠시 후 다시 *예*라고 답하거나 처음부터 다시 시작해 주세요." },
  zh: { currency_not_supported_source: "此次转账暂不支持 {currency} 存款。请改用 USD、EUR、GBP、MXN 或 BRL 重试。", deposit_error: "生成存款说明时出了点问题。请稍后再回复“是”，或者重新开始。" },
  hi: { currency_not_supported_source: "इस ट्रांसफ़र के लिए हम अभी {currency} में जमा स्वीकार नहीं कर सकते। कृपया USD, EUR, GBP, MXN या BRL में फिर से कोशिश करें।", deposit_error: "आपकी जमा निर्देश बनाने में कुछ गड़बड़ हो गई। कृपया थोड़ी देर में फिर से *हाँ* लिखें, या फिर से शुरू करें।" },
  ar: { currency_not_supported_source: "لا يمكننا حالياً قبول الإيداع بعملة {currency} لهذا التحويل. جرّب مرة أخرى بعملة USD أو EUR أو GBP أو MXN أو BRL.", deposit_error: "حدث خطأ أثناء إنشاء تعليمات الإيداع الخاصة بك. أرسل *نعم* مرة أخرى بعد قليل، أو ابدأ من جديد." },
  am: { currency_not_supported_source: "ለዚህ ዝውውር በ{currency} ገቢ መቀበል ገና አንችልም። እባክዎ በ USD, EUR, GBP, MXN ወይም BRL እንደገና ይሞክሩ።", deposit_error: "የገቢ መመሪያዎን በመፍጠር ላይ ችግር ተከስቷል። እባክዎ ከጥቂት ጊዜ በኋላ እንደገና *አዎ* ይላኩ፣ ወይም ከመጀመሪያው ይጀምሩ።" },
  ha: { currency_not_supported_source: "Ba mu iya karɓar ajiya cikin {currency} don wannan canja wuri ba tukuna. Sake gwadawa da USD, EUR, GBP, MXN ko BRL.", deposit_error: "Wani abu ya faru ba daidai ba wajen ƙirƙirar umarnin ajiyar ka. Sake amsawa da *I* bayan ɗan lokaci, ko fara sabo." },
  sw: { currency_not_supported_source: "Bado hatuwezi kupokea malipo kwa {currency} kwa uhamisho huu. Jaribu tena kwa USD, EUR, GBP, MXN au BRL.", deposit_error: "Kuna hitilafu wakati wa kutengeneza maagizo yako ya malipo. Jibu tena *NDIYO* baada ya muda, au anza upya." },
};
for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
