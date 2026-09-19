// One-shot: clarifies "whatsapp.menu_option_send_prompt" (shown when the user picks "1"
// from the menu) the same way compare_usage was clarified — explicit that the currency is
// what the SENDER sends, the country is where the RECIPIENT is, and the email is the
// sender's.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "Great 👍 Write the amount, the currency you're sending, your recipient's country, and your (the sender's) email — all together. E.g.: *200 USD Mexico juan@email.com* (you send 200 USD, your recipient is in Mexico).",
  es: "Perfecto 👍 Escríbeme el monto, la moneda que envías, el país de tu destinatario y tu correo (el del emisor) — todo junto. Ej: *200 USD México juan@correo.com* (envías 200 USD, tu destinatario está en México).",
  de: "Super 👍 Schreib mir den Betrag, die Währung, die du sendest, das Land deines Empfängers und deine (Absender-)E-Mail — alles zusammen. Z. B.: *200 USD Mexiko juan@email.com* (du sendest 200 USD, dein Empfänger ist in Mexiko).",
  fr: "Parfait 👍 Écris-moi le montant, la devise que tu envoies, le pays de ton destinataire et ton e-mail (celui de l'expéditeur) — le tout ensemble. Ex. : *200 USD Mexique juan@email.com* (tu envoies 200 USD, ton destinataire est au Mexique).",
  it: "Perfetto 👍 Scrivimi l'importo, la valuta che invii, il paese del tuo destinatario e la tua email (quella del mittente) — tutto insieme. Es.: *200 USD Messico juan@email.com* (invii 200 USD, il tuo destinatario è in Messico).",
  nl: "Top 👍 Schrijf me het bedrag, de valuta die je verstuurt, het land van je ontvanger en jouw e-mail (die van de afzender) — allemaal samen. Bijv.: *200 USD Mexico juan@email.com* (je stuurt 200 USD, je ontvanger zit in Mexico).",
  pt: "Perfeito 👍 Escreva o valor, a moeda que você envia, o país do seu destinatário e o seu e-mail (o do remetente) — tudo junto. Ex.: *200 USD México juan@email.com* (você envia 200 USD, seu destinatário está no México).",
  tr: "Harika 👍 Tutarı, gönderdiğin para birimini, alıcının ülkesini ve senin (gönderenin) e-postanı birlikte yaz. Örn.: *200 USD Meksika juan@email.com* (200 USD gönderiyorsun, alıcın Meksika'da).",
  ru: "Отлично 👍 Напиши сумму, валюту, которую отправляешь, страну получателя и свой (отправителя) email — всё вместе. Напр.: *200 USD Мексика juan@email.com* (ты отправляешь 200 USD, получатель в Мексике).",
  vi: "Tuyệt 👍 Viết số tiền, loại tiền bạn gửi, quốc gia của người nhận, và email của bạn (người gửi) — tất cả cùng nhau. Vd.: *200 USD Mexico juan@email.com* (bạn gửi 200 USD, người nhận ở Mexico).",
  id: "Bagus 👍 Tulis jumlah, mata uang yang Anda kirim, negara penerima Anda, dan email Anda (pengirim) — semua sekaligus. Mis.: *200 USD Meksiko juan@email.com* (Anda mengirim 200 USD, penerima Anda di Meksiko).",
  ja: "了解です 👍 金額、送金する通貨、受取人の国、そしてあなた（送金者）のメールアドレスを一緒に書いてください。例：*200 USD メキシコ juan@email.com*（200 USDを送金し、受取人はメキシコにいます）。",
  ko: "좋아요 👍 금액, 보내는 통화, 수취인의 국가, 그리고 당신(발신자)의 이메일을 함께 적어주세요. 예: *200 USD 멕시코 juan@email.com* (200 USD를 보내고, 수취인은 멕시코에 있음).",
  zh: "好的 👍 请把金额、您汇出的货币、收款人所在国家，以及您（汇款人）的邮箱一起写给我。例如：*200 USD 墨西哥 juan@email.com*（您汇出200美元，收款人在墨西哥）。",
  hi: "बढ़िया 👍 राशि, जो मुद्रा आप भेज रहे हैं, आपके प्राप्तकर्ता का देश, और आपका (भेजने वाले का) ईमेल — सब एक साथ लिखें। जैसे: *200 USD मेक्सिको juan@email.com* (आप 200 USD भेज रहे हैं, आपका प्राप्तकर्ता मेक्सिको में है)।",
  ar: "ممتاز 👍 اكتب المبلغ، والعملة التي ترسلها، ودولة المستفيد، وبريدك الإلكتروني (بريد المرسل) — كل ذلك معاً. مثال: *200 USD المكسيك juan@email.com* (أنت ترسل 200 USD، والمستفيد في المكسيك).",
  am: "እሺ 👍 መጠኑን፣ የሚልኩትን ገንዘብ፣ የተቀባይዎን ሀገር እና የእርስዎን (የላኪውን) ኢሜይል አብረው ይጻፉ። ለምሳሌ: *200 USD ሜክሲኮ juan@email.com* (200 USD እየላኩ ነው፣ ተቀባይዎ ሜክሲኮ ውስጥ ነው)።",
  ha: "Madalla 👍 Rubuta adadi, kuɗin da kake aikawa, ƙasar mai karɓarka, da imel ɗinka (na wanda ke aikawa) tare. Misali: *200 USD Mexico juan@email.com* (kana aika USD 200, mai karɓarka yana Mexico).",
  sw: "Vizuri 👍 Andika kiasi, sarafu unayotuma, nchi ya mpokeaji wako, na barua pepe yako (ya mtumaji) pamoja. Mfano: *200 USD Mexico juan@email.com* (unatuma USD 200, mpokeaji wako yuko Mexico).",
};

for (const [locale, menu_option_send_prompt] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, menu_option_send_prompt };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
