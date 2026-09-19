// One-shot: adds "whatsapp.referral_share_prompt" — sent right after a successful SI
// confirmation, giving the sender their own referral link to forward to friends. Always
// free text (sent seconds after they wrote "SI", so always inside their own 24h window).
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "🎁 Know someone who also sends money abroad? Share this link — when they complete their first transfer, you get your next transfer with $0 service fee:\n\n{link}",
  es: "🎁 ¿Conoces a alguien que también envía dinero al extranjero? Comparte este link — cuando complete su primer envío, tú ganas tu próximo envío con $0 de comisión de servicio:\n\n{link}",
  de: "🎁 Kennst du jemanden, der auch Geld ins Ausland sendet? Teile diesen Link — sobald diese Person ihre erste Überweisung abschließt, bekommst du deine nächste Überweisung ohne Servicegebühr:\n\n{link}",
  fr: "🎁 Tu connais quelqu'un qui envoie aussi de l'argent à l'étranger ? Partage ce lien — dès qu'il/elle complète son premier envoi, tu obtiens ton prochain envoi sans frais de service :\n\n{link}",
  it: "🎁 Conosci qualcuno che invia anche denaro all'estero? Condividi questo link — quando completa il suo primo invio, tu ottieni il tuo prossimo invio senza commissione di servizio:\n\n{link}",
  nl: "🎁 Ken je iemand die ook geld naar het buitenland stuurt? Deel deze link — zodra die persoon zijn eerste overboeking voltooit, krijg jij je volgende overboeking zonder servicekosten:\n\n{link}",
  pt: "🎁 Conhece alguém que também envia dinheiro para o exterior? Compartilhe este link — quando essa pessoa concluir o primeiro envio, você ganha seu próximo envio sem taxa de serviço:\n\n{link}",
  tr: "🎁 Yurt dışına para gönderen birini tanıyor musun? Bu bağlantıyı paylaş — o kişi ilk transferini tamamladığında, bir sonraki transferin hizmet ücreti olmadan olur:\n\n{link}",
  ru: "🎁 Знаешь кого-то, кто тоже отправляет деньги за границу? Поделись этой ссылкой — как только этот человек завершит свой первый перевод, твой следующий перевод будет без комиссии за сервис:\n\n{link}",
  vi: "🎁 Bạn có biết ai đó cũng gửi tiền ra nước ngoài không? Chia sẻ liên kết này — khi họ hoàn tất lần chuyển tiền đầu tiên, lần chuyển tiền tiếp theo của bạn sẽ không mất phí dịch vụ:\n\n{link}",
  id: "🎁 Kenal seseorang yang juga mengirim uang ke luar negeri? Bagikan tautan ini — begitu mereka menyelesaikan transfer pertama, transfer berikutnya Anda gratis biaya layanan:\n\n{link}",
  ja: "🎁 海外送金する知り合いはいますか？このリンクをシェアしてください — その方が初めての送金を完了すると、あなたの次回の送金は手数料無料になります：\n\n{link}",
  ko: "🎁 해외로 송금하는 지인이 있으신가요? 이 링크를 공유해 보세요 — 그분이 첫 송금을 완료하면, 당신의 다음 송금은 서비스 수수료가 무료가 됩니다:\n\n{link}",
  zh: "🎁 认识也需要往国外汇款的朋友吗？分享这个链接——对方完成第一次汇款后，你的下一次汇款将免服务费：\n\n{link}",
  hi: "🎁 क्या आप किसी ऐसे व्यक्ति को जानते हैं जो विदेश पैसे भेजता है? यह लिंक शेयर करें — जब वे अपना पहला ट्रांसफर पूरा करेंगे, तो आपका अगला ट्रांसफर सेवा शुल्क के बिना होगा:\n\n{link}",
  ar: "🎁 هل تعرف شخصاً يرسل أيضاً أموالاً إلى الخارج؟ شارك هذا الرابط — عندما يكمل تحويله الأول، ستحصل على تحويلك التالي بدون رسوم خدمة:\n\n{link}",
  am: "🎁 ወደ ውጭ ገንዘብ የሚልክ ሰው ያውቃሉ? ይህን አገናኝ ያጋሩ — የመጀመሪያ ዝውውራቸውን ሲያጠናቅቁ፣ የሚቀጥለው ዝውውርዎ ያለ አገልግሎት ክፍያ ይሆናል፦\n\n{link}",
  ha: "🎁 Ka san wani wanda kuma yake aika kuɗi zuwa ƙasashen waje? Raba wannan hanyar haɗi — da zarar ya kammala canja wurinsa na farko, canja wurin ka na gaba zai kasance ba tare da kuɗin sabis ba:\n\n{link}",
  sw: "🎁 Unamjua mtu ambaye pia anatuma pesa nje ya nchi? Shiriki kiungo hiki — mara tu akikamilisha uhamisho wake wa kwanza, uhamisho wako ujao utakuwa bila ada ya huduma:\n\n{link}",
};

for (const [locale, referral_share_prompt] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, referral_share_prompt };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
