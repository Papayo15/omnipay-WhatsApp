// One-shot: adds "kyc.verifying"/"pending_title"/"pending_subtitle" — the real-approval
// polling state added to app/kyc/page.tsx. "verifying" shows while we poll Bridge after
// Persona returns the browser (Persona returns as soon as the user finishes SUBMITTING,
// not once Bridge has actually approved — those are different moments). "pending_*" is the
// honest fallback if polling times out (~2 min) without confirmation.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    verifying: "Confirming your approval with Bridge…",
    pending_title: "Almost there",
    pending_subtitle: "We're still confirming your verification. Go back to WhatsApp — we'll message you there as soon as it's ready.",
  },
  es: {
    verifying: "Confirmando tu aprobación con Bridge…",
    pending_title: "Casi listo",
    pending_subtitle: "Seguimos confirmando tu verificación. Regresa a WhatsApp — te avisamos ahí en cuanto esté lista.",
  },
  de: {
    verifying: "Deine Genehmigung wird mit Bridge bestätigt…",
    pending_title: "Fast geschafft",
    pending_subtitle: "Wir bestätigen deine Verifizierung noch. Geh zurück zu WhatsApp — wir melden uns dort, sobald sie fertig ist.",
  },
  fr: {
    verifying: "Confirmation de ton approbation auprès de Bridge…",
    pending_title: "Presque fini",
    pending_subtitle: "On confirme encore ta vérification. Retourne sur WhatsApp — on te préviendra là-bas dès que ce sera prêt.",
  },
  it: {
    verifying: "Confermando la tua approvazione con Bridge…",
    pending_title: "Quasi fatto",
    pending_subtitle: "Stiamo ancora confermando la tua verifica. Torna su WhatsApp — ti avviseremo lì appena sarà pronta.",
  },
  nl: {
    verifying: "Je goedkeuring wordt bevestigd bij Bridge…",
    pending_title: "Bijna klaar",
    pending_subtitle: "We bevestigen je verificatie nog. Ga terug naar WhatsApp — we laten het je daar weten zodra het klaar is.",
  },
  pt: {
    verifying: "Confirmando sua aprovação com a Bridge…",
    pending_title: "Quase lá",
    pending_subtitle: "Ainda estamos confirmando sua verificação. Volte para o WhatsApp — avisamos por lá assim que estiver pronta.",
  },
  tr: {
    verifying: "Onayın Bridge ile doğrulanıyor…",
    pending_title: "Neredeyse tamam",
    pending_subtitle: "Doğrulamanı hâlâ onaylıyoruz. WhatsApp'a geri dön — hazır olduğunda orada haber vereceğiz.",
  },
  ru: {
    verifying: "Подтверждаем твоё одобрение через Bridge…",
    pending_title: "Почти готово",
    pending_subtitle: "Мы всё ещё подтверждаем твою верификацию. Вернись в WhatsApp — сообщим тебе там, как только всё будет готово.",
  },
  vi: {
    verifying: "Đang xác nhận sự chấp thuận của bạn với Bridge…",
    pending_title: "Sắp xong rồi",
    pending_subtitle: "Chúng tôi vẫn đang xác nhận việc xác minh của bạn. Quay lại WhatsApp — chúng tôi sẽ báo cho bạn ở đó ngay khi sẵn sàng.",
  },
  id: {
    verifying: "Mengonfirmasi persetujuan Anda dengan Bridge…",
    pending_title: "Hampir selesai",
    pending_subtitle: "Kami masih mengonfirmasi verifikasi Anda. Kembali ke WhatsApp — kami akan memberi tahu Anda di sana begitu siap.",
  },
  ja: {
    verifying: "Bridgeで承認を確認しています…",
    pending_title: "もう少しです",
    pending_subtitle: "本人確認をまだ確認中です。WhatsAppに戻ってください — 準備ができ次第そちらでお知らせします。",
  },
  ko: {
    verifying: "Bridge에서 승인을 확인하는 중…",
    pending_title: "거의 다 됐어요",
    pending_subtitle: "아직 확인을 진행 중입니다. WhatsApp으로 돌아가세요 — 준비되는 대로 그곳에서 알려드릴게요.",
  },
  zh: {
    verifying: "正在通过Bridge确认您的审批…",
    pending_title: "快好了",
    pending_subtitle: "我们仍在确认您的验证。请返回WhatsApp——准备好后我们会在那里通知您。",
  },
  hi: {
    verifying: "Bridge के साथ आपकी स्वीकृति की पुष्टि हो रही है…",
    pending_title: "लगभग हो गया",
    pending_subtitle: "हम अभी भी आपके सत्यापन की पुष्टि कर रहे हैं। WhatsApp पर वापस जाएं — तैयार होते ही हम आपको वहां बताएंगे।",
  },
  ar: {
    verifying: "جارٍ تأكيد موافقتك مع Bridge…",
    pending_title: "أوشكنا على الانتهاء",
    pending_subtitle: "لا نزال نؤكد عملية التحقق الخاصة بك. عد إلى WhatsApp — سنخبرك هناك بمجرد أن تصبح جاهزة.",
  },
  am: {
    verifying: "ከ Bridge ጋር ማረጋገጫዎን በማረጋገጥ ላይ…",
    pending_title: "ሊጠናቀቅ ተቃርቧል",
    pending_subtitle: "ማረጋገጫዎን አሁንም እያረጋገጥን ነው። ወደ WhatsApp ይመለሱ — ዝግጁ ሲሆን እዚያ እናሳውቅዎታለን።",
  },
  ha: {
    verifying: "Ana tabbatar da amincewarka tare da Bridge…",
    pending_title: "Kusan ƙarewa",
    pending_subtitle: "Muna ci gaba da tabbatar da tabbaci naka. Koma WhatsApp — za mu sanar da kai a can da zarar ya shirya.",
  },
  sw: {
    verifying: "Tunathibitisha idhini yako na Bridge…",
    pending_title: "Karibu kumaliza",
    pending_subtitle: "Bado tunathibitisha uthibitisho wako. Rudi WhatsApp — tutakujulisha huko mara tu ikiwa tayari.",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.kyc = { ...json.kyc, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
