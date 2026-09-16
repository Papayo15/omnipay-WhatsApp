// Adds "pruebaExpress" namespace (Módulo 5 — app/prueba-express/page.tsx) to all 19 message files
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const MSG   = join(__dir, "../messages");

const TRANSLATIONS = {
  en: {
    title: "Try OmniPay with $10",
    subtitle: "See for yourself how fast SPEI delivery to Mexico is — no big commitment, just $10.",
    cta: "Send $10 now",
    share_title: "Share OmniPay",
    share_whatsapp: "Share on WhatsApp",
    share_facebook: "Share on Facebook",
    footnote: "Same rates and speed as any transfer — this is just a low-risk way to try it.",
  },
  es: {
    title: "Prueba OmniPay con $10",
    subtitle: "Comprueba tú mismo qué tan rápida es la entrega SPEI a México — sin compromiso grande, solo $10.",
    cta: "Enviar $10 ahora",
    share_title: "Comparte OmniPay",
    share_whatsapp: "Compartir por WhatsApp",
    share_facebook: "Compartir en Facebook",
    footnote: "Misma tasa y velocidad que cualquier envío — esta es solo una forma de bajo riesgo para probarlo.",
  },
  pt: {
    title: "Experimente a OmniPay com $10",
    subtitle: "Veja você mesmo quão rápida é a entrega via SPEI para o México — sem compromisso grande, apenas $10.",
    cta: "Enviar $10 agora",
    share_title: "Compartilhe a OmniPay",
    share_whatsapp: "Compartilhar no WhatsApp",
    share_facebook: "Compartilhar no Facebook",
    footnote: "Mesma taxa e velocidade de qualquer envio — esta é só uma forma de baixo risco de testar.",
  },
  fr: {
    title: "Essayez OmniPay avec 10 $",
    subtitle: "Constatez par vous-même la rapidité de livraison SPEI vers le Mexique — sans grand engagement, juste 10 $.",
    cta: "Envoyer 10 $ maintenant",
    share_title: "Partagez OmniPay",
    share_whatsapp: "Partager sur WhatsApp",
    share_facebook: "Partager sur Facebook",
    footnote: "Même taux et même vitesse que n'importe quel envoi — c'est juste un moyen à faible risque de l'essayer.",
  },
  de: {
    title: "Testen Sie OmniPay mit 10 $",
    subtitle: "Überzeugen Sie sich selbst, wie schnell die SPEI-Zustellung nach Mexiko ist — ohne große Verpflichtung, nur 10 $.",
    cta: "Jetzt 10 $ senden",
    share_title: "OmniPay teilen",
    share_whatsapp: "Auf WhatsApp teilen",
    share_facebook: "Auf Facebook teilen",
    footnote: "Gleicher Kurs und gleiche Geschwindigkeit wie jede Überweisung — dies ist nur eine risikoarme Möglichkeit, es auszuprobieren.",
  },
  it: {
    title: "Prova OmniPay con $10",
    subtitle: "Scopri di persona quanto è veloce la consegna SPEI in Messico — senza grande impegno, solo $10.",
    cta: "Invia $10 ora",
    share_title: "Condividi OmniPay",
    share_whatsapp: "Condividi su WhatsApp",
    share_facebook: "Condividi su Facebook",
    footnote: "Stesso tasso e stessa velocità di qualsiasi invio — questo è solo un modo a basso rischio per provarlo.",
  },
  nl: {
    title: "Probeer OmniPay met $10",
    subtitle: "Zie zelf hoe snel SPEI-levering naar Mexico is — geen grote verplichting, gewoon $10.",
    cta: "Stuur nu $10",
    share_title: "Deel OmniPay",
    share_whatsapp: "Delen via WhatsApp",
    share_facebook: "Delen op Facebook",
    footnote: "Zelfde tarief en snelheid als elke overboeking — dit is gewoon een risicoarme manier om het te proberen.",
  },
  ja: {
    title: "10ドルでOmniPayを試す",
    subtitle: "メキシコへのSPEI送金がどれだけ速いか、ご自身で確認してください — 大きなコミットメントは不要、わずか10ドルです。",
    cta: "今すぐ10ドルを送る",
    share_title: "OmniPayをシェア",
    share_whatsapp: "WhatsAppでシェア",
    share_facebook: "Facebookでシェア",
    footnote: "通常の送金と同じレートと速度です — これは低リスクで試せる方法です。",
  },
  ko: {
    title: "$10로 OmniPay 체험하기",
    subtitle: "멕시코로의 SPEI 송금이 얼마나 빠른지 직접 확인하세요 — 큰 부담 없이, 단돈 $10.",
    cta: "지금 $10 보내기",
    share_title: "OmniPay 공유하기",
    share_whatsapp: "WhatsApp으로 공유",
    share_facebook: "Facebook에 공유",
    footnote: "일반 송금과 동일한 환율과 속도입니다 — 부담 없이 체험해 보세요.",
  },
  zh: {
    title: "用$10体验OmniPay",
    subtitle: "亲自体验SPEI汇款到墨西哥有多快——无需大额投入，只需$10。",
    cta: "立即发送$10",
    share_title: "分享OmniPay",
    share_whatsapp: "分享到WhatsApp",
    share_facebook: "分享到Facebook",
    footnote: "与任何汇款相同的汇率和速度——这只是低风险的体验方式。",
  },
  hi: {
    title: "$10 के साथ OmniPay आज़माएं",
    subtitle: "खुद देखें कि मेक्सिको में SPEI डिलीवरी कितनी तेज़ है — बड़ी प्रतिबद्धता नहीं, बस $10।",
    cta: "अभी $10 भेजें",
    share_title: "OmniPay साझा करें",
    share_whatsapp: "WhatsApp पर साझा करें",
    share_facebook: "Facebook पर साझा करें",
    footnote: "किसी भी ट्रांसफर जैसी ही दर और गति — यह इसे आज़माने का एक कम जोखिम वाला तरीका है।",
  },
  ar: {
    title: "جرّب OmniPay بـ 10 دولارات",
    subtitle: "شاهد بنفسك مدى سرعة التسليم عبر SPEI إلى المكسيك — بدون التزام كبير، فقط 10 دولارات.",
    cta: "أرسل 10 دولارات الآن",
    share_title: "شارك OmniPay",
    share_whatsapp: "شارك على WhatsApp",
    share_facebook: "شارك على Facebook",
    footnote: "نفس السعر والسرعة لأي تحويل — هذه مجرد طريقة منخفضة المخاطر لتجربتها.",
  },
  tr: {
    title: "OmniPay'i 10 $ ile deneyin",
    subtitle: "Meksika'ya SPEI teslimatının ne kadar hızlı olduğunu kendiniz görün — büyük bir taahhüt yok, sadece 10 $.",
    cta: "Şimdi 10 $ gönder",
    share_title: "OmniPay'i paylaş",
    share_whatsapp: "WhatsApp'ta paylaş",
    share_facebook: "Facebook'ta paylaş",
    footnote: "Herhangi bir transferle aynı kur ve hız — bu sadece düşük riskli bir deneme yöntemi.",
  },
  ru: {
    title: "Попробуйте OmniPay всего за $10",
    subtitle: "Убедитесь сами, насколько быстро происходит доставка SPEI в Мексику — без больших обязательств, всего $10.",
    cta: "Отправить $10 сейчас",
    share_title: "Поделиться OmniPay",
    share_whatsapp: "Поделиться в WhatsApp",
    share_facebook: "Поделиться в Facebook",
    footnote: "Тот же курс и скорость, что и при любом переводе — это просто низкорисковый способ попробовать.",
  },
  vi: {
    title: "Dùng thử OmniPay với $10",
    subtitle: "Tự mình xem tốc độ giao dịch SPEI đến Mexico nhanh như thế nào — không cần cam kết lớn, chỉ $10.",
    cta: "Gửi $10 ngay",
    share_title: "Chia sẻ OmniPay",
    share_whatsapp: "Chia sẻ trên WhatsApp",
    share_facebook: "Chia sẻ trên Facebook",
    footnote: "Cùng tỷ giá và tốc độ như bất kỳ giao dịch nào — đây chỉ là cách ít rủi ro để dùng thử.",
  },
  id: {
    title: "Coba OmniPay dengan $10",
    subtitle: "Lihat sendiri betapa cepatnya pengiriman SPEI ke Meksiko — tanpa komitmen besar, cukup $10.",
    cta: "Kirim $10 sekarang",
    share_title: "Bagikan OmniPay",
    share_whatsapp: "Bagikan di WhatsApp",
    share_facebook: "Bagikan di Facebook",
    footnote: "Kurs dan kecepatan yang sama seperti transfer lainnya — ini hanya cara berisiko rendah untuk mencobanya.",
  },
  am: {
    title: "OmniPayን በ$10 ይሞክሩ",
    subtitle: "ወደ ሜክሲኮ የSPEI ማድረስ ምን ያህል ፈጣን እንደሆነ በራስዎ ይመልከቱ — ትልቅ ቁርጠኝነት አያስፈልግም፣ $10 ብቻ።",
    cta: "አሁን $10 ይላኩ",
    share_title: "OmniPayን ያጋሩ",
    share_whatsapp: "በWhatsApp ያጋሩ",
    share_facebook: "በFacebook ያጋሩ",
    footnote: "እንደ ማንኛውም ዝውውር ተመሳሳይ ተመን እና ፍጥነት — ይህ ዝቅተኛ አደጋ ያለው መንገድ ለመሞከር ብቻ ነው።",
  },
  ha: {
    title: "Gwada OmniPay da $10",
    subtitle: "Ka gani da kanka yadda isar da SPEI zuwa Mexico take da sauri — babu babban alkawari, dala 10 kawai.",
    cta: "Aika $10 yanzu",
    share_title: "Raba OmniPay",
    share_whatsapp: "Raba akan WhatsApp",
    share_facebook: "Raba akan Facebook",
    footnote: "Farashi da sauri iri ɗaya da kowane canja wuri — wannan hanya ce mai ƙarancin haɗari kawai don gwada ta.",
  },
  sw: {
    title: "Jaribu OmniPay kwa $10",
    subtitle: "Jionee mwenyewe jinsi uwasilishaji wa SPEI kwenda Mexico ulivyo haraka — bila ahadi kubwa, $10 tu.",
    cta: "Tuma $10 sasa",
    share_title: "Shiriki OmniPay",
    share_whatsapp: "Shiriki kwenye WhatsApp",
    share_facebook: "Shiriki kwenye Facebook",
    footnote: "Kiwango na kasi sawa na uhamisho wowote — hii ni njia tu yenye hatari ndogo ya kujaribu.",
  },
};

for (const [lang, keys] of Object.entries(TRANSLATIONS)) {
  const path = join(MSG, `${lang}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.pruebaExpress = keys;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`✓ pruebaExpress → ${lang}.json`);
}
