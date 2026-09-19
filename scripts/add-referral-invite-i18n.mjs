// One-shot: adds "whatsapp.referral_invite_message" — the PRE-FILLED text a friend sends
// to the bot's own WhatsApp number when they tap the referral link (wa.me deep link, not
// a web URL). Carries "REF:<referrer waId>" so the bot captures it on first contact.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "Hi! A friend told me about OmniPay for sending money abroad 🌍 REF:{ref}",
  es: "¡Hola! Un amigo me habló de OmniPay para enviar dinero al extranjero 🌍 REF:{ref}",
  de: "Hallo! Ein Freund hat mir von OmniPay erzählt, um Geld ins Ausland zu senden 🌍 REF:{ref}",
  fr: "Bonjour ! Un ami m'a parlé d'OmniPay pour envoyer de l'argent à l'étranger 🌍 REF:{ref}",
  it: "Ciao! Un amico mi ha parlato di OmniPay per inviare denaro all'estero 🌍 REF:{ref}",
  nl: "Hoi! Een vriend vertelde me over OmniPay om geld naar het buitenland te sturen 🌍 REF:{ref}",
  pt: "Olá! Um amigo me falou sobre a OmniPay para enviar dinheiro para o exterior 🌍 REF:{ref}",
  tr: "Merhaba! Bir arkadaşım yurt dışına para göndermek için OmniPay'den bahsetti 🌍 REF:{ref}",
  ru: "Привет! Друг рассказал мне про OmniPay для отправки денег за границу 🌍 REF:{ref}",
  vi: "Xin chào! Một người bạn giới thiệu tôi về OmniPay để gửi tiền ra nước ngoài 🌍 REF:{ref}",
  id: "Hai! Seorang teman memberi tahu saya tentang OmniPay untuk kirim uang ke luar negeri 🌍 REF:{ref}",
  ja: "こんにちは！友人から海外送金にOmniPayを教えてもらいました 🌍 REF:{ref}",
  ko: "안녕하세요! 친구가 해외 송금에 OmniPay를 추천해줬어요 🌍 REF:{ref}",
  zh: "你好！朋友向我推荐了OmniPay用于海外汇款 🌍 REF:{ref}",
  hi: "नमस्ते! एक दोस्त ने मुझे विदेश पैसे भेजने के लिए OmniPay के बारे में बताया 🌍 REF:{ref}",
  ar: "مرحباً! أخبرني صديق عن OmniPay لإرسال الأموال إلى الخارج 🌍 REF:{ref}",
  am: "ሰላም! አንድ ጓደኛዬ ወደ ውጭ ገንዘብ ለመላክ ስለ OmniPay ነግሮኛል 🌍 REF:{ref}",
  ha: "Sannu! Wani aboki ya gaya mini game da OmniPay don aika kuɗi zuwa ƙasashen waje 🌍 REF:{ref}",
  sw: "Habari! Rafiki alinieleza kuhusu OmniPay kwa kutuma pesa nje ya nchi 🌍 REF:{ref}",
};

for (const [locale, referral_invite_message] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, referral_invite_message };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
