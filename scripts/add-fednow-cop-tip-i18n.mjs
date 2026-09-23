// One-shot: adds "confirmed_deposit_fednow_tip" (US rail, alongside confirmed_deposit_ach_tip)
// and "confirmed_deposit_cop_tip" (UK Faster Payments rail) to the "whatsapp" namespace.
//
// FedNow: confirmed via Bridge's own changelog that FedNow receiving is already
// auto-enabled on every existing virtual account — free win, zero backend change needed,
// just tell the sender to look for it in their bank if available.
//
// Confirmation of Payee (UK): confirmed real and mandatory since 2020 on all UK Faster
// Payments/CHAPS — the sending bank checks the typed beneficiary name against the real
// account name and shows a "doesn't match"/"close match" warning if they differ. Since our
// account belongs to a partner institution (not literally named after "the beneficiary" the
// user expects), a UK sender will very likely see this warning — same kind of scare as the
// Wells Fargo "Link External Account" issue, so it gets the same kind of reassurance tip.
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: {
    fednow: "⚡ Si tu banco ofrece transferencia \"Instant\" o \"FedNow\", esa es la más rápida — normalmente llega en minutos y sin costo extra.",
    cop: "💡 Tu banco puede mostrarte una alerta de que el nombre no coincide exactamente (\"Confirmation of Payee\") — es normal para cuentas de instituciones financieras como esta, no significa que algo esté mal. Puedes continuar con el pago con confianza.",
  },
  en: {
    fednow: "⚡ If your bank offers \"Instant\" or \"FedNow\" transfer, that's the fastest option — usually arrives in minutes with no extra cost.",
    cop: "💡 Your bank may show you a \"name doesn't match\" alert (\"Confirmation of Payee\") — that's normal for accounts belonging to financial institutions like this one, it doesn't mean anything is wrong. You can continue with the payment with confidence.",
  },
  de: {
    fednow: "⚡ Falls deine Bank \"Instant\" oder \"FedNow\" anbietet, ist das die schnellste Option — kommt meist in Minuten an, ohne Zusatzkosten.",
    cop: "💡 Deine Bank zeigt dir eventuell eine \"Name stimmt nicht überein\"-Warnung (\"Confirmation of Payee\") — das ist normal bei Konten von Finanzinstituten wie diesem und bedeutet nicht, dass etwas falsch ist. Du kannst die Zahlung bedenkenlos fortsetzen.",
  },
  fr: {
    fednow: "⚡ Si ta banque propose un virement \"Instant\" ou \"FedNow\", c'est l'option la plus rapide — arrive généralement en quelques minutes, sans frais supplémentaires.",
    cop: "💡 Ta banque peut t'afficher une alerte \"le nom ne correspond pas\" (\"Confirmation of Payee\") — c'est normal pour des comptes d'institutions financières comme celui-ci, ça ne veut pas dire qu'il y a un problème. Tu peux continuer le paiement en toute confiance.",
  },
  it: {
    fednow: "⚡ Se la tua banca offre il trasferimento \"Instant\" o \"FedNow\", è l'opzione più veloce — di solito arriva in pochi minuti, senza costi extra.",
    cop: "💡 La tua banca potrebbe mostrarti un avviso che il nome non corrisponde esattamente (\"Confirmation of Payee\") — è normale per conti di istituzioni finanziarie come questo, non significa che ci sia un problema. Puoi continuare con il pagamento con fiducia.",
  },
  nl: {
    fednow: "⚡ Als je bank \"Instant\" of \"FedNow\" overschrijving aanbiedt, is dat de snelste optie — komt meestal binnen enkele minuten aan, zonder extra kosten.",
    cop: "💡 Je bank kan een melding tonen dat de naam niet exact overeenkomt (\"Confirmation of Payee\") — dat is normaal voor rekeningen van financiële instellingen zoals deze, het betekent niet dat er iets mis is. Je kunt de betaling met vertrouwen voortzetten.",
  },
  pt: {
    fednow: "⚡ Se seu banco oferecer transferência \"Instant\" ou \"FedNow\", essa é a opção mais rápida — geralmente chega em minutos e sem custo extra.",
    cop: "💡 Seu banco pode mostrar um aviso de que o nome não corresponde exatamente (\"Confirmation of Payee\") — isso é normal para contas de instituições financeiras como esta, não significa que algo está errado. Você pode continuar com o pagamento com confiança.",
  },
  tr: {
    fednow: "⚡ Bankan \"Instant\" ya da \"FedNow\" transferi sunuyorsa, en hızlı seçenek bu — genelde dakikalar içinde ulaşır ve ekstra ücret yoktur.",
    cop: "💡 Bankan \"isim tam eşleşmiyor\" uyarısı gösterebilir (\"Confirmation of Payee\") — bu, bu tür finans kurumlarına ait hesaplar için normaldir, bir sorun olduğu anlamına gelmez. Ödemeye güvenle devam edebilirsin.",
  },
  ru: {
    fednow: "⚡ Если твой банк предлагает перевод \"Instant\" или \"FedNow\", это самый быстрый вариант — обычно приходит за минуты и без доплаты.",
    cop: "💡 Твой банк может показать предупреждение о том, что имя не совпадает точно (\"Confirmation of Payee\") — это нормально для счетов финансовых организаций вроде этого, и не значит, что что-то не так. Можешь спокойно продолжить платёж.",
  },
  vi: {
    fednow: "⚡ Nếu ngân hàng của bạn có chuyển khoản \"Instant\" hoặc \"FedNow\", đó là lựa chọn nhanh nhất — thường đến trong vài phút và không mất phí thêm.",
    cop: "💡 Ngân hàng của bạn có thể hiển thị cảnh báo tên không khớp chính xác (\"Confirmation of Payee\") — điều này bình thường đối với tài khoản của các tổ chức tài chính như thế này, không có nghĩa là có gì sai. Bạn có thể tiếp tục thanh toán một cách yên tâm.",
  },
  id: {
    fednow: "⚡ Jika bank Anda menawarkan transfer \"Instant\" atau \"FedNow\", itu opsi tercepat — biasanya sampai dalam hitungan menit tanpa biaya tambahan.",
    cop: "💡 Bank Anda mungkin menampilkan peringatan bahwa nama tidak cocok persis (\"Confirmation of Payee\") — ini normal untuk rekening milik institusi keuangan seperti ini, bukan berarti ada yang salah. Anda bisa melanjutkan pembayaran dengan tenang.",
  },
  ja: {
    fednow: "⚡ あなたの銀行が「Instant」や「FedNow」送金に対応している場合、それが最も早い方法です — 通常は数分で到着し、追加費用もかかりません。",
    cop: "💡 銀行から「名前が完全に一致しません」という警告（「Confirmation of Payee」）が表示されることがありますが、これはこのような金融機関の口座では普通のことで、問題があるという意味ではありません。安心してお支払いを続けてください。",
  },
  ko: {
    fednow: "⚡ 은행에서 \"Instant\" 또는 \"FedNow\" 송금을 제공한다면 그게 가장 빠른 방법입니다 — 보통 몇 분 내에 도착하며 추가 비용도 없습니다.",
    cop: "💡 은행에서 이름이 정확히 일치하지 않는다는 경고(\"Confirmation of Payee\")를 표시할 수 있습니다 — 이런 금융기관 계좌에서는 흔한 일이며 문제가 있다는 뜻은 아닙니다. 안심하고 결제를 계속하세요.",
  },
  zh: {
    fednow: "⚡ 如果您的银行提供\"Instant\"或\"FedNow\"转账，那是最快的方式——通常几分钟内到账，且无需额外费用。",
    cop: "💡 您的银行可能会显示姓名不完全匹配的提示（\"Confirmation of Payee\"）——对于这类金融机构账户来说这是正常现象，并不代表有问题。您可以放心继续付款。",
  },
  hi: {
    fednow: "⚡ यदि आपका बैंक \"Instant\" या \"FedNow\" ट्रांसफर देता है, तो यह सबसे तेज़ विकल्प है — आमतौर पर कुछ ही मिनटों में पहुंचता है और कोई अतिरिक्त शुल्क नहीं लगता।",
    cop: "💡 आपका बैंक यह चेतावनी दिखा सकता है कि नाम बिल्कुल मेल नहीं खाता (\"Confirmation of Payee\") — यह इस तरह के वित्तीय संस्थान के खातों के लिए सामान्य है, इसका मतलब यह नहीं कि कुछ गलत है। आप बेझिझक भुगतान जारी रख सकते हैं।",
  },
  ar: {
    fednow: "⚡ إذا كان بنكك يوفر تحويل \"Instant\" أو \"FedNow\"، فهذا هو الخيار الأسرع — يصل عادةً خلال دقائق ودون أي رسوم إضافية.",
    cop: "💡 قد يعرض بنكك تنبيهًا بأن الاسم لا يتطابق تمامًا (\"Confirmation of Payee\") — هذا أمر طبيعي بالنسبة لحسابات المؤسسات المالية مثل هذا الحساب، ولا يعني وجود خطأ. يمكنك المتابعة بالدفع بثقة.",
  },
  am: {
    fednow: "⚡ ባንክዎ \"Instant\" ወይም \"FedNow\" ዝውውር የሚያቀርብ ከሆነ፣ ያ በጣም ፈጣኑ አማራጭ ነው — በተለምዶ በደቂቃዎች ውስጥ ይደርሳል፣ ያለ ተጨማሪ ክፍያ።",
    cop: "💡 ባንክዎ ስሙ በትክክል እንደማይዛመድ የሚያሳይ ማንቂያ ሊያሳይ ይችላል (\"Confirmation of Payee\") — ይህ እንደዚህ ላሉ የፋይናንስ ተቋማት አካውንቶች የተለመደ ነው፣ የሆነ ችግር አለ ማለት አይደለም። ክፍያውን በልበ ሙሉነት መቀጠል ይችላሉ።",
  },
  ha: {
    fednow: "⚡ Idan bankinka yana ba da canja wurin \"Instant\" ko \"FedNow\", wannan shine mafi sauri — yawanci yakan isa cikin mintuna kaɗan ba tare da ƙarin kuɗi ba.",
    cop: "💡 Bankinka na iya nuna maka gargaɗin cewa suna bai dace daidai ba (\"Confirmation of Payee\") — wannan al'ada ce ga asusun cibiyoyin kudi kamar wannan, ba yana nufin akwai matsala ba. Za ka iya ci gaba da biyan kuɗin cikin natsuwa.",
  },
  sw: {
    fednow: "⚡ Ikiwa benki yako inatoa uhamisho wa \"Instant\" au \"FedNow\", hiyo ndiyo chaguo la haraka zaidi — kwa kawaida hufika kwa dakika chache bila gharama za ziada.",
    cop: "💡 Benki yako inaweza kukuonyesha onyo kwamba jina halifanani kikamilifu (\"Confirmation of Payee\") — hii ni kawaida kwa akaunti za taasisi za kifedha kama hii, haimaanishi kuna tatizo. Unaweza kuendelea na malipo kwa uhakika.",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp.confirmed_deposit_fednow_tip = keys.fednow;
  json.whatsapp.confirmed_deposit_cop_tip = keys.cop;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
