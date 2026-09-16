import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const MSG   = join(__dir, "../messages");

const REFERRAL_REWARD = {
  en: "🎁 Thanks for inviting a friend! Your next OmniPay transfer has $0 service fee.",
  es: "🎁 ¡Gracias por invitar a un amigo! Tu próximo envío en OmniPay tendrá $0 de comisión de servicio.",
  pt: "🎁 Obrigado por convidar um amigo! Seu próximo envio na OmniPay terá $0 de taxa de serviço.",
  fr: "🎁 Merci d'avoir invité un ami ! Votre prochain envoi OmniPay aura des frais de service de 0 $.",
  de: "🎁 Danke, dass Sie einen Freund eingeladen haben! Ihre nächste OmniPay-Überweisung hat 0 $ Servicegebühr.",
  it: "🎁 Grazie per aver invitato un amico! Il tuo prossimo invio OmniPay avrà $0 di commissione di servizio.",
  nl: "🎁 Bedankt voor het uitnodigen van een vriend! Je volgende OmniPay-overboeking heeft $0 servicekosten.",
  ja: "🎁 友達を招待していただきありがとうございます！次回のOmniPay送金はサービス手数料が$0になります。",
  ko: "🎁 친구를 초대해 주셔서 감사합니다! 다음 OmniPay 송금은 서비스 수수료가 $0입니다.",
  zh: "🎁 感谢您邀请朋友！您的下一笔OmniPay汇款服务费为$0。",
  hi: "🎁 दोस्त को आमंत्रित करने के लिए धन्यवाद! आपके अगले OmniPay ट्रांसफर पर $0 सेवा शुल्क होगा।",
  ar: "🎁 شكراً لدعوتك صديقاً! سيكون تحويلك التالي عبر OmniPay بدون رسوم خدمة (0$).",
  tr: "🎁 Bir arkadaşınızı davet ettiğiniz için teşekkürler! Bir sonraki OmniPay transferinizde $0 hizmet ücreti olacak.",
  ru: "🎁 Спасибо, что пригласили друга! Ваш следующий перевод через OmniPay будет без комиссии за услугу ($0).",
  vi: "🎁 Cảm ơn bạn đã mời một người bạn! Lần chuyển tiền OmniPay tiếp theo của bạn sẽ có phí dịch vụ $0.",
  id: "🎁 Terima kasih sudah mengundang teman! Transfer OmniPay Anda berikutnya akan memiliki biaya layanan $0.",
  am: "🎁 ጓደኛ ስለጋበዙ እናመሰግናለን! የሚቀጥለው የOmniPay ዝውውርዎ $0 የአገልግሎት ክፍያ ይኖረዋል።",
  ha: "🎁 Na gode da gayyatar aboki! Canja wurin OmniPay na gaba zai kasance da kuɗin sabis $0.",
  sw: "🎁 Asante kwa kualika rafiki! Uhamisho wako unaofuata wa OmniPay utakuwa na ada ya huduma ya $0.",
};

for (const [lang, text] of Object.entries(REFERRAL_REWARD)) {
  const path = join(MSG, `${lang}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp.referral_reward = text;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`✓ referral_reward → ${lang}.json`);
}
