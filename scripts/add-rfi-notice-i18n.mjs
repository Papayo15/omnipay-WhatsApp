// One-shot: adds "rfi_pending_notice" to the "whatsapp" namespace — sent when Bridge opens
// an RFI (Request For Information) asking for more data to complete a customer's
// verification. Generic for now (doesn't name the specific missing field yet — that needs
// parsing each requested_item type and round-tripping the answer to Bridge, a future step).
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: "🔎 Bridge necesita un dato más para terminar de verificar tu cuenta. En breve te contactamos con los detalles — mientras tanto no hace falta que hagas nada.",
  en: "🔎 Bridge needs one more piece of information to finish verifying your account. We'll reach out shortly with the details — no action needed from you right now.",
  de: "🔎 Bridge benötigt noch eine Information, um dein Konto zu verifizieren. Wir melden uns in Kürze mit den Details — im Moment musst du nichts tun.",
  fr: "🔎 Bridge a besoin d'une information supplémentaire pour terminer la vérification de ton compte. On te recontacte bientôt avec les détails — rien à faire de ton côté pour l'instant.",
  it: "🔎 Bridge ha bisogno di un'informazione in più per completare la verifica del tuo account. Ti contatteremo presto con i dettagli — per ora non devi fare nulla.",
  nl: "🔎 Bridge heeft nog één gegeven nodig om je account te verifiëren. We nemen binnenkort contact op met de details — voorlopig hoef je niets te doen.",
  pt: "🔎 A Bridge precisa de mais um dado para terminar de verificar sua conta. Em breve entraremos em contato com os detalhes — por enquanto você não precisa fazer nada.",
  tr: "🔎 Bridge, hesabını doğrulamayı tamamlamak için bir bilgi daha istiyor. Kısa süre içinde detaylarla sana ulaşacağız — şu an senin yapman gereken bir şey yok.",
  ru: "🔎 Bridge нужен ещё один документ или данные, чтобы завершить верификацию твоего аккаунта. Скоро свяжемся с подробностями — пока ничего делать не нужно.",
  vi: "🔎 Bridge cần thêm một thông tin để hoàn tất việc xác minh tài khoản của bạn. Chúng tôi sẽ liên hệ sớm với chi tiết — hiện tại bạn không cần làm gì cả.",
  id: "🔎 Bridge memerlukan satu informasi lagi untuk menyelesaikan verifikasi akun Anda. Kami akan segera menghubungi Anda dengan detailnya — untuk saat ini Anda tidak perlu melakukan apa pun.",
  ja: "🔎 アカウントの確認を完了するために、Bridgeがもう一つ情報を必要としています。詳細は追ってご連絡します — 今は特に何もしていただく必要はありません。",
  ko: "🔎 Bridge에서 계정 확인을 완료하기 위해 추가 정보가 필요합니다. 곧 자세한 내용을 안내해 드릴게요 — 지금은 따로 하실 일이 없습니다.",
  zh: "🔎 Bridge 需要补充一项信息才能完成您账户的验证。我们会尽快联系您说明详情——目前您无需做任何事情。",
  hi: "🔎 आपके खाते का सत्यापन पूरा करने के लिए Bridge को एक और जानकारी चाहिए। हम जल्द ही विवरण के साथ आपसे संपर्क करेंगे — अभी आपको कुछ करने की ज़रूरत नहीं है।",
  ar: "🔎 يحتاج Bridge إلى معلومة إضافية لإكمال التحقق من حسابك. سنتواصل معك قريبًا بالتفاصيل — لا حاجة لفعل أي شيء الآن.",
  am: "🔎 መለያዎን ለማረጋገጥ Bridge ተጨማሪ መረጃ ያስፈልገዋል። በቅርቡ ዝርዝሩን ይዘን እናገኝዎታለን — አሁን የሚያደርጉት ነገር የለም።",
  ha: "🔎 Bridge yana bukatar wata ƙarin bayani don kammala tabbatar da asusunka. Za mu tuntube ka ba da daɗewa ba da cikakkun bayanai — a yanzu babu abin da za ka yi.",
  sw: "🔎 Bridge inahitaji taarifa moja zaidi ili kumaliza kuthibitisha akaunti yako. Tutawasiliana nawe hivi karibuni na maelezo — kwa sasa huhitaji kufanya lolote.",
};

for (const [locale, text] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp.rfi_pending_notice = text;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
