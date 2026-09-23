// One-shot: rewrites "confirmed_deposit_ach_tip"/"_auto" to clearly rank the free US options
// by speed: "Send Money"/"Pay a Person or Business" (1-3 business days) as the default, and
// demotes "Bill Pay" to a last-resort mention — it's also free, but commonly slower (5-7
// days, some banks mail a paper check instead of sending electronically) than a direct
// person-to-person transfer. Previously Bill Pay was listed as an equal first option, which
// could lead someone straight to the slowest free method. "Wire" is intentionally never
// mentioned here — it costs the sender a real fee ($25-35) that FedNow/ACH don't, and was
// never meant to be a recommended option (the "ACH / Wire" rail LABEL is separate from what
// this tip recommends — that label itself is also being fixed to just "ACH" in code).
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: {
    tip: "💡 Usa \"Send Money\" o \"Pay a Person or Business\" en tu banca móvil — gratis, llega en 1-3 días hábiles. ⚠️ No uses \"Link External Account\" ni \"Transfer to My Own Accounts\" (eso activa depósitos de prueba de centavos que tardan días). Si tu banco te pide la dirección de {bank_name}, usa: {bank_address}. Como última opción, \"Bill Pay\" también es gratis pero puede tardar 5-7 días.",
    auto: "💡 Usa \"Send Money\" o \"Pay a Person or Business\" en tu banca móvil — gratis, llega en 1-3 días hábiles. ⚠️ No uses \"Link External Account\" ni \"Transfer to My Own Accounts\". Si tu banco te pide una dirección postal para registrar el pago a {bank_name}, puedes ingresar tu propia dirección física en EE. UU. Como última opción, \"Bill Pay\" también es gratis pero puede tardar 5-7 días.",
  },
  en: {
    tip: "💡 Use \"Send Money\" or \"Pay a Person or Business\" in your mobile banking — free, arrives in 1-3 business days. ⚠️ Don't use \"Link External Account\" or \"Transfer to My Own Accounts\" (that triggers cent-deposit verification that takes days). If your bank asks for {bank_name}'s address, use: {bank_address}. As a last resort, \"Bill Pay\" is also free but can take 5-7 days.",
    auto: "💡 Use \"Send Money\" or \"Pay a Person or Business\" in your mobile banking — free, arrives in 1-3 business days. ⚠️ Don't use \"Link External Account\" or \"Transfer to My Own Accounts\". If your bank asks for a mailing address to register the payment to {bank_name}, you can enter your own US mailing address. As a last resort, \"Bill Pay\" is also free but can take 5-7 days.",
  },
  de: {
    tip: "💡 Nutze \"Send Money\" oder \"Pay a Person or Business\" in deinem Mobile Banking — kostenlos, kommt in 1-3 Werktagen an. ⚠️ Nutze NICHT \"Link External Account\" oder \"Transfer to My Own Accounts\" (löst eine tagelange Cent-Betrag-Verifizierung aus). Falls deine Bank die Adresse von {bank_name} verlangt, nutze: {bank_address}. Als letzte Option ist auch \"Bill Pay\" kostenlos, kann aber 5-7 Tage dauern.",
    auto: "💡 Nutze \"Send Money\" oder \"Pay a Person or Business\" in deinem Mobile Banking — kostenlos, kommt in 1-3 Werktagen an. ⚠️ Nutze NICHT \"Link External Account\" oder \"Transfer to My Own Accounts\". Falls deine Bank eine Postanschrift für die Zahlung an {bank_name} verlangt, kannst du deine eigene US-Adresse angeben. Als letzte Option ist auch \"Bill Pay\" kostenlos, kann aber 5-7 Tage dauern.",
  },
  fr: {
    tip: "💡 Utilise \"Send Money\" ou \"Pay a Person or Business\" dans ta banque mobile — gratuit, arrive en 1-3 jours ouvrés. ⚠️ N'utilise PAS \"Link External Account\" ni \"Transfer to My Own Accounts\" (déclenche une vérification par petits dépôts qui prend plusieurs jours). Si ta banque demande l'adresse de {bank_name}, utilise : {bank_address}. En dernier recours, \"Bill Pay\" est aussi gratuit mais peut prendre 5-7 jours.",
    auto: "💡 Utilise \"Send Money\" ou \"Pay a Person or Business\" dans ta banque mobile — gratuit, arrive en 1-3 jours ouvrés. ⚠️ N'utilise PAS \"Link External Account\" ni \"Transfer to My Own Accounts\". Si ta banque demande une adresse postale pour le paiement à {bank_name}, tu peux indiquer ta propre adresse aux États-Unis. En dernier recours, \"Bill Pay\" est aussi gratuit mais peut prendre 5-7 jours.",
  },
  it: {
    tip: "💡 Usa \"Send Money\" o \"Pay a Person or Business\" nella tua banca mobile — gratis, arriva in 1-3 giorni lavorativi. ⚠️ NON usare \"Link External Account\" né \"Transfer to My Own Accounts\" (attiva una verifica con depositi di pochi centesimi che richiede giorni). Se la tua banca chiede l'indirizzo di {bank_name}, usa: {bank_address}. Come ultima opzione, anche \"Bill Pay\" è gratis ma può richiedere 5-7 giorni.",
    auto: "💡 Usa \"Send Money\" o \"Pay a Person or Business\" nella tua banca mobile — gratis, arriva in 1-3 giorni lavorativi. ⚠️ NON usare \"Link External Account\" né \"Transfer to My Own Accounts\". Se la tua banca chiede un indirizzo postale per registrare il pagamento a {bank_name}, puoi inserire il tuo indirizzo negli USA. Come ultima opzione, anche \"Bill Pay\" è gratis ma può richiedere 5-7 giorni.",
  },
  nl: {
    tip: "💡 Gebruik \"Send Money\" of \"Pay a Person or Business\" in je mobiel bankieren — gratis, komt binnen 1-3 werkdagen aan. ⚠️ Gebruik NIET \"Link External Account\" of \"Transfer to My Own Accounts\" (dat activeert een centenbedrag-verificatie die dagen duurt). Vraagt je bank om het adres van {bank_name}? Gebruik: {bank_address}. Als laatste optie is \"Bill Pay\" ook gratis maar kan 5-7 dagen duren.",
    auto: "💡 Gebruik \"Send Money\" of \"Pay a Person or Business\" in je mobiel bankieren — gratis, komt binnen 1-3 werkdagen aan. ⚠️ Gebruik NIET \"Link External Account\" of \"Transfer to My Own Accounts\". Vraagt je bank om een postadres voor de betaling aan {bank_name}? Dan kun je je eigen Amerikaanse adres invullen. Als laatste optie is \"Bill Pay\" ook gratis maar kan 5-7 dagen duren.",
  },
  pt: {
    tip: "💡 Use \"Send Money\" ou \"Pay a Person or Business\" no seu banco no celular — grátis, chega em 1-3 dias úteis. ⚠️ NÃO use \"Link External Account\" nem \"Transfer to My Own Accounts\" (ativa uma verificação por depósitos de centavos que demora dias). Se seu banco pedir o endereço de {bank_name}, use: {bank_address}. Como última opção, \"Bill Pay\" também é grátis mas pode levar 5-7 dias.",
    auto: "💡 Use \"Send Money\" ou \"Pay a Person or Business\" no seu banco no celular — grátis, chega em 1-3 dias úteis. ⚠️ NÃO use \"Link External Account\" nem \"Transfer to My Own Accounts\". Se seu banco pedir um endereço postal para registrar o pagamento a {bank_name}, você pode usar seu próprio endereço nos EUA. Como última opção, \"Bill Pay\" também é grátis mas pode levar 5-7 dias.",
  },
  tr: {
    tip: "💡 Mobil bankacılığında \"Send Money\" ya da \"Pay a Person or Business\" kullan — ücretsiz, 1-3 iş gününde ulaşır. ⚠️ \"Link External Account\" veya \"Transfer to My Own Accounts\" KULLANMA (günler süren küçük tutarlı doğrulamayı tetikler). Bankan {bank_name} adresini isterse şunu kullan: {bank_address}. Son çare olarak \"Bill Pay\" de ücretsizdir ama 5-7 gün sürebilir.",
    auto: "💡 Mobil bankacılığında \"Send Money\" ya da \"Pay a Person or Business\" kullan — ücretsiz, 1-3 iş gününde ulaşır. ⚠️ \"Link External Account\" veya \"Transfer to My Own Accounts\" KULLANMA. Bankan {bank_name}'e ödemeyi kaydetmek için posta adresi isterse, kendi ABD adresini girebilirsin. Son çare olarak \"Bill Pay\" de ücretsizdir ama 5-7 gün sürebilir.",
  },
  ru: {
    tip: "💡 Используй \"Send Money\" или \"Pay a Person or Business\" в мобильном банке — бесплатно, приходит за 1-3 рабочих дня. ⚠️ НЕ используй \"Link External Account\" или \"Transfer to My Own Accounts\" (запускает проверку мелкими депозитами на несколько дней). Если банк просит адрес {bank_name}, используй: {bank_address}. В крайнем случае \"Bill Pay\" тоже бесплатен, но может занять 5-7 дней.",
    auto: "💡 Используй \"Send Money\" или \"Pay a Person or Business\" в мобильном банке — бесплатно, приходит за 1-3 рабочих дня. ⚠️ НЕ используй \"Link External Account\" или \"Transfer to My Own Accounts\". Если банк просит почтовый адрес для регистрации платежа {bank_name}, можешь указать свой адрес в США. В крайнем случае \"Bill Pay\" тоже бесплатен, но может занять 5-7 дней.",
  },
  vi: {
    tip: "💡 Dùng \"Send Money\" hoặc \"Pay a Person or Business\" trong ngân hàng di động — miễn phí, đến trong 1-3 ngày làm việc. ⚠️ ĐỪNG dùng \"Link External Account\" hay \"Transfer to My Own Accounts\" (kích hoạt xác minh khoản tiền vài xu mất nhiều ngày). Nếu ngân hàng hỏi địa chỉ của {bank_name}, dùng: {bank_address}. Lựa chọn cuối cùng, \"Bill Pay\" cũng miễn phí nhưng có thể mất 5-7 ngày.",
    auto: "💡 Dùng \"Send Money\" hoặc \"Pay a Person or Business\" trong ngân hàng di động — miễn phí, đến trong 1-3 ngày làm việc. ⚠️ ĐỪNG dùng \"Link External Account\" hay \"Transfer to My Own Accounts\". Nếu ngân hàng hỏi địa chỉ bưu điện để đăng ký thanh toán cho {bank_name}, bạn có thể dùng địa chỉ của mình tại Mỹ. Lựa chọn cuối cùng, \"Bill Pay\" cũng miễn phí nhưng có thể mất 5-7 ngày.",
  },
  id: {
    tip: "💡 Gunakan \"Send Money\" atau \"Pay a Person or Business\" di mobile banking Anda — gratis, sampai dalam 1-3 hari kerja. ⚠️ JANGAN gunakan \"Link External Account\" atau \"Transfer to My Own Accounts\" (memicu verifikasi setoran receh yang memakan waktu berhari-hari). Jika bank meminta alamat {bank_name}, gunakan: {bank_address}. Sebagai pilihan terakhir, \"Bill Pay\" juga gratis tapi bisa memakan waktu 5-7 hari.",
    auto: "💡 Gunakan \"Send Money\" atau \"Pay a Person or Business\" di mobile banking Anda — gratis, sampai dalam 1-3 hari kerja. ⚠️ JANGAN gunakan \"Link External Account\" atau \"Transfer to My Own Accounts\". Jika bank meminta alamat pos untuk mendaftarkan pembayaran ke {bank_name}, Anda bisa memakai alamat Anda sendiri di AS. Sebagai pilihan terakhir, \"Bill Pay\" juga gratis tapi bisa memakan waktu 5-7 hari.",
  },
  ja: {
    tip: "💡 モバイルバンキングで「Send Money」または「Pay a Person or Business」を使ってください — 無料で、1〜3営業日で届きます。⚠️「Link External Account」や「Transfer to My Own Accounts」は使わないでください（数日かかる少額入金確認が発生します）。銀行が{bank_name}の住所を求める場合はこちらを使ってください：{bank_address}。最後の手段として「Bill Pay」も無料ですが、5〜7日かかることがあります。",
    auto: "💡 モバイルバンキングで「Send Money」または「Pay a Person or Business」を使ってください — 無料で、1〜3営業日で届きます。⚠️「Link External Account」や「Transfer to My Own Accounts」は使わないでください。銀行が{bank_name}への支払い登録のために郵送先住所を求める場合は、ご自身の米国の住所を入力できます。最後の手段として「Bill Pay」も無料ですが、5〜7日かかることがあります。",
  },
  ko: {
    tip: "💡 모바일 뱅킹에서 \"Send Money\" 또는 \"Pay a Person or Business\"를 사용하세요 — 무료이며 1-3영업일 내 도착합니다. ⚠️ \"Link External Account\"나 \"Transfer to My Own Accounts\"는 사용하지 마세요 (며칠이 걸리는 소액 입금 확인이 시작됩니다). 은행에서 {bank_name}의 주소를 요구하면 이걸 사용하세요: {bank_address}. 최후의 수단으로 \"Bill Pay\"도 무료지만 5-7일이 걸릴 수 있습니다.",
    auto: "💡 모바일 뱅킹에서 \"Send Money\" 또는 \"Pay a Person or Business\"를 사용하세요 — 무료이며 1-3영업일 내 도착합니다. ⚠️ \"Link External Account\"나 \"Transfer to My Own Accounts\"는 사용하지 마세요. 은행이 {bank_name}에 대한 결제 등록을 위해 우편 주소를 요구하면 본인의 미국 주소를 입력하면 됩니다. 최후의 수단으로 \"Bill Pay\"도 무료지만 5-7일이 걸릴 수 있습니다.",
  },
  zh: {
    tip: "💡 在手机银行中使用\"Send Money\"或\"Pay a Person or Business\"——免费，1-3个工作日到账。⚠️ 请勿使用\"Link External Account\"或\"Transfer to My Own Accounts\"（那会触发需要数天的小额存款验证）。如果您的银行要求{bank_name}的地址，请使用：{bank_address}。作为最后的选择，\"Bill Pay\"也是免费的，但可能需要5-7天。",
    auto: "💡 在手机银行中使用\"Send Money\"或\"Pay a Person or Business\"——免费，1-3个工作日到账。⚠️ 请勿使用\"Link External Account\"或\"Transfer to My Own Accounts\"。如果您的银行要求提供邮寄地址以登记向{bank_name}的付款，您可以填写自己在美国的地址。作为最后的选择，\"Bill Pay\"也是免费的，但可能需要5-7天。",
  },
  hi: {
    tip: "💡 अपनी मोबाइल बैंकिंग में \"Send Money\" या \"Pay a Person or Business\" का उपयोग करें — मुफ़्त, 1-3 कार्यदिवसों में पहुंचता है। ⚠️ \"Link External Account\" या \"Transfer to My Own Accounts\" का उपयोग न करें (इससे कई दिन लगने वाली सेंट-जमा पुष्टि शुरू हो जाती है)। यदि आपका बैंक {bank_name} का पता माँगे, तो इसका उपयोग करें: {bank_address}। अंतिम विकल्प के रूप में, \"Bill Pay\" भी मुफ़्त है लेकिन इसमें 5-7 दिन लग सकते हैं।",
    auto: "💡 अपनी मोबाइल बैंकिंग में \"Send Money\" या \"Pay a Person or Business\" का उपयोग करें — मुफ़्त, 1-3 कार्यदिवसों में पहुंचता है। ⚠️ \"Link External Account\" या \"Transfer to My Own Accounts\" का उपयोग न करें। यदि आपका बैंक {bank_name} को भुगतान दर्ज करने के लिए डाक पता माँगे, तो आप अपना खुद का अमेरिकी पता दे सकते हैं। अंतिम विकल्प के रूप में, \"Bill Pay\" भी मुफ़्त है लेकिन इसमें 5-7 दिन लग सकते हैं।",
  },
  ar: {
    tip: "💡 استخدم \"Send Money\" أو \"Pay a Person or Business\" في تطبيق بنكك على الجوال — مجانًا، يصل خلال 1-3 أيام عمل. ⚠️ لا تستخدم \"Link External Account\" أو \"Transfer to My Own Accounts\" (فذلك يفعّل تحققًا بإيداعات صغيرة يستغرق عدة أيام). إذا طلب بنكك عنوان {bank_name}، استخدم: {bank_address}. كخيار أخير، \"Bill Pay\" مجاني أيضًا لكنه قد يستغرق 5-7 أيام.",
    auto: "💡 استخدم \"Send Money\" أو \"Pay a Person or Business\" في تطبيق بنكك على الجوال — مجانًا، يصل خلال 1-3 أيام عمل. ⚠️ لا تستخدم \"Link External Account\" أو \"Transfer to My Own Accounts\". إذا طلب بنكك عنوانًا بريديًا لتسجيل الدفع إلى {bank_name}، يمكنك إدخال عنوانك الخاص في الولايات المتحدة. كخيار أخير، \"Bill Pay\" مجاني أيضًا لكنه قد يستغرق 5-7 أيام.",
  },
  am: {
    tip: "💡 በሞባይል ባንክዎ \"Send Money\" ወይም \"Pay a Person or Business\" ይጠቀሙ — ነፃ ነው፣ በ1-3 የስራ ቀናት ውስጥ ይደርሳል። ⚠️ \"Link External Account\" ወይም \"Transfer to My Own Accounts\" አይጠቀሙ (ይህ ቀናት የሚወስድ የሳንቲም ተቀማጭ ማረጋገጫ ያስነሳል)። ባንክዎ የ{bank_name}ን አድራሻ ከጠየቀ፣ ይህን ይጠቀሙ፦ {bank_address}። እንደ መጨረሻ አማራጭ፣ \"Bill Pay\" ደግሞ ነፃ ነው ግን 5-7 ቀናት ሊወስድ ይችላል።",
    auto: "💡 በሞባይል ባንክዎ \"Send Money\" ወይም \"Pay a Person or Business\" ይጠቀሙ — ነፃ ነው፣ በ1-3 የስራ ቀናት ውስጥ ይደርሳል። ⚠️ \"Link External Account\" ወይም \"Transfer to My Own Accounts\" አይጠቀሙ። ባንክዎ ለ{bank_name} ክፍያ ለመመዝገብ የፖስታ አድራሻ ከጠየቀ፣ የራስዎን የአሜሪካ አድራሻ ማስገባት ይችላሉ። እንደ መጨረሻ አማራጭ፣ \"Bill Pay\" ደግሞ ነፃ ነው ግን 5-7 ቀናት ሊወስድ ይችላል።",
  },
  ha: {
    tip: "💡 Yi amfani da \"Send Money\" ko \"Pay a Person or Business\" a bankin ka na wayarka — kyauta, yakan isa cikin kwanaki 1-3 na aiki. ⚠️ KADA ka yi amfani da \"Link External Account\" ko \"Transfer to My Own Accounts\" (hakan yana kunna tabbatarwar ajiyar kudi kadan wanda yake ɗaukar kwanaki). Idan bankinka ya nemi adireshin {bank_name}, yi amfani da: {bank_address}. A matsayin zaɓi na ƙarshe, \"Bill Pay\" ma kyauta ne amma zai iya ɗaukar kwanaki 5-7.",
    auto: "💡 Yi amfani da \"Send Money\" ko \"Pay a Person or Business\" a bankin ka na wayarka — kyauta, yakan isa cikin kwanaki 1-3 na aiki. ⚠️ KADA ka yi amfani da \"Link External Account\" ko \"Transfer to My Own Accounts\". Idan bankinka ya nemi adireshin gidan waya don rijistar biyan kuɗi ga {bank_name}, za ka iya shigar da adireshinka na Amurka. A matsayin zaɓi na ƙarshe, \"Bill Pay\" ma kyauta ne amma zai iya ɗaukar kwanaki 5-7.",
  },
  sw: {
    tip: "💡 Tumia \"Send Money\" au \"Pay a Person or Business\" kwenye benki yako ya simu — bure, hufika kwa siku 1-3 za kazi. ⚠️ USITUMIE \"Link External Account\" au \"Transfer to My Own Accounts\" (huwasha uthibitisho wa amana ndogo unaochukua siku kadhaa). Ikiwa benki yako inaomba anwani ya {bank_name}, tumia: {bank_address}. Kama chaguo la mwisho, \"Bill Pay\" pia ni bure lakini inaweza kuchukua siku 5-7.",
    auto: "💡 Tumia \"Send Money\" au \"Pay a Person or Business\" kwenye benki yako ya simu — bure, hufika kwa siku 1-3 za kazi. ⚠️ USITUMIE \"Link External Account\" au \"Transfer to My Own Accounts\". Ikiwa benki yako inaomba anwani ya posta kusajili malipo kwa {bank_name}, unaweza kutumia anwani yako mwenyewe ya Marekani. Kama chaguo la mwisho, \"Bill Pay\" pia ni bure lakini inaweza kuchukua siku 5-7.",
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
