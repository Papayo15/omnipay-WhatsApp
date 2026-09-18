// One-shot: adds the "whatsapp.compare_*" keys (the "comparar" hook command — shows
// savings vs. traditional remittance companies, no email/KYC required) across all 19
// messages/*.json locale files.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    compare_usage: "Write it like this: *comparar 200 USD Mexico* (amount, currency, country) and I'll show you how much more your recipient gets with OmniPay vs. a traditional remittance company.",
    compare_error: "I couldn't get a comparison for that right now. Please try again in a moment.",
    compare_reply: "🔎 Sending {amount} {currency}:\n\n✅ With OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Traditional remittance company (est.): {competitor_amount} {recipient_currency}\n\n💰 Your recipient gets *+{savings} {recipient_currency} more* with OmniPay.\n\nReady to send? Just write the amount and country (e.g. *200 USD Mexico*) and your email.",
    compare_hint: "🔎 Just want to compare before deciding? Write: *comparar 200 USD Mexico*",
  },
  es: {
    compare_usage: "Escríbeme así: *comparar 200 USD México* (monto, moneda, país) y te muestro cuánto más recibe tu destinatario con OmniPay vs. una remesadora tradicional.",
    compare_error: "No pude generar la comparación en este momento. Intenta de nuevo en un momento.",
    compare_reply: "🔎 Enviando {amount} {currency}:\n\n✅ Con OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Remesadora tradicional (estimado): {competitor_amount} {recipient_currency}\n\n💰 Tu destinatario recibe *+{savings} {recipient_currency} más* con OmniPay.\n\n¿Listo para enviar? Solo escribe el monto y país (ej. *200 USD México*) y tu correo.",
    compare_hint: "🔎 ¿Solo quieres comparar antes de decidir? Escribe: *comparar 200 USD México*",
  },
  de: {
    compare_usage: "Schreib es so: *comparar 200 USD Mexiko* (Betrag, Währung, Land) und ich zeige dir, wie viel mehr dein Empfänger mit OmniPay bekommt im Vergleich zu einem klassischen Geldtransferdienst.",
    compare_error: "Ich konnte gerade keinen Vergleich erstellen. Bitte versuche es gleich noch einmal.",
    compare_reply: "🔎 Für {amount} {currency}:\n\n✅ Mit OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Klassischer Geldtransferdienst (geschätzt): {competitor_amount} {recipient_currency}\n\n💰 Dein Empfänger bekommt *+{savings} {recipient_currency} mehr* mit OmniPay.\n\nBereit zu senden? Schreib einfach Betrag und Land (z. B. *200 USD Mexiko*) und deine E-Mail.",
    compare_hint: "🔎 Willst du erstmal nur vergleichen? Schreib: *comparar 200 USD Mexiko*",
  },
  fr: {
    compare_usage: "Écris-le comme ça : *comparar 200 USD Mexique* (montant, devise, pays) et je te montre combien de plus ton destinataire reçoit avec OmniPay par rapport à une société de transfert traditionnelle.",
    compare_error: "Je n'ai pas pu générer la comparaison pour le moment. Réessaie dans un instant.",
    compare_reply: "🔎 Pour {amount} {currency} :\n\n✅ Avec OmniPay : {omnipay_amount} {recipient_currency}\n🐌 Société de transfert traditionnelle (estimation) : {competitor_amount} {recipient_currency}\n\n💰 Ton destinataire reçoit *+{savings} {recipient_currency} de plus* avec OmniPay.\n\nPrêt à envoyer ? Écris juste le montant et le pays (ex. *200 USD Mexique*) et ton e-mail.",
    compare_hint: "🔎 Tu veux juste comparer avant de te décider ? Écris : *comparar 200 USD Mexique*",
  },
  it: {
    compare_usage: "Scrivi così: *comparar 200 USD Messico* (importo, valuta, paese) e ti mostro quanto in più riceve il tuo destinatario con OmniPay rispetto a una rimessa tradizionale.",
    compare_error: "Non sono riuscito a generare il confronto in questo momento. Riprova tra un momento.",
    compare_reply: "🔎 Inviando {amount} {currency}:\n\n✅ Con OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Rimessa tradizionale (stima): {competitor_amount} {recipient_currency}\n\n💰 Il tuo destinatario riceve *+{savings} {recipient_currency} in più* con OmniPay.\n\nPronto a inviare? Scrivi solo importo e paese (es. *200 USD Messico*) e la tua email.",
    compare_hint: "🔎 Vuoi solo confrontare prima di decidere? Scrivi: *comparar 200 USD Messico*",
  },
  nl: {
    compare_usage: "Schrijf het zo: *comparar 200 USD Mexico* (bedrag, valuta, land) en ik laat je zien hoeveel meer je ontvanger krijgt met OmniPay t.o.v. een traditionele geldtransferdienst.",
    compare_error: "Ik kon nu geen vergelijking maken. Probeer het zo opnieuw.",
    compare_reply: "🔎 Bij het versturen van {amount} {currency}:\n\n✅ Met OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Traditionele geldtransferdienst (schatting): {competitor_amount} {recipient_currency}\n\n💰 Je ontvanger krijgt *+{savings} {recipient_currency} meer* met OmniPay.\n\nKlaar om te versturen? Schrijf gewoon het bedrag en land (bv. *200 USD Mexico*) en je e-mail.",
    compare_hint: "🔎 Wil je eerst alleen vergelijken? Schrijf: *comparar 200 USD Mexico*",
  },
  pt: {
    compare_usage: "Escreva assim: *comparar 200 USD México* (valor, moeda, país) e eu mostro quanto a mais seu destinatário recebe com a OmniPay em comparação com uma remessa tradicional.",
    compare_error: "Não consegui gerar a comparação agora. Tente novamente em instantes.",
    compare_reply: "🔎 Enviando {amount} {currency}:\n\n✅ Com a OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Remessa tradicional (estimativa): {competitor_amount} {recipient_currency}\n\n💰 Seu destinatário recebe *+{savings} {recipient_currency} a mais* com a OmniPay.\n\nPronto para enviar? Só escrever o valor e país (ex. *200 USD México*) e seu e-mail.",
    compare_hint: "🔎 Só quer comparar antes de decidir? Escreva: *comparar 200 USD México*",
  },
  tr: {
    compare_usage: "Şöyle yaz: *comparar 200 USD Meksika* (tutar, para birimi, ülke) ve alıcının OmniPay ile geleneksel bir para transfer şirketine göre ne kadar daha fazla aldığını göstereyim.",
    compare_error: "Şu anda karşılaştırma oluşturamadım. Lütfen biraz sonra tekrar dene.",
    compare_reply: "🔎 {amount} {currency} gönderirken:\n\n✅ OmniPay ile: {omnipay_amount} {recipient_currency}\n🐌 Geleneksel para transfer şirketi (tahmini): {competitor_amount} {recipient_currency}\n\n💰 Alıcın OmniPay ile *+{savings} {recipient_currency} daha fazla* alıyor.\n\nGöndermeye hazır mısın? Sadece tutar ve ülke yaz (örn. *200 USD Meksika*) ve e-postanı.",
    compare_hint: "🔎 Karar vermeden önce sadece karşılaştırmak mı istiyorsun? Yaz: *comparar 200 USD Meksika*",
  },
  ru: {
    compare_usage: "Напиши так: *comparar 200 USD Мексика* (сумма, валюта, страна), и я покажу, сколько больше получит твой получатель с OmniPay по сравнению с традиционной службой денежных переводов.",
    compare_error: "Не удалось получить сравнение прямо сейчас. Попробуй снова через минуту.",
    compare_reply: "🔎 При отправке {amount} {currency}:\n\n✅ С OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Традиционная служба переводов (примерно): {competitor_amount} {recipient_currency}\n\n💰 Твой получатель получает *+{savings} {recipient_currency} больше* с OmniPay.\n\nГотов отправить? Просто напиши сумму и страну (напр. *200 USD Мексика*) и свой email.",
    compare_hint: "🔎 Просто хочешь сравнить перед тем как решить? Напиши: *comparar 200 USD Мексика*",
  },
  vi: {
    compare_usage: "Viết thế này: *comparar 200 USD Mexico* (số tiền, tiền tệ, quốc gia) và tôi sẽ cho bạn thấy người nhận của bạn nhận được nhiều hơn bao nhiêu với OmniPay so với dịch vụ chuyển tiền truyền thống.",
    compare_error: "Tôi không thể tạo so sánh lúc này. Vui lòng thử lại sau một chút.",
    compare_reply: "🔎 Khi gửi {amount} {currency}:\n\n✅ Với OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Dịch vụ chuyển tiền truyền thống (ước tính): {competitor_amount} {recipient_currency}\n\n💰 Người nhận của bạn nhận được *+{savings} {recipient_currency} nhiều hơn* với OmniPay.\n\nSẵn sàng gửi chưa? Chỉ cần viết số tiền và quốc gia (vd. *200 USD Mexico*) và email của bạn.",
    compare_hint: "🔎 Chỉ muốn so sánh trước khi quyết định? Viết: *comparar 200 USD Mexico*",
  },
  id: {
    compare_usage: "Tulis seperti ini: *comparar 200 USD Meksiko* (jumlah, mata uang, negara) dan saya akan tunjukkan berapa lebih banyak penerima Anda dapatkan dengan OmniPay dibanding perusahaan pengiriman uang tradisional.",
    compare_error: "Saya tidak bisa membuat perbandingan saat ini. Coba lagi sebentar lagi.",
    compare_reply: "🔎 Saat mengirim {amount} {currency}:\n\n✅ Dengan OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Perusahaan pengiriman uang tradisional (perkiraan): {competitor_amount} {recipient_currency}\n\n💰 Penerima Anda mendapat *+{savings} {recipient_currency} lebih banyak* dengan OmniPay.\n\nSiap kirim? Cukup tulis jumlah dan negara (mis. *200 USD Meksiko*) dan email Anda.",
    compare_hint: "🔎 Cuma mau membandingkan dulu sebelum memutuskan? Tulis: *comparar 200 USD Meksiko*",
  },
  ja: {
    compare_usage: "このように書いてください: *comparar 200 USD メキシコ*（金額、通貨、国）。OmniPayと従来の送金会社を比べて、受取人がどれだけ多く受け取れるかをお見せします。",
    compare_error: "今は比較を作成できませんでした。少ししてからもう一度お試しください。",
    compare_reply: "🔎 {amount} {currency} を送る場合:\n\n✅ OmniPayの場合：{omnipay_amount} {recipient_currency}\n🐌 従来の送金会社（概算）：{competitor_amount} {recipient_currency}\n\n💰 OmniPayなら受取人は *+{savings} {recipient_currency} 多く* 受け取れます。\n\n送金の準備はできましたか？ 金額と国（例：*200 USD メキシコ*）とメールアドレスを書くだけです。",
    compare_hint: "🔎 決める前にまず比較したいだけですか？ 書いてください: *comparar 200 USD メキシコ*",
  },
  ko: {
    compare_usage: "이렇게 써주세요: *comparar 200 USD 멕시코* (금액, 통화, 국가). OmniPay와 기존 송금 회사를 비교해 수취인이 얼마나 더 받는지 보여드릴게요.",
    compare_error: "지금은 비교 결과를 만들 수 없었습니다. 잠시 후 다시 시도해 주세요.",
    compare_reply: "🔎 {amount} {currency} 송금 시:\n\n✅ OmniPay 이용 시: {omnipay_amount} {recipient_currency}\n🐌 기존 송금 회사(추정): {competitor_amount} {recipient_currency}\n\n💰 OmniPay를 이용하면 수취인이 *+{savings} {recipient_currency} 더* 받습니다.\n\n송금할 준비가 되셨나요? 금액과 국가(예: *200 USD 멕시코*)와 이메일만 적어주세요.",
    compare_hint: "🔎 결정하기 전에 비교만 해보고 싶으신가요? 작성해 주세요: *comparar 200 USD 멕시코*",
  },
  zh: {
    compare_usage: "请这样写：*comparar 200 USD 墨西哥*（金额、货币、国家），我会告诉你用OmniPay比传统汇款公司多汇多少钱给收款人。",
    compare_error: "现在无法生成比较结果，请稍后再试。",
    compare_reply: "🔎 汇出 {amount} {currency} 时：\n\n✅ 使用OmniPay：{omnipay_amount} {recipient_currency}\n🐌 传统汇款公司（估算）：{competitor_amount} {recipient_currency}\n\n💰 使用OmniPay，收款人*多收到 {savings} {recipient_currency}*。\n\n准备好汇款了吗？只需写下金额和国家（例如*200 USD 墨西哥*）和您的邮箱。",
    compare_hint: "🔎 只是想在决定前比较一下？请输入：*comparar 200 USD 墨西哥*",
  },
  hi: {
    compare_usage: "ऐसे लिखें: *comparar 200 USD मेक्सिको* (राशि, मुद्रा, देश) और मैं आपको दिखाऊंगा कि पारंपरिक मनी ट्रांसफर कंपनी की तुलना में OmniPay से आपके प्राप्तकर्ता को कितना अधिक मिलता है।",
    compare_error: "अभी तुलना तैयार नहीं कर सका। कृपया थोड़ी देर में फिर से कोशिश करें।",
    compare_reply: "🔎 {amount} {currency} भेजते समय:\n\n✅ OmniPay के साथ: {omnipay_amount} {recipient_currency}\n🐌 पारंपरिक मनी ट्रांसफर कंपनी (अनुमानित): {competitor_amount} {recipient_currency}\n\n💰 आपके प्राप्तकर्ता को OmniPay से *+{savings} {recipient_currency} अधिक* मिलता है।\n\nभेजने के लिए तैयार हैं? बस राशि और देश लिखें (जैसे *200 USD मेक्सिको*) और अपना ईमेल।",
    compare_hint: "🔎 फैसला करने से पहले सिर्फ तुलना करना चाहते हैं? लिखें: *comparar 200 USD मेक्सिको*",
  },
  ar: {
    compare_usage: "اكتب هكذا: *comparar 200 USD المكسيك* (المبلغ، العملة، الدولة) وسأريك كم يحصل المستفيد أكثر مع OmniPay مقارنة بشركة تحويل أموال تقليدية.",
    compare_error: "لم أتمكن من إنشاء المقارنة الآن. حاول مرة أخرى بعد قليل.",
    compare_reply: "🔎 عند إرسال {amount} {currency}:\n\n✅ مع OmniPay: {omnipay_amount} {recipient_currency}\n🐌 شركة تحويل أموال تقليدية (تقديري): {competitor_amount} {recipient_currency}\n\n💰 يحصل المستفيد على *+{savings} {recipient_currency} أكثر* مع OmniPay.\n\nجاهز للإرسال؟ فقط اكتب المبلغ والدولة (مثال: *200 USD المكسيك*) وبريدك الإلكتروني.",
    compare_hint: "🔎 تريد فقط المقارنة قبل أن تقرر؟ اكتب: *comparar 200 USD المكسيك*",
  },
  am: {
    compare_usage: "እንደዚህ ይጻፉ: *comparar 200 USD ሜክሲኮ* (መጠን፣ ገንዘብ፣ ሀገር) እና ከባህላዊ የገንዘብ መላኪያ ኩባንያ ጋር ሲነጻጸር ተቀባይዎ በOmniPay ምን ያህል ተጨማሪ እንደሚያገኝ አሳይዎታለሁ።",
    compare_error: "አሁን ንጽጽር ማዘጋጀት አልቻልኩም። እባክዎ ከጥቂት ጊዜ በኋላ እንደገና ይሞክሩ።",
    compare_reply: "🔎 {amount} {currency} ሲልኩ:\n\n✅ በOmniPay: {omnipay_amount} {recipient_currency}\n🐌 ባህላዊ የገንዘብ መላኪያ (ግምት): {competitor_amount} {recipient_currency}\n\n💰 ተቀባይዎ በOmniPay *+{savings} {recipient_currency} ተጨማሪ* ያገኛል።\n\nለመላክ ዝግጁ ነዎት? መጠኑን እና ሀገሩን ብቻ ይጻፉ (ምሳሌ *200 USD ሜክሲኮ*) እና ኢሜይልዎን።",
    compare_hint: "🔎 ከመወሰንዎ በፊት ማወዳደር ብቻ ይፈልጋሉ? ይጻፉ: *comparar 200 USD ሜክሲኮ*",
  },
  ha: {
    compare_usage: "Rubuta kamar haka: *comparar 200 USD Mexico* (adadi, kuɗi, ƙasa) zan nuna maka nawa mai karɓarka zai samu ƙari da OmniPay idan aka kwatanta da kamfanin canja wurin kuɗi na gargajiya.",
    compare_error: "Ban iya samar da kwatance a yanzu ba. Sake gwadawa bayan ɗan lokaci.",
    compare_reply: "🔎 Idan ana aikawa da {amount} {currency}:\n\n✅ Da OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Kamfanin canja wurin kuɗi na gargajiya (ƙiyasi): {competitor_amount} {recipient_currency}\n\n💰 Mai karɓarka yana samun *+{savings} {recipient_currency} ƙari* da OmniPay.\n\nA shirye kake ka aika? Kawai rubuta adadi da ƙasa (misali *200 USD Mexico*) da imel ɗinka.",
    compare_hint: "🔎 Kana son kwatanta kawai kafin ka yanke shawara? Rubuta: *comparar 200 USD Mexico*",
  },
  sw: {
    compare_usage: "Andika hivi: *comparar 200 USD Mexico* (kiasi, sarafu, nchi) nami nitakuonyesha ni kiasi gani zaidi mpokeaji wako anapata kwa OmniPay ikilinganishwa na kampuni ya kawaida ya kutuma pesa.",
    compare_error: "Sikuweza kutengeneza ulinganisho kwa sasa. Tafadhali jaribu tena baada ya muda.",
    compare_reply: "🔎 Ukituma {amount} {currency}:\n\n✅ Kwa OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Kampuni ya kawaida ya kutuma pesa (makadirio): {competitor_amount} {recipient_currency}\n\n💰 Mpokeaji wako anapata *+{savings} {recipient_currency} zaidi* kwa OmniPay.\n\nUko tayari kutuma? Andika tu kiasi na nchi (mfano *200 USD Mexico*) na barua pepe yako.",
    compare_hint: "🔎 Unataka tu kulinganisha kabla ya kuamua? Andika: *comparar 200 USD Mexico*",
  },
};

