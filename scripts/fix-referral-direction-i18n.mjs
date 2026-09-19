// One-shot: fixes "referral_share_prompt" and "referral_invite_message" — both assumed
// the friend is also SENDING money abroad, but the referred person could just as well be
// someone in Mexico who needs a friend/family member abroad to send THEM money via
// OmniPay. Rewritten direction-agnostic: "anyone OmniPay would be useful for", not
// "someone who also sends money abroad".
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    referral_share_prompt: "🎁 Know someone OmniPay could help? Share this link — when they complete their first transfer, you get your next transfer with $0 service fee:\n\n{link}",
    referral_invite_message: "Hi! A friend recommended OmniPay to me 🌍 REF:{ref}",
  },
  es: {
    referral_share_prompt: "🎁 ¿Conoces a alguien a quien le sirva OmniPay? Comparte este link — cuando complete su primer envío, tú ganas tu próximo envío con $0 de comisión de servicio:\n\n{link}",
    referral_invite_message: "¡Hola! Un amigo me recomendó OmniPay 🌍 REF:{ref}",
  },
  de: {
    referral_share_prompt: "🎁 Kennst du jemanden, dem OmniPay helfen könnte? Teile diesen Link — sobald diese Person ihre erste Überweisung abschließt, bekommst du deine nächste Überweisung ohne Servicegebühr:\n\n{link}",
    referral_invite_message: "Hallo! Ein Freund hat mir OmniPay empfohlen 🌍 REF:{ref}",
  },
  fr: {
    referral_share_prompt: "🎁 Tu connais quelqu'un à qui OmniPay pourrait être utile ? Partage ce lien — dès qu'il/elle complète son premier envoi, tu obtiens ton prochain envoi sans frais de service :\n\n{link}",
    referral_invite_message: "Bonjour ! Un ami m'a recommandé OmniPay 🌍 REF:{ref}",
  },
  it: {
    referral_share_prompt: "🎁 Conosci qualcuno a cui potrebbe servire OmniPay? Condividi questo link — quando completa il suo primo invio, tu ottieni il tuo prossimo invio senza commissione di servizio:\n\n{link}",
    referral_invite_message: "Ciao! Un amico mi ha consigliato OmniPay 🌍 REF:{ref}",
  },
  nl: {
    referral_share_prompt: "🎁 Ken je iemand voor wie OmniPay handig zou zijn? Deel deze link — zodra die persoon zijn eerste overboeking voltooit, krijg jij je volgende overboeking zonder servicekosten:\n\n{link}",
    referral_invite_message: "Hoi! Een vriend heeft me OmniPay aangeraden 🌍 REF:{ref}",
  },
  pt: {
    referral_share_prompt: "🎁 Conhece alguém para quem a OmniPay seria útil? Compartilhe este link — quando essa pessoa concluir o primeiro envio, você ganha seu próximo envio sem taxa de serviço:\n\n{link}",
    referral_invite_message: "Olá! Um amigo me recomendou a OmniPay 🌍 REF:{ref}",
  },
  tr: {
    referral_share_prompt: "🎁 OmniPay'in işine yarayacağı birini tanıyor musun? Bu bağlantıyı paylaş — o kişi ilk transferini tamamladığında, bir sonraki transferin hizmet ücreti olmadan olur:\n\n{link}",
    referral_invite_message: "Merhaba! Bir arkadaşım bana OmniPay'i önerdi 🌍 REF:{ref}",
  },
  ru: {
    referral_share_prompt: "🎁 Знаешь кого-то, кому пригодился бы OmniPay? Поделись этой ссылкой — как только этот человек завершит свой первый перевод, твой следующий перевод будет без комиссии за сервис:\n\n{link}",
    referral_invite_message: "Привет! Друг порекомендовал мне OmniPay 🌍 REF:{ref}",
  },
  vi: {
    referral_share_prompt: "🎁 Bạn có biết ai đó có thể cần OmniPay không? Chia sẻ liên kết này — khi họ hoàn tất lần chuyển tiền đầu tiên, lần chuyển tiền tiếp theo của bạn sẽ không mất phí dịch vụ:\n\n{link}",
    referral_invite_message: "Xin chào! Một người bạn đã giới thiệu OmniPay cho tôi 🌍 REF:{ref}",
  },
  id: {
    referral_share_prompt: "🎁 Kenal seseorang yang mungkin butuh OmniPay? Bagikan tautan ini — begitu mereka menyelesaikan transfer pertama, transfer berikutnya Anda gratis biaya layanan:\n\n{link}",
    referral_invite_message: "Hai! Seorang teman merekomendasikan OmniPay kepada saya 🌍 REF:{ref}",
  },
  ja: {
    referral_share_prompt: "🎁 OmniPayが役立ちそうな知り合いはいますか？このリンクをシェアしてください — その方が初めての送金を完了すると、あなたの次回の送金は手数料無料になります：\n\n{link}",
    referral_invite_message: "こんにちは！友人からOmniPayを勧められました 🌍 REF:{ref}",
  },
  ko: {
    referral_share_prompt: "🎁 OmniPay가 도움이 될 만한 지인이 있으신가요? 이 링크를 공유해 보세요 — 그분이 첫 송금을 완료하면, 당신의 다음 송금은 서비스 수수료가 무료가 됩니다:\n\n{link}",
    referral_invite_message: "안녕하세요! 친구가 OmniPay를 추천해줬어요 🌍 REF:{ref}",
  },
  zh: {
    referral_share_prompt: "🎁 认识可能需要OmniPay的人吗？分享这个链接——对方完成第一次汇款后，你的下一次汇款将免服务费：\n\n{link}",
    referral_invite_message: "你好！朋友向我推荐了OmniPay 🌍 REF:{ref}",
  },
  hi: {
    referral_share_prompt: "🎁 क्या आप किसी ऐसे व्यक्ति को जानते हैं जिसे OmniPay काम आ सकता है? यह लिंक शेयर करें — जब वे अपना पहला ट्रांसफर पूरा करेंगे, तो आपका अगला ट्रांसफर सेवा शुल्क के बिना होगा:\n\n{link}",
    referral_invite_message: "नमस्ते! एक दोस्त ने मुझे OmniPay की सिफारिश की 🌍 REF:{ref}",
  },
  ar: {
    referral_share_prompt: "🎁 هل تعرف شخصاً قد يفيده OmniPay؟ شارك هذا الرابط — عندما يكمل تحويله الأول، ستحصل على تحويلك التالي بدون رسوم خدمة:\n\n{link}",
    referral_invite_message: "مرحباً! أوصاني صديق بـ OmniPay 🌍 REF:{ref}",
  },
  am: {
    referral_share_prompt: "🎁 OmniPay የሚጠቅመው ሰው ያውቃሉ? ይህን አገናኝ ያጋሩ — የመጀመሪያ ዝውውራቸውን ሲያጠናቅቁ፣ የሚቀጥለው ዝውውርዎ ያለ አገልግሎት ክፍያ ይሆናል፦\n\n{link}",
    referral_invite_message: "ሰላም! አንድ ጓደኛዬ OmniPay መክሮኛል 🌍 REF:{ref}",
  },
  ha: {
    referral_share_prompt: "🎁 Ka san wani wanda OmniPay zai iya taimaka masa? Raba wannan hanyar haɗi — da zarar ya kammala canja wurinsa na farko, canja wurin ka na gaba zai kasance ba tare da kuɗin sabis ba:\n\n{link}",
    referral_invite_message: "Sannu! Wani aboki ya ba ni shawarar OmniPay 🌍 REF:{ref}",
  },
  sw: {
    referral_share_prompt: "🎁 Unamjua mtu ambaye OmniPay inaweza kumsaidia? Shiriki kiungo hiki — mara tu akikamilisha uhamisho wake wa kwanza, uhamisho wako ujao utakuwa bila ada ya huduma:\n\n{link}",
    referral_invite_message: "Habari! Rafiki alinipendekeza OmniPay 🌍 REF:{ref}",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
