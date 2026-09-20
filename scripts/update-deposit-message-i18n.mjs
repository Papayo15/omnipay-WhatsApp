// One-shot: reword confirmed_deposit_intro ("Deposita" → "Transfiere desde tu banca móvil")
// and add confirmed_deposit_lead (new key, bold "this account is yours" message, now sent
// FIRST) — feedback from live testing: the most important fact (the account is reusable,
// save it) was buried at the end of a long message; leading with it in bold reads much
// clearer, and "Deposita" read like a teller-window instruction rather than "open your
// banking app and send this like you would any transfer."
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: {
    intro: "✅ Todo listo. Transfiere desde tu banca móvil exactamente {amount} {currency} vía {rail} a esta cuenta:",
    lead: "*Esta cuenta es tuya — te sirve siempre que quieras enviarle dinero a {recipient_name} en {country_name}. ¡Guárdala!*\n\nPuedes reutilizarla las veces que quieras, solo entra a tu banco y cambia el monto, sin necesidad de escribirnos aquí de nuevo. (Si le envías a otro país, sí necesitarás iniciar un nuevo envío aquí.)",
  },
  en: {
    intro: "✅ All set. From your mobile banking app, transfer exactly {amount} {currency} via {rail} to this account:",
    lead: "*This account is yours — use it anytime you want to send money to {recipient_name} in {country_name}. Save it!*\n\nYou can reuse it as many times as you want, just open your bank app and change the amount, no need to message us here again. (Sending to a different country will need a new setup here.)",
  },
  de: {
    intro: "✅ Fertig. Überweise über deine Mobile-Banking-App genau {amount} {currency} per {rail} auf dieses Konto:",
    lead: "*Dieses Konto gehört dir — nutze es immer, wenn du Geld an {recipient_name} in {country_name} senden möchtest. Speichere es dir!*\n\nDu kannst es beliebig oft wiederverwenden, öffne einfach deine Banking-App und ändere den Betrag, ohne uns hier erneut zu schreiben. (Für ein anderes Land brauchst du einen neuen Vorgang hier.)",
  },
  fr: {
    intro: "✅ C'est prêt. Depuis ton appli bancaire mobile, transfère exactement {amount} {currency} via {rail} sur ce compte :",
    lead: "*Ce compte est le tien — utilise-le à chaque fois que tu veux envoyer de l'argent à {recipient_name} en/au {country_name}. Enregistre-le !*\n\nTu peux le réutiliser autant de fois que tu veux, ouvre juste ton appli bancaire et change le montant, pas besoin de nous réécrire ici. (Pour un autre pays, il faudra un nouvel envoi ici.)",
  },
  it: {
    intro: "✅ Tutto pronto. Dalla tua app bancaria mobile, trasferisci esattamente {amount} {currency} tramite {rail} su questo conto:",
    lead: "*Questo conto è tuo — usalo ogni volta che vuoi inviare denaro a {recipient_name} in {country_name}. Salvalo!*\n\nPuoi riutilizzarlo tutte le volte che vuoi, apri solo la tua app bancaria e cambia l'importo, senza doverci riscrivere qui. (Per un altro paese servirà un nuovo invio qui.)",
  },
  nl: {
    intro: "✅ Helemaal klaar. Maak via je mobiele bankapp precies {amount} {currency} over via {rail} naar deze rekening:",
    lead: "*Deze rekening is van jou — gebruik hem elke keer als je geld wilt sturen naar {recipient_name} in {country_name}. Bewaar hem!*\n\nJe kunt hem zo vaak hergebruiken als je wilt, open gewoon je bank-app en wijzig het bedrag, zonder ons hier opnieuw te hoeven schrijven. (Voor een ander land is een nieuwe aanvraag hier nodig.)",
  },
  pt: {
    intro: "✅ Tudo pronto. No seu app do banco, transfira exatamente {amount} {currency} via {rail} para esta conta:",
    lead: "*Esta conta é sua — use sempre que quiser enviar dinheiro para {recipient_name} em {country_name}. Guarde-a!*\n\nVocê pode reutilizá-la quantas vezes quiser, é só abrir seu app do banco e mudar o valor, sem precisar nos escrever aqui de novo. (Para outro país, será preciso iniciar um novo envio aqui.)",
  },
  tr: {
    intro: "✅ Her şey hazır. Mobil bankacılık uygulamandan {rail} üzerinden bu hesaba tam olarak {amount} {currency} transfer et:",
    lead: "*Bu hesap senin — {country_name}'deki {recipient_name}'e ne zaman para göndermek istersen kullan. Kaydet!*\n\nİstediğin kadar tekrar kullanabilirsin, sadece bankacılık uygulamanı aç ve tutarı değiştir, buraya tekrar yazmana gerek yok. (Başka bir ülkeye göndermek için burada yeni bir işlem başlatman gerekecek.)",
  },
  ru: {
    intro: "✅ Всё готово. В приложении твоего банка переведи ровно {amount} {currency} через {rail} на этот счёт:",
    lead: "*Этот счёт твой — используй его каждый раз, когда захочешь отправить деньги {recipient_name} в {country_name}. Сохрани его!*\n\nМожешь использовать его сколько угодно раз, просто открой приложение банка и измени сумму, не нужно писать нам снова. (Для другой страны понадобится новый перевод здесь.)",
  },
  vi: {
    intro: "✅ Xong rồi. Từ ứng dụng ngân hàng di động, chuyển chính xác {amount} {currency} qua {rail} vào tài khoản này:",
    lead: "*Tài khoản này là của bạn — dùng bất cứ khi nào bạn muốn gửi tiền cho {recipient_name} tại {country_name}. Hãy lưu lại!*\n\nBạn có thể dùng lại nhiều lần tùy thích, chỉ cần mở ứng dụng ngân hàng và đổi số tiền, không cần nhắn lại ở đây. (Nếu gửi sang nước khác, bạn sẽ cần bắt đầu một lượt gửi mới ở đây.)",
  },
  id: {
    intro: "✅ Semua siap. Dari aplikasi mobile banking Anda, setorkan tepat {amount} {currency} via {rail} ke rekening ini:",
    lead: "*Rekening ini milik Anda — gunakan kapan saja Anda ingin mengirim uang ke {recipient_name} di {country_name}. Simpan ini!*\n\nAnda bisa menggunakannya lagi kapan saja, cukup buka aplikasi bank Anda dan ubah jumlahnya, tanpa perlu menghubungi kami lagi di sini. (Untuk negara lain, Anda perlu memulai pengiriman baru di sini.)",
  },
  ja: {
    intro: "✅ 準備完了です。モバイルバンキングアプリから、{rail} でこの口座に {amount} {currency} を正確に送金してください:",
    lead: "*この口座はあなたのものです — {country_name}の{recipient_name}さんに送金したいときはいつでも使えます。保存しておいてください！*\n\n何度でも再利用でき、銀行アプリを開いて金額を変えるだけで、ここに再度書き込む必要はありません。（別の国へ送る場合は、ここで新しく手続きが必要です。）",
  },
  ko: {
    intro: "✅ 준비 완료. 모바일 뱅킹 앱에서 {rail}을(를) 통해 이 계좌로 정확히 {amount} {currency}를 이체하세요:",
    lead: "*이 계좌는 당신 것입니다 — {country_name}의 {recipient_name}님에게 돈을 보내고 싶을 때 언제든 사용하세요. 저장해두세요!*\n\n몇 번이든 다시 사용할 수 있으며, 은행 앱을 열어 금액만 바꾸면 됩니다. 여기에 다시 메시지를 보낼 필요는 없어요. (다른 국가로 보내려면 여기서 새로 시작해야 합니다.)",
  },
  zh: {
    intro: "✅ 一切就绪。请在您的手机银行应用中，通过 {rail} 向此账户准确转账 {amount} {currency}:",
    lead: "*这个账户是您的——只要您想给{country_name}的{recipient_name}汇款，随时可以使用。请保存好！*\n\n您可以多次重复使用，只需打开您的银行应用并更改金额，无需再次在此给我们发消息。（汇往其他国家需要在此重新发起一次汇款。）",
  },
  hi: {
    intro: "✅ सब तैयार है। अपने मोबाइल बैंकिंग ऐप से, {rail} के ज़रिए इस खाते में ठीक {amount} {currency} भेजें:",
    lead: "*यह खाता आपका है — जब भी आप {country_name} में {recipient_name} को पैसे भेजना चाहें, इसका उपयोग करें। इसे सहेज लें!*\n\nआप इसे जितनी बार चाहें दोबारा उपयोग कर सकते हैं, बस अपना बैंक ऐप खोलें और राशि बदलें, यहाँ दोबारा लिखने की ज़रूरत नहीं। (किसी दूसरे देश भेजने के लिए यहाँ नया भेजना शुरू करना होगा।)",
  },
  ar: {
    intro: "✅ كل شيء جاهز. من تطبيق الخدمات المصرفية على هاتفك، حوّل بالضبط {amount} {currency} عبر {rail} إلى هذا الحساب:",
    lead: "*هذا الحساب ملكك — استخدمه في أي وقت تريد إرسال أموال إلى {recipient_name} في {country_name}. احفظه!*\n\nيمكنك إعادة استخدامه كما تشاء، فقط افتح تطبيق البنك وغيّر المبلغ، دون الحاجة للكتابة لنا هنا مرة أخرى. (للإرسال إلى بلد آخر ستحتاج لبدء تحويل جديد هنا.)",
  },
  am: {
    intro: "✅ ሁሉም ተዘጋጅቷል። ከሞባይል ባንክ መተግበሪያዎ፣ በ {rail} በኩል በትክክል {amount} {currency} ወደዚህ አካውንት ያስተላልፉ:",
    lead: "*ይህ አካውንት የእርስዎ ነው — ለ{country_name} ውስጥ ላለው {recipient_name} ገንዘብ መላክ በፈለጉ ጊዜ ሁሉ ይጠቀሙበት። ያስቀምጡት!*\n\nበፈለጉት ጊዜ ደጋግመው መጠቀም ይችላሉ፣ የባንክ መተግበሪያዎን ከፍተው መጠኑን ብቻ ይቀይሩ፣ እዚህ እንደገና መጻፍ አያስፈልግም። (ለሌላ ሀገር ለመላክ እዚህ አዲስ ማስተላለፍ መጀመር ያስፈልጋል።)",
  },
  ha: {
    intro: "✅ An shirya. Daga aikace-aikacen banki na wayarka, tura daidai {amount} {currency} ta hanyar {rail} zuwa wannan asusun:",
    lead: "*Wannan asusun naka ne — yi amfani da shi duk lokacin da kake son aika kuɗi ga {recipient_name} a {country_name}. Ajiye shi!*\n\nZaka iya sake amfani da shi sau da yawa, kawai buɗe aikace-aikacen bankinka ka canza adadin, ba tare da bukatar sake rubuto mana anan ba. (Idan za ka aika zuwa wata ƙasa, za ka buƙaci fara sabon aikawa anan.)",
  },
  sw: {
    intro: "✅ Tayari. Kutoka programu yako ya benki ya simu, tuma kamili {amount} {currency} kupitia {rail} kwenye akaunti hii:",
    lead: "*Akaunti hii ni yako — itumie wakati wowote unapotaka kutuma pesa kwa {recipient_name} nchini {country_name}. Ihifadhi!*\n\nUnaweza kuitumia tena mara nyingi upendavyo, fungua tu programu yako ya benki na ubadilishe kiasi, bila kuhitaji kutuandikia hapa tena. (Ukituma kwa nchi nyingine, utahitaji kuanzisha utumaji mpya hapa.)",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp.confirmed_deposit_intro = keys.intro;
  json.whatsapp.confirmed_deposit_lead = keys.lead;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
