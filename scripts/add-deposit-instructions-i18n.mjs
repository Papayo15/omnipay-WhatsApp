// One-shot: adds the "confirmed_deposit_*"/"label_*" keys (Módulo 2 — deposit instructions
// given directly in chat after SI confirmation, instead of only a link to /enviar) to the
// "whatsapp" namespace across all 19 messages/*.json locale files.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    confirmed_deposit_intro: "✅ All set. Deposit exactly {amount} {currency} via {rail} to this account:",
    label_bank: "Bank", label_beneficiary: "Beneficiary", label_routing: "Routing Number",
    label_account: "Account Number", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "PIX Key",
    confirmed_deposit_footer: "{recipient_name} will receive {recipient_amount} {recipient_currency}. As soon as we confirm your deposit, we'll message you here.\n\n_OmniPay doesn't store your bank details._",
  },
  es: {
    confirmed_deposit_intro: "✅ Todo listo. Deposita exactamente {amount} {currency} vía {rail} a esta cuenta:",
    label_bank: "Banco", label_beneficiary: "Beneficiario", label_routing: "Routing Number",
    label_account: "Número de cuenta", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Código PIX",
    confirmed_deposit_footer: "{recipient_name} recibirá {recipient_amount} {recipient_currency}. En cuanto confirmemos tu depósito, te avisamos por aquí.\n\n_OmniPay no almacena tus datos bancarios._",
  },
  de: {
    confirmed_deposit_intro: "✅ Fertig. Überweise genau {amount} {currency} per {rail} auf dieses Konto:",
    label_bank: "Bank", label_beneficiary: "Begünstigter", label_routing: "Routing-Nummer",
    label_account: "Kontonummer", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Bankleitzahl (Sort Code)", label_clabe: "CLABE", label_pix: "PIX-Schlüssel",
    confirmed_deposit_footer: "{recipient_name} erhält {recipient_amount} {recipient_currency}. Sobald deine Einzahlung bestätigt ist, melden wir uns hier.\n\n_OmniPay speichert deine Bankdaten nicht._",
  },
  fr: {
    confirmed_deposit_intro: "✅ C'est prêt. Dépose exactement {amount} {currency} via {rail} sur ce compte :",
    label_bank: "Banque", label_beneficiary: "Bénéficiaire", label_routing: "Numéro de routage (Routing Number)",
    label_account: "Numéro de compte", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Clé PIX",
    confirmed_deposit_footer: "{recipient_name} recevra {recipient_amount} {recipient_currency}. Dès que ton dépôt est confirmé, on te prévient ici.\n\n_OmniPay ne conserve aucune de tes données bancaires._",
  },
  it: {
    confirmed_deposit_intro: "✅ Tutto pronto. Deposita esattamente {amount} {currency} tramite {rail} su questo conto:",
    label_bank: "Banca", label_beneficiary: "Beneficiario", label_routing: "Routing Number",
    label_account: "Numero di conto", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Chiave PIX",
    confirmed_deposit_footer: "{recipient_name} riceverà {recipient_amount} {recipient_currency}. Appena confermiamo il tuo deposito, ti avviseremo qui.\n\n_OmniPay non conserva i tuoi dati bancari._",
  },
  nl: {
    confirmed_deposit_intro: "✅ Helemaal klaar. Maak precies {amount} {currency} over via {rail} naar deze rekening:",
    label_bank: "Bank", label_beneficiary: "Begunstigde", label_routing: "Routingnummer",
    label_account: "Rekeningnummer", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "PIX-sleutel",
    confirmed_deposit_footer: "{recipient_name} ontvangt {recipient_amount} {recipient_currency}. Zodra je storting bevestigd is, laten we het je hier weten.\n\n_OmniPay bewaart je bankgegevens niet._",
  },
  pt: {
    confirmed_deposit_intro: "✅ Tudo pronto. Deposite exatamente {amount} {currency} via {rail} nesta conta:",
    label_bank: "Banco", label_beneficiary: "Beneficiário", label_routing: "Routing Number",
    label_account: "Número da conta", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Chave PIX",
    confirmed_deposit_footer: "{recipient_name} vai receber {recipient_amount} {recipient_currency}. Assim que confirmarmos o seu depósito, avisamos por aqui.\n\n_A OmniPay não guarda seus dados bancários._",
  },
  tr: {
    confirmed_deposit_intro: "✅ Her şey hazır. {rail} üzerinden bu hesaba tam olarak {amount} {currency} yatır:",
    label_bank: "Banka", label_beneficiary: "Alıcı", label_routing: "Routing Numarası",
    label_account: "Hesap Numarası", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "PIX Anahtarı",
    confirmed_deposit_footer: "{recipient_name} {recipient_amount} {recipient_currency} alacak. Ödemen onaylanır onaylanmaz buradan haber veririz.\n\n_OmniPay banka bilgilerini saklamaz._",
  },
  ru: {
    confirmed_deposit_intro: "✅ Всё готово. Переведи ровно {amount} {currency} через {rail} на этот счёт:",
    label_bank: "Банк", label_beneficiary: "Получатель", label_routing: "Routing Number",
    label_account: "Номер счёта", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Ключ PIX",
    confirmed_deposit_footer: "{recipient_name} получит {recipient_amount} {recipient_currency}. Как только депозит подтвердится, мы сообщим тебе здесь.\n\n_OmniPay не хранит твои банковские данные._",
  },
  vi: {
    confirmed_deposit_intro: "✅ Xong rồi. Chuyển chính xác {amount} {currency} qua {rail} vào tài khoản này:",
    label_bank: "Ngân hàng", label_beneficiary: "Người thụ hưởng", label_routing: "Routing Number",
    label_account: "Số tài khoản", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Khóa PIX",
    confirmed_deposit_footer: "{recipient_name} sẽ nhận {recipient_amount} {recipient_currency}. Ngay khi xác nhận khoản nạp của bạn, chúng tôi sẽ báo tại đây.\n\n_OmniPay không lưu trữ thông tin ngân hàng của bạn._",
  },
  id: {
    confirmed_deposit_intro: "✅ Semua siap. Setorkan tepat {amount} {currency} via {rail} ke rekening ini:",
    label_bank: "Bank", label_beneficiary: "Penerima", label_routing: "Routing Number",
    label_account: "Nomor Rekening", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Kunci PIX",
    confirmed_deposit_footer: "{recipient_name} akan menerima {recipient_amount} {recipient_currency}. Begitu setoranmu kami konfirmasi, kami kabari di sini.\n\n_OmniPay tidak menyimpan data bankmu._",
  },
  ja: {
    confirmed_deposit_intro: "✅ 準備完了です。{rail} でこの口座に {amount} {currency} を正確に入金してください:",
    label_bank: "銀行名", label_beneficiary: "受取人", label_routing: "ルーティング番号",
    label_account: "口座番号", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "ソートコード", label_clabe: "CLABE", label_pix: "PIXキー",
    confirmed_deposit_footer: "{recipient_name} は {recipient_amount} {recipient_currency} を受け取ります。入金が確認され次第、こちらでお知らせします。\n\n_OmniPayはあなたの銀行情報を保存しません。_",
  },
  ko: {
    confirmed_deposit_intro: "✅ 준비 완료. {rail}을(를) 통해 이 계좌로 정확히 {amount} {currency}를 입금하세요:",
    label_bank: "은행", label_beneficiary: "수취인", label_routing: "라우팅 번호",
    label_account: "계좌번호", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "PIX 키",
    confirmed_deposit_footer: "{recipient_name}님이 {recipient_amount} {recipient_currency}를 받게 됩니다. 입금이 확인되는 대로 여기로 알려드릴게요.\n\n_OmniPay는 은행 정보를 저장하지 않습니다._",
  },
  zh: {
    confirmed_deposit_intro: "✅ 一切就绪。请通过 {rail} 向此账户准确存入 {amount} {currency}:",
    label_bank: "银行", label_beneficiary: "收款人", label_routing: "Routing Number",
    label_account: "账号", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "PIX密钥",
    confirmed_deposit_footer: "{recipient_name} 将收到 {recipient_amount} {recipient_currency}。存款确认后，我们会在这里通知你。\n\n_OmniPay 不会存储你的银行信息。_",
  },
  hi: {
    confirmed_deposit_intro: "✅ सब तैयार है। {rail} के ज़रिए इस खाते में ठीक {amount} {currency} जमा करें:",
    label_bank: "बैंक", label_beneficiary: "लाभार्थी", label_routing: "रूटिंग नंबर",
    label_account: "खाता संख्या", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "सॉर्ट कोड", label_clabe: "CLABE", label_pix: "PIX कुंजी",
    confirmed_deposit_footer: "{recipient_name} को {recipient_amount} {recipient_currency} मिलेगा। आपकी जमा राशि की पुष्टि होते ही हम आपको यहीं बताएंगे।\n\n_OmniPay आपकी बैंक जानकारी सुरक्षित नहीं रखता।_",
  },
  ar: {
    confirmed_deposit_intro: "✅ كل شيء جاهز. أودع بالضبط {amount} {currency} عبر {rail} في هذا الحساب:",
    label_bank: "البنك", label_beneficiary: "المستفيد", label_routing: "رقم التوجيه (Routing Number)",
    label_account: "رقم الحساب", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "مفتاح PIX",
    confirmed_deposit_footer: "سيستلم {recipient_name} مبلغ {recipient_amount} {recipient_currency}. بمجرد تأكيد إيداعك، سنخبرك هنا.\n\n_لا يقوم OmniPay بتخزين بياناتك المصرفية._",
  },
  am: {
    confirmed_deposit_intro: "✅ ሁሉም ተዘጋጅቷል። በ {rail} በኩል በትክክል {amount} {currency} ወደዚህ አካውንት አስገባ:",
    label_bank: "ባንክ", label_beneficiary: "ተቀባይ", label_routing: "Routing Number",
    label_account: "የአካውንት ቁጥር", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "PIX ቁልፍ",
    confirmed_deposit_footer: "{recipient_name} {recipient_amount} {recipient_currency} ይቀበላል። ገቢዎ ከተረጋገጠ በኋላ እዚህ እናሳውቅዎታለን።\n\n_OmniPay የባንክ መረጃዎን አያከማችም።_",
  },
  ha: {
    confirmed_deposit_intro: "✅ An shirya. Sanya daidai {amount} {currency} ta hanyar {rail} zuwa wannan asusun:",
    label_bank: "Banki", label_beneficiary: "Mai karɓa", label_routing: "Routing Number",
    label_account: "Lambar Asusun", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Makullin PIX",
    confirmed_deposit_footer: "{recipient_name} zai karɓi {recipient_amount} {recipient_currency}. Da zarar mun tabbatar da ajiyar ka, za mu sanar da kai a nan.\n\n_OmniPay baya adana bayanan bankin ka._",
  },
  sw: {
    confirmed_deposit_intro: "✅ Tayari. Weka {amount} {currency} kamili kupitia {rail} kwenye akaunti hii:",
    label_bank: "Benki", label_beneficiary: "Mpokeaji", label_routing: "Routing Number",
    label_account: "Namba ya Akaunti", label_iban: "IBAN", label_bic: "BIC/SWIFT",
    label_sort_code: "Sort Code", label_clabe: "CLABE", label_pix: "Ufunguo wa PIX",
    confirmed_deposit_footer: "{recipient_name} atapokea {recipient_amount} {recipient_currency}. Mara tu tukithibitisha malipo yako, tutakujulisha hapa.\n\n_OmniPay haihifadhi taarifa zako za benki._",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = new URL(`../messages/${locale}.json`, import.meta.url);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
