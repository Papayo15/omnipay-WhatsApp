// One-shot: rewrites "confirmed_deposit_ach_tip" to include {bank_name}/{bank_address} (the
// physical bank address Bridge already returns per-transaction — real, dynamic, no address
// ever needs to be hardcoded here) and adds "confirmed_deposit_ach_tip_auto" as the fallback
// for when Bridge didn't return an address (user can use their own US postal address as a
// Bill Pay backup). US bank-app action names (Send Money, Pay a Person or Business, Bill
// Pay, Link External Account, Transfer to My Own Accounts, Wire) stay in English — that's
// literally what the buttons say in Wells Fargo/Chase/BofA apps regardless of app language.
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: {
    tip: "💡 Tip para tu banca móvil: usa \"Send Money\", \"Pay a Person or Business\" o \"Bill Pay\". ⚠️ No uses \"Link External Account\" ni \"Transfer to My Own Accounts\" (eso activa depósitos de prueba de centavos que tardan días). Si tu banco te pide la dirección de {bank_name}, usa: {bank_address}.",
    auto: "💡 Tip para tu banca móvil: usa \"Send Money\", \"Pay a Person or Business\" o \"Bill Pay\". ⚠️ No uses \"Link External Account\" ni \"Transfer to My Own Accounts\". Si tu banco te pide una dirección postal para registrar el pago a {bank_name}, puedes ingresar tu propia dirección física en EE. UU.",
  },
  en: {
    tip: "💡 Tip for your mobile banking: use \"Send Money\", \"Pay a Person or Business\", or \"Bill Pay\". ⚠️ Don't use \"Link External Account\" or \"Transfer to My Own Accounts\" (that triggers cent-deposit verification that takes days). If your bank asks for {bank_name}'s address, use: {bank_address}.",
    auto: "💡 Tip for your mobile banking: use \"Send Money\", \"Pay a Person or Business\", or \"Bill Pay\". ⚠️ Don't use \"Link External Account\" or \"Transfer to My Own Accounts\". If your bank asks for a mailing address to register the payment to {bank_name}, you can enter your own US mailing address.",
  },
  de: {
    tip: "💡 Tipp für dein Mobile Banking: nutze \"Send Money\", \"Pay a Person or Business\" oder \"Bill Pay\". ⚠️ Nutze NICHT \"Link External Account\" oder \"Transfer to My Own Accounts\" (löst eine tagelange Cent-Betrag-Verifizierung aus). Falls deine Bank die Adresse von {bank_name} verlangt, nutze: {bank_address}.",
    auto: "💡 Tipp für dein Mobile Banking: nutze \"Send Money\", \"Pay a Person or Business\" oder \"Bill Pay\". ⚠️ Nutze NICHT \"Link External Account\" oder \"Transfer to My Own Accounts\". Falls deine Bank eine Postanschrift für die Zahlung an {bank_name} verlangt, kannst du deine eigene US-Adresse angeben.",
  },
  fr: {
    tip: "💡 Astuce pour ta banque mobile : utilise \"Send Money\", \"Pay a Person or Business\" ou \"Bill Pay\". ⚠️ N'utilise PAS \"Link External Account\" ni \"Transfer to My Own Accounts\" (déclenche une vérification par petits dépôts qui prend plusieurs jours). Si ta banque demande l'adresse de {bank_name}, utilise : {bank_address}.",
    auto: "💡 Astuce pour ta banque mobile : utilise \"Send Money\", \"Pay a Person or Business\" ou \"Bill Pay\". ⚠️ N'utilise PAS \"Link External Account\" ni \"Transfer to My Own Accounts\". Si ta banque demande une adresse postale pour enregistrer le paiement à {bank_name}, tu peux indiquer ta propre adresse aux États-Unis.",
  },
  it: {
    tip: "💡 Suggerimento per la tua banca mobile: usa \"Send Money\", \"Pay a Person or Business\" o \"Bill Pay\". ⚠️ NON usare \"Link External Account\" né \"Transfer to My Own Accounts\" (attiva una verifica con depositi di pochi centesimi che richiede giorni). Se la tua banca chiede l'indirizzo di {bank_name}, usa: {bank_address}.",
    auto: "💡 Suggerimento per la tua banca mobile: usa \"Send Money\", \"Pay a Person or Business\" o \"Bill Pay\". ⚠️ NON usare \"Link External Account\" né \"Transfer to My Own Accounts\". Se la tua banca chiede un indirizzo postale per registrare il pagamento a {bank_name}, puoi inserire il tuo indirizzo negli USA.",
  },
  nl: {
    tip: "💡 Tip voor je mobiel bankieren: gebruik \"Send Money\", \"Pay a Person or Business\" of \"Bill Pay\". ⚠️ Gebruik NIET \"Link External Account\" of \"Transfer to My Own Accounts\" (dat activeert een centenbedrag-verificatie die dagen duurt). Vraagt je bank om het adres van {bank_name}? Gebruik: {bank_address}.",
    auto: "💡 Tip voor je mobiel bankieren: gebruik \"Send Money\", \"Pay a Person or Business\" of \"Bill Pay\". ⚠️ Gebruik NIET \"Link External Account\" of \"Transfer to My Own Accounts\". Vraagt je bank om een postadres voor de betaling aan {bank_name}? Dan kun je je eigen Amerikaanse adres invullen.",
  },
  pt: {
    tip: "💡 Dica para seu banco no celular: use \"Send Money\", \"Pay a Person or Business\" ou \"Bill Pay\". ⚠️ NÃO use \"Link External Account\" nem \"Transfer to My Own Accounts\" (ativa uma verificação por depósitos de centavos que demora dias). Se seu banco pedir o endereço de {bank_name}, use: {bank_address}.",
    auto: "💡 Dica para seu banco no celular: use \"Send Money\", \"Pay a Person or Business\" ou \"Bill Pay\". ⚠️ NÃO use \"Link External Account\" nem \"Transfer to My Own Accounts\". Se seu banco pedir um endereço postal para registrar o pagamento a {bank_name}, você pode usar seu próprio endereço nos EUA.",
  },
  tr: {
    tip: "💡 Mobil bankacılığın için ipucu: \"Send Money\", \"Pay a Person or Business\" ya da \"Bill Pay\" kullan. ⚠️ \"Link External Account\" veya \"Transfer to My Own Accounts\" KULLANMA (günler süren küçük tutarlı doğrulamayı tetikler). Bankan {bank_name} adresini isterse şunu kullan: {bank_address}.",
    auto: "💡 Mobil bankacılığın için ipucu: \"Send Money\", \"Pay a Person or Business\" ya da \"Bill Pay\" kullan. ⚠️ \"Link External Account\" veya \"Transfer to My Own Accounts\" KULLANMA. Bankan {bank_name}'e ödemeyi kaydetmek için posta adresi isterse, kendi ABD adresini girebilirsin.",
  },
  ru: {
    tip: "💡 Совет для мобильного банка: используй \"Send Money\", \"Pay a Person or Business\" или \"Bill Pay\". ⚠️ НЕ используй \"Link External Account\" или \"Transfer to My Own Accounts\" (запускает проверку мелкими депозитами на несколько дней). Если банк просит адрес {bank_name}, используй: {bank_address}.",
    auto: "💡 Совет для мобильного банка: используй \"Send Money\", \"Pay a Person or Business\" или \"Bill Pay\". ⚠️ НЕ используй \"Link External Account\" или \"Transfer to My Own Accounts\". Если банк просит почтовый адрес для регистрации платежа {bank_name}, можешь указать свой адрес в США.",
  },
  vi: {
    tip: "💡 Mẹo cho ngân hàng di động của bạn: dùng \"Send Money\", \"Pay a Person or Business\" hoặc \"Bill Pay\". ⚠️ ĐỪNG dùng \"Link External Account\" hay \"Transfer to My Own Accounts\" (kích hoạt xác minh khoản tiền vài xu mất nhiều ngày). Nếu ngân hàng hỏi địa chỉ của {bank_name}, dùng: {bank_address}.",
    auto: "💡 Mẹo cho ngân hàng di động của bạn: dùng \"Send Money\", \"Pay a Person or Business\" hoặc \"Bill Pay\". ⚠️ ĐỪNG dùng \"Link External Account\" hay \"Transfer to My Own Accounts\". Nếu ngân hàng hỏi địa chỉ bưu điện để đăng ký thanh toán cho {bank_name}, bạn có thể dùng địa chỉ của mình tại Mỹ.",
  },
  id: {
    tip: "💡 Tips untuk mobile banking Anda: gunakan \"Send Money\", \"Pay a Person or Business\", atau \"Bill Pay\". ⚠️ JANGAN gunakan \"Link External Account\" atau \"Transfer to My Own Accounts\" (memicu verifikasi setoran receh yang memakan waktu berhari-hari). Jika bank meminta alamat {bank_name}, gunakan: {bank_address}.",
    auto: "💡 Tips untuk mobile banking Anda: gunakan \"Send Money\", \"Pay a Person or Business\", atau \"Bill Pay\". ⚠️ JANGAN gunakan \"Link External Account\" atau \"Transfer to My Own Accounts\". Jika bank meminta alamat pos untuk mendaftarkan pembayaran ke {bank_name}, Anda bisa memakai alamat Anda sendiri di AS.",
  },
  ja: {
    tip: "💡 モバイルバンキングでのヒント：「Send Money」「Pay a Person or Business」「Bill Pay」のいずれかを使ってください。⚠️「Link External Account」や「Transfer to My Own Accounts」は使わないでください（数日かかる少額入金確認が発生します）。銀行が{bank_name}の住所を求める場合はこちらを使ってください：{bank_address}。",
    auto: "💡 モバイルバンキングでのヒント：「Send Money」「Pay a Person or Business」「Bill Pay」のいずれかを使ってください。⚠️「Link External Account」や「Transfer to My Own Accounts」は使わないでください。銀行が{bank_name}への支払い登録のために郵送先住所を求める場合は、ご自身の米国の住所を入力できます。",
  },
  ko: {
    tip: "💡 모바일 뱅킹 팁: \"Send Money\", \"Pay a Person or Business\" 또는 \"Bill Pay\"를 사용하세요. ⚠️ \"Link External Account\"나 \"Transfer to My Own Accounts\"는 사용하지 마세요 (며칠이 걸리는 소액 입금 확인이 시작됩니다). 은행에서 {bank_name}의 주소를 요구하면 이걸 사용하세요: {bank_address}.",
    auto: "💡 모바일 뱅킹 팁: \"Send Money\", \"Pay a Person or Business\" 또는 \"Bill Pay\"를 사용하세요. ⚠️ \"Link External Account\"나 \"Transfer to My Own Accounts\"는 사용하지 마세요. 은행이 {bank_name}에 대한 결제 등록을 위해 우편 주소를 요구하면 본인의 미국 주소를 입력하면 됩니다.",
  },
  zh: {
    tip: "💡 手机银行小提示：请使用\"Send Money\"、\"Pay a Person or Business\"或\"Bill Pay\"。⚠️ 请勿使用\"Link External Account\"或\"Transfer to My Own Accounts\"（那会触发需要数天的小额存款验证）。如果您的银行要求{bank_name}的地址，请使用：{bank_address}。",
    auto: "💡 手机银行小提示：请使用\"Send Money\"、\"Pay a Person or Business\"或\"Bill Pay\"。⚠️ 请勿使用\"Link External Account\"或\"Transfer to My Own Accounts\"。如果您的银行要求提供邮寄地址以登记向{bank_name}的付款，您可以填写自己在美国的地址。",
  },
  hi: {
    tip: "💡 आपकी मोबाइल बैंकिंग के लिए सुझाव: \"Send Money\", \"Pay a Person or Business\" या \"Bill Pay\" का उपयोग करें। ⚠️ \"Link External Account\" या \"Transfer to My Own Accounts\" का उपयोग न करें (इससे कई दिन लगने वाली सेंट-जमा पुष्टि शुरू हो जाती है)। यदि आपका बैंक {bank_name} का पता माँगे, तो इसका उपयोग करें: {bank_address}।",
    auto: "💡 आपकी मोबाइल बैंकिंग के लिए सुझाव: \"Send Money\", \"Pay a Person or Business\" या \"Bill Pay\" का उपयोग करें। ⚠️ \"Link External Account\" या \"Transfer to My Own Accounts\" का उपयोग न करें। यदि आपका बैंक {bank_name} को भुगतान दर्ज करने के लिए डाक पता माँगे, तो आप अपना खुद का अमेरिकी पता दे सकते हैं।",
  },
  ar: {
    tip: "💡 نصيحة لتطبيق بنكك على الجوال: استخدم \"Send Money\" أو \"Pay a Person or Business\" أو \"Bill Pay\". ⚠️ لا تستخدم \"Link External Account\" أو \"Transfer to My Own Accounts\" (فذلك يفعّل تحققًا بإيداعات صغيرة يستغرق عدة أيام). إذا طلب بنكك عنوان {bank_name}، استخدم: {bank_address}.",
    auto: "💡 نصيحة لتطبيق بنكك على الجوال: استخدم \"Send Money\" أو \"Pay a Person or Business\" أو \"Bill Pay\". ⚠️ لا تستخدم \"Link External Account\" أو \"Transfer to My Own Accounts\". إذا طلب بنكك عنوانًا بريديًا لتسجيل الدفع إلى {bank_name}، يمكنك إدخال عنوانك الخاص في الولايات المتحدة.",
  },
  am: {
    tip: "💡 ለሞባይል ባንክዎ ምክር: \"Send Money\"፣ \"Pay a Person or Business\" ወይም \"Bill Pay\" ይጠቀሙ። ⚠️ \"Link External Account\" ወይም \"Transfer to My Own Accounts\" አይጠቀሙ (ይህ ቀናት የሚወስድ የሳንቲም ተቀማጭ ማረጋገጫ ያስነሳል)። ባንክዎ የ{bank_name}ን አድራሻ ከጠየቀ፣ ይህን ይጠቀሙ፦ {bank_address}።",
    auto: "💡 ለሞባይል ባንክዎ ምክር: \"Send Money\"፣ \"Pay a Person or Business\" ወይም \"Bill Pay\" ይጠቀሙ። ⚠️ \"Link External Account\" ወይም \"Transfer to My Own Accounts\" አይጠቀሙ። ባንክዎ ለ{bank_name} ክፍያ ለመመዝገብ የፖስታ አድራሻ ከጠየቀ፣ የራስዎን የአሜሪካ አድራሻ ማስገባት ይችላሉ።",
  },
  ha: {
    tip: "💡 Shawara don bankin ka na wayarka: yi amfani da \"Send Money\", \"Pay a Person or Business\" ko \"Bill Pay\". ⚠️ KADA ka yi amfani da \"Link External Account\" ko \"Transfer to My Own Accounts\" (hakan yana kunna tabbatarwar ajiyar kudi kadan wanda yake ɗaukar kwanaki). Idan bankinka ya nemi adireshin {bank_name}, yi amfani da: {bank_address}.",
    auto: "💡 Shawara don bankin ka na wayarka: yi amfani da \"Send Money\", \"Pay a Person or Business\" ko \"Bill Pay\". ⚠️ KADA ka yi amfani da \"Link External Account\" ko \"Transfer to My Own Accounts\". Idan bankinka ya nemi adireshin gidan waya don rijistar biyan kuɗi ga {bank_name}, za ka iya shigar da adireshinka na Amurka.",
  },
  sw: {
    tip: "💡 Kidokezo kwa benki yako ya simu: tumia \"Send Money\", \"Pay a Person or Business\" au \"Bill Pay\". ⚠️ USITUMIE \"Link External Account\" au \"Transfer to My Own Accounts\" (huwasha uthibitisho wa amana ndogo unaochukua siku kadhaa). Ikiwa benki yako inaomba anwani ya {bank_name}, tumia: {bank_address}.",
    auto: "💡 Kidokezo kwa benki yako ya simu: tumia \"Send Money\", \"Pay a Person or Business\" au \"Bill Pay\". ⚠️ USITUMIE \"Link External Account\" au \"Transfer to My Own Accounts\". Ikiwa benki yako inaomba anwani ya posta kusajili malipo kwa {bank_name}, unaweza kutumia anwani yako mwenyewe ya Marekani.",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp.confirmed_deposit_ach_tip = keys.tip;
  json.whatsapp.confirmed_deposit_ach_tip_auto = keys.auto;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