// CTA appended after compare_reply — bridges straight into the send flow ("Responde SI"),
// per the user's spec: comparing shouldn't be a dead end, it should funnel into sending.
// Uses the same hardcoded "SI"/"sí" keyword as the rest of the bot's confirmations
// (step 7) regardless of locale — pre-existing convention, not something new here.
const CTA = {
  en: "Want to send this now?\n👉 Reply *YES* to continue.",
  es: "¿Quieres realizar este envío ahora?\n👉 Responde *SI* para continuar.",
  de: "Möchtest du das jetzt senden?\n👉 Antworte mit *JA*, um fortzufahren.",
  fr: "Tu veux envoyer maintenant ?\n👉 Réponds *OUI* pour continuer.",
  it: "Vuoi inviare questo ora?\n👉 Rispondi *SI* per continuare.",
  nl: "Wil je dit nu versturen?\n👉 Antwoord met *JA* om door te gaan.",
  pt: "Quer fazer esse envio agora?\n👉 Responda *SIM* para continuar.",
  tr: "Bunu şimdi göndermek ister misin?\n👉 Devam etmek için *EVET* yaz.",
  ru: "Хочешь отправить это сейчас?\n👉 Ответь *ДА*, чтобы продолжить.",
  vi: "Bạn có muốn gửi ngay bây giờ không?\n👉 Trả lời *CÓ* để tiếp tục.",
  id: "Mau kirim sekarang?\n👉 Balas *YA* untuk lanjut.",
  ja: "今すぐ送金しますか？\n👉 続けるには「はい」と返信してください。",
  ko: "지금 송금하시겠어요?\n👉 계속하려면 *예*라고 답장해 주세요.",
  zh: "现在就汇款吗？\n👉 回复\"是\"继续。",
  hi: "क्या आप अभी यह भेजना चाहते हैं?\n👉 जारी रखने के लिए *हाँ* लिखें।",
  ar: "هل تريد إرسال هذا الآن؟\n👉 أجب بـ *نعم* للمتابعة.",
  am: "አሁን ይህን መላክ ይፈልጋሉ?\n👉 ለመቀጠል *አዎ* ብለው ይመልሱ።",
  ha: "Kana son aika wannan yanzu?\n👉 Amsa da *I* don ci gaba.",
  sw: "Unataka kutuma hii sasa?\n👉 Jibu *NDIYO* kuendelea.",
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys, compare_cta: CTA[locale] };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
