// One-shot: adds two keys to the "whatsapp" namespace across all 19 messages/*.json —
// clarifying that a Bridge deposit account (VA/liquidation address) is reusable forever
// for a given recipient, so the user doesn't need to come back to WhatsApp every time:
//   - confirmed_deposit_reusable: appended to the final deposit-instructions message
//   - greeting_reuse_hint: appended to the initial greeting
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    confirmed_deposit_reusable: "💡 Save this account in your banking app — it's yours for good. You can reuse it as many times as you want to send to {recipient_name}, just open your bank app and change the amount, no need to message us here again.",
    greeting_reuse_hint: "💡 Already sent to this recipient before? No need to message us again — just use the same account from your banking app.",
  },
  es: {
    confirmed_deposit_reusable: "💡 Guarda esta cuenta en tu app bancaria: es tuya para siempre. Puedes volver a usarla las veces que quieras para enviarle a {recipient_name} — solo entra a tu banco y cambia el monto, sin necesidad de escribirnos aquí de nuevo.",
    greeting_reuse_hint: "💡 ¿Ya le enviaste antes a este destinatario? No hace falta escribirnos de nuevo — usa la misma cuenta desde la app de tu banco.",
  },
  de: {
    confirmed_deposit_reusable: "💡 Speichere dieses Konto in deiner Banking-App — es gehört dir dauerhaft. Du kannst es beliebig oft wiederverwenden, um an {recipient_name} zu senden — öffne einfach deine Banking-App und ändere den Betrag, ohne uns hier erneut zu schreiben.",
    greeting_reuse_hint: "💡 Schon einmal an diesen Empfänger gesendet? Du musst uns nicht erneut schreiben — nutze einfach dasselbe Konto in deiner Banking-App.",
  },
  fr: {
    confirmed_deposit_reusable: "💡 Enregistre ce compte dans ton appli bancaire — il est à toi pour toujours. Tu peux le réutiliser autant de fois que tu veux pour envoyer de l'argent à {recipient_name} — ouvre simplement ta banque et change le montant, sans avoir besoin de nous réécrire ici.",
    greeting_reuse_hint: "💡 Tu as déjà envoyé à ce destinataire ? Pas besoin de nous réécrire — utilise simplement le même compte depuis ton appli bancaire.",
  },
  it: {
    confirmed_deposit_reusable: "💡 Salva questo conto nella tua app bancaria — è tuo per sempre. Puoi riutilizzarlo quante volte vuoi per inviare a {recipient_name} — apri semplicemente la tua banca e cambia l'importo, senza bisogno di riscriverci qui.",
    greeting_reuse_hint: "💡 Hai già inviato a questo destinatario? Non serve riscriverci — usa lo stesso conto dalla tua app bancaria.",
  },
  nl: {
    confirmed_deposit_reusable: "💡 Sla deze rekening op in je bank-app — hij is voorgoed van jou. Je kunt hem zo vaak gebruiken als je wilt om geld naar {recipient_name} te sturen — open gewoon je bank-app en wijzig het bedrag, zonder ons hier opnieuw te hoeven schrijven.",
    greeting_reuse_hint: "💡 Al eerder naar deze ontvanger gestuurd? Je hoeft ons niet opnieuw te schrijven — gebruik gewoon dezelfde rekening via je bank-app.",
  },
  pt: {
    confirmed_deposit_reusable: "💡 Salve esta conta no app do seu banco — ela é sua para sempre. Você pode reutilizá-la quantas vezes quiser para enviar a {recipient_name} — é só abrir seu banco e mudar o valor, sem precisar nos escrever aqui de novo.",
    greeting_reuse_hint: "💡 Já enviou para este destinatário antes? Não precisa nos escrever de novo — use a mesma conta pelo app do seu banco.",
  },
  tr: {
    confirmed_deposit_reusable: "💡 Bu hesabı bankacılık uygulamana kaydet — sonsuza kadar senin. {recipient_name}'e göndermek için istediğin kadar tekrar kullanabilirsin — bankana gir, tutarı değiştir, burada bize tekrar yazmana gerek yok.",
    greeting_reuse_hint: "💡 Bu alıcıya daha önce gönderdin mi? Bize tekrar yazmana gerek yok — bankacılık uygulamandan aynı hesabı kullan.",
  },
  ru: {
    confirmed_deposit_reusable: "💡 Сохрани этот счёт в приложении своего банка — он твой навсегда. Можешь использовать его сколько угодно раз, чтобы отправлять {recipient_name} — просто открой банк и измени сумму, писать нам здесь снова не нужно.",
    greeting_reuse_hint: "💡 Уже отправляли этому получателю раньше? Писать нам снова не нужно — просто используй тот же счёт в приложении своего банка.",
  },
  vi: {
    confirmed_deposit_reusable: "💡 Lưu tài khoản này trong ứng dụng ngân hàng của bạn — nó là của bạn mãi mãi. Bạn có thể dùng lại bao nhiêu lần tùy thích để gửi cho {recipient_name} — chỉ cần mở ngân hàng và đổi số tiền, không cần nhắn lại cho chúng tôi ở đây.",
    greeting_reuse_hint: "💡 Đã từng gửi cho người nhận này rồi? Không cần nhắn lại cho chúng tôi — chỉ cần dùng cùng tài khoản đó từ ứng dụng ngân hàng của bạn.",
  },
  id: {
    confirmed_deposit_reusable: "💡 Simpan rekening ini di aplikasi bankmu — ini milikmu selamanya. Kamu bisa menggunakannya berkali-kali untuk mengirim ke {recipient_name} — cukup buka bankmu dan ubah jumlahnya, tanpa perlu chat kami di sini lagi.",
    greeting_reuse_hint: "💡 Sudah pernah kirim ke penerima ini sebelumnya? Tidak perlu chat kami lagi — gunakan saja rekening yang sama dari aplikasi bankmu.",
  },
  ja: {
    confirmed_deposit_reusable: "💡 この口座を銀行アプリに保存してください — ずっと使えます。{recipient_name} への送金に何度でも再利用できます。銀行アプリを開いて金額を変えるだけで、ここに再度メッセージする必要はありません。",
    greeting_reuse_hint: "💡 この受取人に以前送金したことがありますか？ 再度メッセージする必要はありません — 銀行アプリから同じ口座を使ってください。",
  },
  ko: {
    confirmed_deposit_reusable: "💡 이 계좌를 은행 앱에 저장하세요 — 영구적으로 사용할 수 있습니다. {recipient_name}님께 보낼 때 몇 번이든 다시 사용할 수 있어요 — 은행 앱을 열고 금액만 바꾸면 되며, 여기로 다시 메시지할 필요는 없습니다.",
    greeting_reuse_hint: "💡 이 수취인에게 예전에 보낸 적이 있나요? 다시 메시지할 필요 없어요 — 은행 앱에서 같은 계좌를 그대로 사용하세요.",
  },
  zh: {
    confirmed_deposit_reusable: "💡 把这个账户保存到你的银行App里——它永久属于你。以后给{recipient_name}汇款可以随时重复使用，只需打开银行App修改金额，无需再来这里给我们发消息。",
    greeting_reuse_hint: "💡 之前给这个收款人汇过款？无需再联系我们——直接在银行App里使用同一个账户即可。",
  },
  hi: {
    confirmed_deposit_reusable: "💡 इस खाते को अपने बैंक ऐप में सेव कर लें — यह हमेशा के लिए आपका है। आप {recipient_name} को भेजने के लिए इसे जितनी बार चाहें दोबारा इस्तेमाल कर सकते हैं — बस अपना बैंक खोलें और राशि बदलें, यहां दोबारा लिखने की ज़रूरत नहीं।",
    greeting_reuse_hint: "💡 क्या आपने पहले भी इस प्राप्तकर्ता को भेजा है? दोबारा हमें लिखने की ज़रूरत नहीं — बस अपने बैंक ऐप से वही खाता इस्तेमाल करें।",
  },
  ar: {
    confirmed_deposit_reusable: "💡 احفظ هذا الحساب في تطبيق بنكك — إنه لك إلى الأبد. يمكنك إعادة استخدامه كما تشاء لإرسال الأموال إلى {recipient_name} — فقط افتح تطبيق بنكك وغيّر المبلغ، دون الحاجة لمراسلتنا هنا مرة أخرى.",
    greeting_reuse_hint: "💡 هل أرسلت لهذا المستفيد من قبل؟ لا داعي لمراسلتنا مرة أخرى — فقط استخدم نفس الحساب من تطبيق بنكك.",
  },
  am: {
    confirmed_deposit_reusable: "💡 ይህን አካውንት በባንክ መተግበሪያዎ ያስቀምጡ — ለዘላለም የእርስዎ ነው። ለ{recipient_name} ለመላክ በፈለጉት ጊዜ ሁሉ እንደገና መጠቀም ይችላሉ — ባንክዎን ብቻ ይክፈቱ እና መጠኑን ይቀይሩ፣ እዚህ ደግመው መጻፍ አያስፈልግም።",
    greeting_reuse_hint: "💡 ከዚህ በፊት ለዚህ ተቀባይ ልከዋል? እዚህ ደግመው መጻፍ አያስፈልግም — ከባንክ መተግበሪያዎ ተመሳሳይ አካውንት ይጠቀሙ።",
  },
  ha: {
    confirmed_deposit_reusable: "💡 Ajiye wannan asusun a app ɗin bankinka — naka ne har abada. Za ka iya sake amfani da shi sau da yawa yadda kake so don aikawa ga {recipient_name} — kawai buɗe bankinka ka canza adadin, ba tare da bukatar sake rubuto mana a nan ba.",
    greeting_reuse_hint: "💡 Ka taɓa aikawa ga wannan mai karɓa a baya? Ba bukatar sake rubuto mana — kawai yi amfani da asusun nan daga app ɗin bankinka.",
  },
  sw: {
    confirmed_deposit_reusable: "💡 Hifadhi akaunti hii katika programu ya benki yako — ni yako milele. Unaweza kuitumia tena mara nyingi upendavyo kutuma pesa kwa {recipient_name} — fungua tu benki yako na ubadilishe kiasi, bila kuhitaji kuandika tena hapa.",
    greeting_reuse_hint: "💡 Umeshamtumia pesa mpokeaji huyu hapo awali? Hakuna haja ya kuandika tena — tumia akaunti ile ile kutoka programu ya benki yako.",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
