// One-shot: clarifies "whatsapp.compare_usage" so "moneda" and "país" aren't ambiguous —
// explicit that currency = what you're SENDING in, country = where the RECIPIENT is.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "📊 To compare, write it like this:\n\"comparar [amount] [currency you're sending] [recipient's country]\" (e.g. comparar 200 USD Mexico → you send 200 USD, your recipient is in Mexico)\n\nI'll show you how much more your recipient gets with OmniPay vs. a traditional remittance company.",
  es: "📊 Para comparar, escríbeme así:\n\"comparar [monto] [moneda que envías] [país del destinatario]\" (ej: comparar 200 USD México → envías 200 USD, tu destinatario está en México)\n\nTe muestro cuánto más recibe tu destinatario con OmniPay vs. una remesadora tradicional.",
  de: "📊 Für einen Vergleich schreib es so:\n\"comparar [Betrag] [Währung, die du sendest] [Land des Empfängers]\" (z. B. comparar 200 USD Mexiko → du sendest 200 USD, dein Empfänger ist in Mexiko)\n\nIch zeige dir, wie viel mehr dein Empfänger mit OmniPay bekommt im Vergleich zu einer klassischen Geldtransferfirma.",
  fr: "📊 Pour comparer, écris comme ça :\n\"comparar [montant] [devise que tu envoies] [pays du destinataire]\" (ex : comparar 200 USD Mexique → tu envoies 200 USD, ton destinataire est au Mexique)\n\nJe te montre combien de plus ton destinataire reçoit avec OmniPay par rapport à une société de transfert traditionnelle.",
  it: "📊 Per confrontare, scrivi così:\n\"comparar [importo] [valuta che invii] [paese del destinatario]\" (es: comparar 200 USD Messico → invii 200 USD, il tuo destinatario è in Messico)\n\nTi mostro quanto in più riceve il tuo destinatario con OmniPay rispetto a una rimessa tradizionale.",
  nl: "📊 Om te vergelijken, schrijf zo:\n\"comparar [bedrag] [valuta die je verstuurt] [land van de ontvanger]\" (bijv. comparar 200 USD Mexico → je stuurt 200 USD, je ontvanger zit in Mexico)\n\nIk laat je zien hoeveel meer je ontvanger krijgt met OmniPay vs. een traditionele geldtransferdienst.",
  pt: "📊 Para comparar, escreva assim:\n\"comparar [valor] [moeda que você envia] [país do destinatário]\" (ex: comparar 200 USD México → você envia 200 USD, seu destinatário está no México)\n\nMostro quanto a mais seu destinatário recebe com a OmniPay em comparação com uma remessa tradicional.",
  tr: "📊 Karşılaştırmak için şöyle yaz:\n\"comparar [tutar] [gönderdiğin para birimi] [alıcının ülkesi]\" (örn: comparar 200 USD Meksika → 200 USD gönderiyorsun, alıcın Meksika'da)\n\nAlıcının OmniPay ile geleneksel bir para transfer şirketine göre ne kadar daha fazla aldığını göstereyim.",
  ru: "📊 Чтобы сравнить, напиши так:\n\"comparar [сумма] [валюта, которую отправляешь] [страна получателя]\" (напр. comparar 200 USD Мексика → ты отправляешь 200 USD, получатель в Мексике)\n\nПокажу, сколько больше получит твой получатель с OmniPay по сравнению с традиционной службой денежных переводов.",
  vi: "📊 Để so sánh, viết thế này:\n\"comparar [số tiền] [loại tiền bạn gửi] [quốc gia của người nhận]\" (vd: comparar 200 USD Mexico → bạn gửi 200 USD, người nhận ở Mexico)\n\nTôi sẽ cho bạn thấy người nhận của bạn nhận được nhiều hơn bao nhiêu với OmniPay so với dịch vụ chuyển tiền truyền thống.",
  id: "📊 Untuk membandingkan, tulis seperti ini:\n\"comparar [jumlah] [mata uang yang Anda kirim] [negara penerima]\" (mis: comparar 200 USD Meksiko → Anda mengirim 200 USD, penerima Anda di Meksiko)\n\nSaya akan tunjukkan berapa lebih banyak penerima Anda dapatkan dengan OmniPay dibanding perusahaan pengiriman uang tradisional.",
  ja: "📊 比較するには、このように書いてください：\n「comparar [金額] [送金する通貨] [受取人の国]」（例：comparar 200 USD メキシコ → 200 USDを送金し、受取人はメキシコにいます）\n\nOmniPayと従来の送金会社を比べて、受取人がどれだけ多く受け取れるかをお見せします。",
  ko: "📊 비교하려면 이렇게 써주세요:\n\"comparar [금액] [보내는 통화] [수취인의 국가]\" (예: comparar 200 USD 멕시코 → 200 USD를 보내고, 수취인은 멕시코에 있음)\n\nOmniPay와 기존 송금 회사를 비교해 수취인이 얼마나 더 받는지 보여드릴게요.",
  zh: "📊 要比较，请这样写：\n\"comparar [金额] [您汇出的货币] [收款人所在国家]\"（例如：comparar 200 USD 墨西哥 → 您汇出200美元，收款人在墨西哥）\n\n我会告诉你用OmniPay比传统汇款公司多汇多少钱给收款人。",
  hi: "📊 तुलना करने के लिए, ऐसे लिखें:\n\"comparar [राशि] [जो मुद्रा आप भेज रहे हैं] [प्राप्तकर्ता का देश]\" (जैसे: comparar 200 USD मेक्सिको → आप 200 USD भेज रहे हैं, आपका प्राप्तकर्ता मेक्सिको में है)\n\nमैं आपको दिखाऊंगा कि पारंपरिक मनी ट्रांसफर कंपनी की तुलना में OmniPay से आपके प्राप्तकर्ता को कितना अधिक मिलता है।",
  ar: "📊 للمقارنة، اكتب هكذا:\n\"comparar [المبلغ] [العملة التي ترسلها] [دولة المستفيد]\" (مثال: comparar 200 USD المكسيك → أنت ترسل 200 USD، والمستفيد في المكسيك)\n\nسأريك كم يحصل المستفيد أكثر مع OmniPay مقارنة بشركة تحويل أموال تقليدية.",
  am: "📊 ለማወዳደር፣ እንደዚህ ይጻፉ:\n\"comparar [መጠን] [የሚልኩት ገንዘብ] [የተቀባይ ሀገር]\" (ለምሳሌ: comparar 200 USD ሜክሲኮ → 200 USD እየላኩ ነው፣ ተቀባይዎ ሜክሲኮ ውስጥ ነው)\n\nከባህላዊ የገንዘብ መላኪያ ኩባንያ ጋር ሲነጻጸር ተቀባይዎ በOmniPay ምን ያህል ተጨማሪ እንደሚያገኝ አሳይዎታለሁ።",
  ha: "📊 Don kwatanta, rubuta kamar haka:\n\"comparar [adadi] [kuɗin da kake aikawa] [ƙasar mai karɓa]\" (misali: comparar 200 USD Mexico → kana aika USD 200, mai karɓarka yana Mexico)\n\nZan nuna maka nawa mai karɓarka zai samu ƙari da OmniPay idan aka kwatanta da kamfanin canja wurin kuɗi na gargajiya.",
  sw: "📊 Kulinganisha, andika hivi:\n\"comparar [kiasi] [sarafu unayotuma] [nchi ya mpokeaji]\" (mfano: comparar 200 USD Mexico → unatuma USD 200, mpokeaji wako yuko Mexico)\n\nNitakuonyesha ni kiasi gani zaidi mpokeaji wako anapata kwa OmniPay ikilinganishwa na kampuni ya kawaida ya kutuma pesa.",
};

for (const [locale, compare_usage] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, compare_usage };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
