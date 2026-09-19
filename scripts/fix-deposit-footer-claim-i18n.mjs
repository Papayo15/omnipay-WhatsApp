// One-shot: fixes a false claim in "whatsapp.confirmed_deposit_footer" — the completion
// notification actually goes by EMAIL (app/api/bridge/webhook/route.ts →
// sendEmailNotification to order.senderEmail), never by WhatsApp for the sender. The old
// text said "te avisamos por aquí" (WhatsApp), which doesn't happen.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "{recipient_name} will receive {recipient_amount} {recipient_currency}. As soon as we confirm your deposit, we'll email you.\n\n_OmniPay doesn't store your bank details._",
  es: "{recipient_name} recibirá {recipient_amount} {recipient_currency}. En cuanto confirmemos tu depósito, te avisamos por correo.\n\n_OmniPay no almacena tus datos bancarios._",
  de: "{recipient_name} erhält {recipient_amount} {recipient_currency}. Sobald deine Einzahlung bestätigt ist, schicken wir dir eine E-Mail.\n\n_OmniPay speichert deine Bankdaten nicht._",
  fr: "{recipient_name} recevra {recipient_amount} {recipient_currency}. Dès que ton dépôt est confirmé, on t'envoie un e-mail.\n\n_OmniPay ne conserve aucune de tes données bancaires._",
  it: "{recipient_name} riceverà {recipient_amount} {recipient_currency}. Appena confermiamo il tuo deposito, ti scriviamo via email.\n\n_OmniPay non conserva i tuoi dati bancari._",
  nl: "{recipient_name} ontvangt {recipient_amount} {recipient_currency}. Zodra je storting bevestigd is, sturen we je een e-mail.\n\n_OmniPay bewaart je bankgegevens niet._",
  pt: "{recipient_name} vai receber {recipient_amount} {recipient_currency}. Assim que confirmarmos o seu depósito, avisamos por e-mail.\n\n_A OmniPay não guarda seus dados bancários._",
  tr: "{recipient_name} {recipient_amount} {recipient_currency} alacak. Ödemen onaylanır onaylanmaz sana e-posta göndereceğiz.\n\n_OmniPay banka bilgilerini saklamaz._",
  ru: "{recipient_name} получит {recipient_amount} {recipient_currency}. Как только депозит подтвердится, мы напишем тебе на email.\n\n_OmniPay не хранит твои банковские данные._",
  vi: "{recipient_name} sẽ nhận {recipient_amount} {recipient_currency}. Ngay khi xác nhận khoản nạp của bạn, chúng tôi sẽ gửi email cho bạn.\n\n_OmniPay không lưu trữ thông tin ngân hàng của bạn._",
  id: "{recipient_name} akan menerima {recipient_amount} {recipient_currency}. Begitu setoranmu kami konfirmasi, kami akan mengirim email.\n\n_OmniPay tidak menyimpan data bankmu._",
  ja: "{recipient_name} は {recipient_amount} {recipient_currency} を受け取ります。入金が確認され次第、メールでお知らせします。\n\n_OmniPayはあなたの銀行情報を保存しません。_",
  ko: "{recipient_name}님이 {recipient_amount} {recipient_currency}를 받게 됩니다. 입금이 확인되는 대로 이메일로 알려드릴게요.\n\n_OmniPay는 은행 정보를 저장하지 않습니다._",
  zh: "{recipient_name} 将收到 {recipient_amount} {recipient_currency}。存款确认后，我们会通过邮件通知你。\n\n_OmniPay 不会存储你的银行信息。_",
  hi: "{recipient_name} को {recipient_amount} {recipient_currency} मिलेगा। आपकी जमा राशि की पुष्टि होते ही हम आपको ईमेल करेंगे।\n\n_OmniPay आपकी बैंक जानकारी सुरक्षित नहीं रखता।_",
  ar: "سيستلم {recipient_name} مبلغ {recipient_amount} {recipient_currency}. بمجرد تأكيد إيداعك، سنرسل لك بريداً إلكترونياً.\n\n_لا يقوم OmniPay بتخزين بياناتك المصرفية._",
  am: "{recipient_name} {recipient_amount} {recipient_currency} ይቀበላል። ገቢዎ ከተረጋገጠ በኋላ በኢሜይል እናሳውቅዎታለን።\n\n_OmniPay የባንክ መረጃዎን አያከማችም።_",
  ha: "{recipient_name} zai karɓi {recipient_amount} {recipient_currency}. Da zarar mun tabbatar da ajiyar ka, za mu aika maka imel.\n\n_OmniPay baya adana bayanan bankin ka._",
  sw: "{recipient_name} atapokea {recipient_amount} {recipient_currency}. Mara tu tukithibitisha malipo yako, tutakutumia barua pepe.\n\n_OmniPay haihifadhi taarifa zako za benki._",
};

for (const [locale, confirmed_deposit_footer] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, confirmed_deposit_footer };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
