// Adds "whatsapp" (bot) and "kyc" (Persona embed page) namespaces to all 19 message files — Módulo 2
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const MSG   = join(__dir, "../messages");

// whatsapp.* keys:
//   greeting              — first message, explains how to ask for a transfer
//   parse_error           — couldn't parse "amount + country"
//   ask_email             — first-time user, need email to check Bridge KYC
//   invalid_email         — email didn't look valid
//   kyc_needed            — {link} → Persona KYC embed page
//   quote_ready           — {recipient_amount} {recipient_currency} {rate} {from_currency} {link}
//   kyc_approved_notification — proactive push from Bridge webhook once customer.approved fires
const WHATSAPP = {
  en: {
    greeting: "👋 Hi! I'm the OmniPay assistant.\n\nHow much do you want to send and to which country?\n\nTry something like:\n• *200 USD Mexico*\n• *500 CAD Colombia*\n• *1000 EUR Spain*\n\n_(This chat expires in 5 minutes for your security)_",
    parse_error: "Hmm, I didn't quite get that 🤔\n\nWrite the amount and country like this:\n*200 USD Mexico*",
    ask_email: "To continue, what's your email? We use it to verify your account with our regulated payment provider.",
    invalid_email: "That doesn't look like a valid email. Try again (example: name@email.com)",
    kyc_needed: "To complete your first transfer you need to verify your identity (2 minutes). Open this link: {link}",
    quote_ready: "✅ Guaranteed: your recipient gets {recipient_amount} {recipient_currency} (rate: {rate} {recipient_currency} per {from_currency}).\n\nFinish your transfer here: {link}\n\n_OmniPay doesn't store any of your data._",
    kyc_approved_notification: "🎉 Your OmniPay account was approved! You can now complete your transfer of {amount} {currency} to {country}.\n\nContinue here: {link}",
  },
  es: {
    greeting: "👋 ¡Hola! Soy el asistente de OmniPay.\n\n¿Cuánto quieres enviar y a qué país?\n\nEscríbeme algo como:\n• *200 USD México*\n• *500 CAD Colombia*\n• *1000 EUR España*\n\n_(Este chat expira en 5 minutos por seguridad)_",
    parse_error: "Hmm, no entendí bien 🤔\n\nEscríbeme el monto y país así:\n*200 USD México*",
    ask_email: "Para continuar, ¿cuál es tu correo electrónico? Lo usamos para verificar tu cuenta con nuestro proveedor de pagos regulado.",
    invalid_email: "Ese no parece un correo válido. Intenta de nuevo (ejemplo: nombre@correo.com)",
    kyc_needed: "Para completar tu primer envío necesitas verificar tu identidad (2 minutos). Abre este link: {link}",
    quote_ready: "✅ Garantizado: tu destinatario recibe {recipient_amount} {recipient_currency} (tasa: {rate} {recipient_currency} por {from_currency}).\n\nTermina tu envío aquí: {link}\n\n_OmniPay no guarda ninguno de tus datos._",
    kyc_approved_notification: "🎉 ¡Tu cuenta OmniPay fue aprobada! Ya puedes completar tu envío de {amount} {currency} a {country}.\n\nContinúa aquí: {link}",
  },
  pt: {
    greeting: "👋 Olá! Sou o assistente da OmniPay.\n\nQuanto você quer enviar e para qual país?\n\nEscreva algo como:\n• *200 USD México*\n• *500 CAD Colômbia*\n• *1000 EUR Espanha*\n\n_(Este chat expira em 5 minutos por segurança)_",
    parse_error: "Hmm, não entendi bem 🤔\n\nEscreva o valor e o país assim:\n*200 USD México*",
    ask_email: "Para continuar, qual é o seu e-mail? Usamos para verificar sua conta com nosso provedor de pagamentos regulado.",
    invalid_email: "Isso não parece um e-mail válido. Tente novamente (exemplo: nome@email.com)",
    kyc_needed: "Para concluir seu primeiro envio você precisa verificar sua identidade (2 minutos). Abra este link: {link}",
    quote_ready: "✅ Garantido: seu destinatário recebe {recipient_amount} {recipient_currency} (taxa: {rate} {recipient_currency} por {from_currency}).\n\nFinalize seu envio aqui: {link}\n\n_A OmniPay não armazena nenhum dos seus dados._",
    kyc_approved_notification: "🎉 Sua conta OmniPay foi aprovada! Agora você pode concluir seu envio de {amount} {currency} para {country}.\n\nContinue aqui: {link}",
  },
  fr: {
    greeting: "👋 Bonjour ! Je suis l'assistant OmniPay.\n\nCombien voulez-vous envoyer et vers quel pays ?\n\nÉcrivez par exemple :\n• *200 USD Mexique*\n• *500 CAD Colombie*\n• *1000 EUR Espagne*\n\n_(Cette conversation expire dans 5 minutes pour votre sécurité)_",
    parse_error: "Hmm, je n'ai pas bien compris 🤔\n\nÉcrivez le montant et le pays ainsi :\n*200 USD Mexique*",
    ask_email: "Pour continuer, quel est votre e-mail ? Nous l'utilisons pour vérifier votre compte auprès de notre prestataire de paiement réglementé.",
    invalid_email: "Cela ne ressemble pas à un e-mail valide. Réessayez (exemple : nom@email.com)",
    kyc_needed: "Pour compléter votre premier envoi, vous devez vérifier votre identité (2 minutes). Ouvrez ce lien : {link}",
    quote_ready: "✅ Garanti : votre bénéficiaire reçoit {recipient_amount} {recipient_currency} (taux : {rate} {recipient_currency} par {from_currency}).\n\nTerminez votre envoi ici : {link}\n\n_OmniPay ne stocke aucune de vos données._",
    kyc_approved_notification: "🎉 Votre compte OmniPay a été approuvé ! Vous pouvez maintenant compléter votre envoi de {amount} {currency} vers {country}.\n\nContinuez ici : {link}",
  },
  de: {
    greeting: "👋 Hallo! Ich bin der OmniPay-Assistent.\n\nWie viel möchten Sie senden und in welches Land?\n\nSchreiben Sie zum Beispiel:\n• *200 USD Mexiko*\n• *500 CAD Kolumbien*\n• *1000 EUR Spanien*\n\n_(Dieser Chat läuft aus Sicherheitsgründen in 5 Minuten ab)_",
    parse_error: "Hmm, das habe ich nicht ganz verstanden 🤔\n\nSchreiben Sie Betrag und Land so:\n*200 USD Mexiko*",
    ask_email: "Um fortzufahren, wie lautet Ihre E-Mail-Adresse? Wir verwenden sie, um Ihr Konto bei unserem regulierten Zahlungsanbieter zu verifizieren.",
    invalid_email: "Das sieht nicht nach einer gültigen E-Mail aus. Versuchen Sie es erneut (Beispiel: name@email.com)",
    kyc_needed: "Um Ihre erste Überweisung abzuschließen, müssen Sie Ihre Identität verifizieren (2 Minuten). Öffnen Sie diesen Link: {link}",
    quote_ready: "✅ Garantiert: Ihr Empfänger erhält {recipient_amount} {recipient_currency} (Kurs: {rate} {recipient_currency} pro {from_currency}).\n\nSchließen Sie Ihre Überweisung hier ab: {link}\n\n_OmniPay speichert keine Ihrer Daten._",
    kyc_approved_notification: "🎉 Ihr OmniPay-Konto wurde genehmigt! Sie können jetzt Ihre Überweisung von {amount} {currency} nach {country} abschließen.\n\nHier fortfahren: {link}",
  },
  it: {
    greeting: "👋 Ciao! Sono l'assistente OmniPay.\n\nQuanto vuoi inviare e verso quale paese?\n\nScrivi qualcosa come:\n• *200 USD Messico*\n• *500 CAD Colombia*\n• *1000 EUR Spagna*\n\n_(Questa chat scade tra 5 minuti per sicurezza)_",
    parse_error: "Hmm, non ho capito bene 🤔\n\nScrivi l'importo e il paese così:\n*200 USD Messico*",
    ask_email: "Per continuare, qual è la tua email? La usiamo per verificare il tuo account con il nostro fornitore di pagamenti regolamentato.",
    invalid_email: "Non sembra un'email valida. Riprova (esempio: nome@email.com)",
    kyc_needed: "Per completare il tuo primo invio devi verificare la tua identità (2 minuti). Apri questo link: {link}",
    quote_ready: "✅ Garantito: il tuo destinatario riceve {recipient_amount} {recipient_currency} (tasso: {rate} {recipient_currency} per {from_currency}).\n\nCompleta il tuo invio qui: {link}\n\n_OmniPay non memorizza nessuno dei tuoi dati._",
    kyc_approved_notification: "🎉 Il tuo account OmniPay è stato approvato! Ora puoi completare il tuo invio di {amount} {currency} verso {country}.\n\nContinua qui: {link}",
  },
  nl: {
    greeting: "👋 Hoi! Ik ben de OmniPay-assistent.\n\nHoeveel wil je versturen en naar welk land?\n\nSchrijf bijvoorbeeld:\n• *200 USD Mexico*\n• *500 CAD Colombia*\n• *1000 EUR Spanje*\n\n_(Deze chat verloopt over 5 minuten voor je veiligheid)_",
    parse_error: "Hmm, dat begreep ik niet helemaal 🤔\n\nSchrijf het bedrag en land zo:\n*200 USD Mexico*",
    ask_email: "Om door te gaan, wat is je e-mailadres? We gebruiken het om je account te verifiëren bij onze gereguleerde betalingsprovider.",
    invalid_email: "Dat lijkt geen geldig e-mailadres. Probeer opnieuw (voorbeeld: naam@email.com)",
    kyc_needed: "Om je eerste overboeking te voltooien moet je je identiteit verifiëren (2 minuten). Open deze link: {link}",
    quote_ready: "✅ Gegarandeerd: je ontvanger krijgt {recipient_amount} {recipient_currency} (koers: {rate} {recipient_currency} per {from_currency}).\n\nVoltooi je overboeking hier: {link}\n\n_OmniPay slaat geen van je gegevens op._",
    kyc_approved_notification: "🎉 Je OmniPay-account is goedgekeurd! Je kunt nu je overboeking van {amount} {currency} naar {country} voltooien.\n\nGa hier verder: {link}",
  },
  ja: {
    greeting: "👋 こんにちは！OmniPayアシスタントです。\n\nいくら、どの国に送金しますか？\n\n例えばこう書いてください：\n• *200 USD メキシコ*\n• *500 CAD コロンビア*\n• *1000 EUR スペイン*\n\n_(このチャットはセキュリティのため5分で期限切れになります)_",
    parse_error: "うまく理解できませんでした🤔\n\n金額と国をこう書いてください：\n*200 USD メキシコ*",
    ask_email: "続けるには、メールアドレスを教えてください。規制対象の決済プロバイダーでアカウントを確認するために使用します。",
    invalid_email: "有効なメールアドレスではないようです。もう一度お試しください（例：name@email.com）",
    kyc_needed: "最初の送金を完了するには本人確認が必要です（2分）。このリンクを開いてください：{link}",
    quote_ready: "✅ 保証：受取人は{recipient_amount} {recipient_currency}を受け取ります（レート：{from_currency}あたり{rate} {recipient_currency}）。\n\nここで送金を完了してください：{link}\n\n_OmniPayはあなたのデータを保存しません。_",
    kyc_approved_notification: "🎉 OmniPayアカウントが承認されました！{amount} {currency}を{country}へ送金を完了できます。\n\nこちらから続ける：{link}",
  },
  ko: {
    greeting: "👋 안녕하세요! OmniPay 어시스턴트입니다.\n\n얼마를 어느 나라로 보내고 싶으신가요?\n\n예시처럼 작성해 주세요:\n• *200 USD 멕시코*\n• *500 CAD 콜롬비아*\n• *1000 EUR 스페인*\n\n_(보안을 위해 이 채팅은 5분 후 만료됩니다)_",
    parse_error: "음, 제대로 이해하지 못했어요 🤔\n\n금액과 국가를 이렇게 작성해 주세요:\n*200 USD 멕시코*",
    ask_email: "계속하려면 이메일이 무엇인가요? 규제된 결제 제공업체에서 계정을 확인하는 데 사용됩니다.",
    invalid_email: "유효한 이메일이 아닌 것 같아요. 다시 시도해 주세요 (예: name@email.com)",
    kyc_needed: "첫 송금을 완료하려면 신원 확인이 필요합니다 (2분). 이 링크를 열어주세요: {link}",
    quote_ready: "✅ 보장: 수취인은 {recipient_amount} {recipient_currency}를 받습니다 (환율: {from_currency}당 {rate} {recipient_currency}).\n\n여기에서 송금을 완료하세요: {link}\n\n_OmniPay는 귀하의 데이터를 저장하지 않습니다._",
    kyc_approved_notification: "🎉 OmniPay 계정이 승인되었습니다! 이제 {amount} {currency}를 {country}로 보내는 송금을 완료할 수 있습니다.\n\n여기에서 계속하세요: {link}",
  },
  zh: {
    greeting: "👋 你好！我是OmniPay助手。\n\n您想汇多少钱到哪个国家？\n\n请这样写：\n• *200 USD 墨西哥*\n• *500 CAD 哥伦比亚*\n• *1000 EUR 西班牙*\n\n_(为了您的安全，此聊天将在5分钟后过期)_",
    parse_error: "嗯，我没太明白🤔\n\n请这样写金额和国家：\n*200 USD 墨西哥*",
    ask_email: "为了继续，您的电子邮件是什么？我们用它在我们受监管的支付提供商处验证您的账户。",
    invalid_email: "这似乎不是有效的电子邮件。请重试（例如：name@email.com）",
    kyc_needed: "要完成您的首次汇款，您需要验证身份（2分钟）。请打开此链接：{link}",
    quote_ready: "✅ 保证：您的收款人将收到 {recipient_amount} {recipient_currency}（汇率：每{from_currency} {rate} {recipient_currency}）。\n\n请在此完成汇款：{link}\n\n_OmniPay不存储您的任何数据。_",
    kyc_approved_notification: "🎉 您的OmniPay账户已获批准！您现在可以完成向{country}汇款{amount} {currency}。\n\n请在此继续：{link}",
  },
  hi: {
    greeting: "👋 नमस्ते! मैं OmniPay सहायक हूं।\n\nआप कितना भेजना चाहते हैं और किस देश को?\n\nऐसा कुछ लिखें:\n• *200 USD मेक्सिको*\n• *500 CAD कोलंबिया*\n• *1000 EUR स्पेन*\n\n_(सुरक्षा के लिए यह चैट 5 मिनट में समाप्त हो जाती है)_",
    parse_error: "हम्म, मुझे ठीक से समझ नहीं आया 🤔\n\nराशि और देश इस तरह लिखें:\n*200 USD मेक्सिको*",
    ask_email: "जारी रखने के लिए, आपका ईमेल क्या है? हम इसका उपयोग हमारे नियमित भुगतान प्रदाता के साथ आपके खाते को सत्यापित करने के लिए करते हैं।",
    invalid_email: "यह एक मान्य ईमेल नहीं लगता। पुनः प्रयास करें (उदाहरण: name@email.com)",
    kyc_needed: "अपना पहला ट्रांसफर पूरा करने के लिए आपको अपनी पहचान सत्यापित करनी होगी (2 मिनट)। यह लिंक खोलें: {link}",
    quote_ready: "✅ गारंटीकृत: आपके प्राप्तकर्ता को {recipient_amount} {recipient_currency} मिलेगा (दर: {rate} {recipient_currency} प्रति {from_currency})।\n\nयहां अपना ट्रांसफर पूरा करें: {link}\n\n_OmniPay आपका कोई भी डेटा संग्रहीत नहीं करता।_",
    kyc_approved_notification: "🎉 आपका OmniPay खाता स्वीकृत हो गया! अब आप {country} को {amount} {currency} का ट्रांसफर पूरा कर सकते हैं।\n\nयहां जारी रखें: {link}",
  },
  ar: {
    greeting: "👋 مرحباً! أنا مساعد OmniPay.\n\nكم تريد إرساله وإلى أي دولة؟\n\nاكتب شيئاً مثل:\n• *200 USD المكسيك*\n• *500 CAD كولومبيا*\n• *1000 EUR إسبانيا*\n\n_(تنتهي صلاحية هذه المحادثة خلال 5 دقائق لأمانك)_",
    parse_error: "لم أفهم ذلك جيداً 🤔\n\nاكتب المبلغ والدولة هكذا:\n*200 USD المكسيك*",
    ask_email: "للمتابعة، ما هو بريدك الإلكتروني؟ نستخدمه للتحقق من حسابك لدى مزود الدفع المرخّص لدينا.",
    invalid_email: "لا يبدو هذا بريداً إلكترونياً صالحاً. حاول مرة أخرى (مثال: name@email.com)",
    kyc_needed: "لإكمال أول تحويل لك، تحتاج إلى التحقق من هويتك (دقيقتان). افتح هذا الرابط: {link}",
    quote_ready: "✅ مضمون: يستلم المستفيد {recipient_amount} {recipient_currency} (السعر: {rate} {recipient_currency} لكل {from_currency}).\n\nأكمل تحويلك هنا: {link}\n\n_لا تخزّن OmniPay أياً من بياناتك._",
    kyc_approved_notification: "🎉 تمت الموافقة على حساب OmniPay الخاص بك! يمكنك الآن إكمال تحويل {amount} {currency} إلى {country}.\n\nتابع هنا: {link}",
  },
  tr: {
    greeting: "👋 Merhaba! Ben OmniPay asistanıyım.\n\nNe kadar göndermek istiyorsunuz ve hangi ülkeye?\n\nŞöyle yazın:\n• *200 USD Meksika*\n• *500 CAD Kolombiya*\n• *1000 EUR İspanya*\n\n_(Bu sohbet güvenliğiniz için 5 dakika içinde sona erer)_",
    parse_error: "Hmm, tam anlayamadım 🤔\n\nTutarı ve ülkeyi şöyle yazın:\n*200 USD Meksika*",
    ask_email: "Devam etmek için e-postanız nedir? Düzenlenmiş ödeme sağlayıcımızda hesabınızı doğrulamak için kullanıyoruz.",
    invalid_email: "Bu geçerli bir e-posta gibi görünmüyor. Tekrar deneyin (örnek: isim@email.com)",
    kyc_needed: "İlk transferinizi tamamlamak için kimliğinizi doğrulamanız gerekiyor (2 dakika). Bu bağlantıyı açın: {link}",
    quote_ready: "✅ Garanti: alıcınız {recipient_amount} {recipient_currency} alır (kur: {from_currency} başına {rate} {recipient_currency}).\n\nTransferinizi burada tamamlayın: {link}\n\n_OmniPay verilerinizi saklamaz._",
    kyc_approved_notification: "🎉 OmniPay hesabınız onaylandı! Artık {country} ülkesine {amount} {currency} transferinizi tamamlayabilirsiniz.\n\nBurada devam edin: {link}",
  },
  ru: {
    greeting: "👋 Привет! Я ассистент OmniPay.\n\nСколько вы хотите отправить и в какую страну?\n\nНапишите, например:\n• *200 USD Мексика*\n• *500 CAD Колумбия*\n• *1000 EUR Испания*\n\n_(Этот чат истекает через 5 минут в целях безопасности)_",
    parse_error: "Хм, я не совсем понял 🤔\n\nНапишите сумму и страну так:\n*200 USD Мексика*",
    ask_email: "Чтобы продолжить, укажите ваш email. Мы используем его для проверки вашего аккаунта у нашего регулируемого платёжного провайдера.",
    invalid_email: "Это не похоже на действительный email. Попробуйте снова (пример: name@email.com)",
    kyc_needed: "Чтобы завершить первый перевод, нужно подтвердить личность (2 минуты). Откройте эту ссылку: {link}",
    quote_ready: "✅ Гарантировано: получатель получит {recipient_amount} {recipient_currency} (курс: {rate} {recipient_currency} за {from_currency}).\n\nЗавершите перевод здесь: {link}\n\n_OmniPay не хранит никаких ваших данных._",
    kyc_approved_notification: "🎉 Ваш аккаунт OmniPay одобрен! Теперь вы можете завершить перевод {amount} {currency} в {country}.\n\nПродолжите здесь: {link}",
  },
  vi: {
    greeting: "👋 Xin chào! Tôi là trợ lý OmniPay.\n\nBạn muốn gửi bao nhiêu và đến quốc gia nào?\n\nHãy viết như thế này:\n• *200 USD Mexico*\n• *500 CAD Colombia*\n• *1000 EUR Tây Ban Nha*\n\n_(Cuộc trò chuyện này hết hạn sau 5 phút vì lý do bảo mật)_",
    parse_error: "Hừm, tôi chưa hiểu rõ 🤔\n\nHãy viết số tiền và quốc gia như sau:\n*200 USD Mexico*",
    ask_email: "Để tiếp tục, email của bạn là gì? Chúng tôi dùng nó để xác minh tài khoản của bạn với nhà cung cấp thanh toán được quản lý của chúng tôi.",
    invalid_email: "Đây có vẻ không phải là email hợp lệ. Hãy thử lại (ví dụ: ten@email.com)",
    kyc_needed: "Để hoàn tất lần chuyển tiền đầu tiên, bạn cần xác minh danh tính (2 phút). Mở liên kết này: {link}",
    quote_ready: "✅ Đảm bảo: người nhận của bạn sẽ nhận {recipient_amount} {recipient_currency} (tỷ giá: {rate} {recipient_currency} mỗi {from_currency}).\n\nHoàn tất chuyển tiền tại đây: {link}\n\n_OmniPay không lưu trữ bất kỳ dữ liệu nào của bạn._",
    kyc_approved_notification: "🎉 Tài khoản OmniPay của bạn đã được phê duyệt! Bây giờ bạn có thể hoàn tất chuyển {amount} {currency} đến {country}.\n\nTiếp tục tại đây: {link}",
  },
  id: {
    greeting: "👋 Hai! Saya asisten OmniPay.\n\nBerapa yang ingin Anda kirim dan ke negara mana?\n\nTulis seperti ini:\n• *200 USD Meksiko*\n• *500 CAD Kolombia*\n• *1000 EUR Spanyol*\n\n_(Obrolan ini kedaluwarsa dalam 5 menit demi keamanan Anda)_",
    parse_error: "Hmm, saya kurang mengerti 🤔\n\nTulis jumlah dan negara seperti ini:\n*200 USD Meksiko*",
    ask_email: "Untuk melanjutkan, apa email Anda? Kami menggunakannya untuk memverifikasi akun Anda dengan penyedia pembayaran kami yang teregulasi.",
    invalid_email: "Itu sepertinya bukan email yang valid. Coba lagi (contoh: nama@email.com)",
    kyc_needed: "Untuk menyelesaikan transfer pertama Anda, Anda perlu memverifikasi identitas (2 menit). Buka tautan ini: {link}",
    quote_ready: "✅ Dijamin: penerima Anda mendapat {recipient_amount} {recipient_currency} (kurs: {rate} {recipient_currency} per {from_currency}).\n\nSelesaikan transfer Anda di sini: {link}\n\n_OmniPay tidak menyimpan data Anda._",
    kyc_approved_notification: "🎉 Akun OmniPay Anda telah disetujui! Anda sekarang dapat menyelesaikan transfer {amount} {currency} ke {country}.\n\nLanjutkan di sini: {link}",
  },
  am: {
    greeting: "👋 ሰላም! እኔ የOmniPay ረዳት ነኝ።\n\nምን ያህል መላክ ይፈልጋሉ እና ወደ የትኛው ሀገር?\n\nእንደዚህ ይጻፉ:\n• *200 USD ሜክሲኮ*\n• *500 CAD ኮሎምቢያ*\n• *1000 EUR ስፔን*\n\n_(ይህ ውይይት ለደህንነትዎ በ5 ደቂቃ ውስጥ ያበቃል)_",
    parse_error: "ልረዳው አልቻልኩም 🤔\n\nመጠኑን እና ሀገር እንደዚህ ይጻፉ:\n*200 USD ሜክሲኮ*",
    ask_email: "ለመቀጠል ኢሜይልዎ ምንድን ነው? ይህንን በተቆጣጣሪ ክፍያ አቅራቢያችን ዘንድ መለያዎን ለማረጋገጥ እንጠቀማለን።",
    invalid_email: "ይህ ትክክለኛ ኢሜይል አይመስልም። እንደገና ይሞክሩ (ምሳሌ: name@email.com)",
    kyc_needed: "የመጀመሪያ ዝውውርዎን ለማጠናቀቅ ማንነትዎን ማረጋገጥ ያስፈልግዎታል (2 ደቂቃ)። ይህን አገናኝ ይክፈቱ: {link}",
    quote_ready: "✅ ዋስትና ተሰጥቶታል፦ ተቀባይዎ {recipient_amount} {recipient_currency} ያገኛል (ተመን፦ {rate} {recipient_currency} በ{from_currency})።\n\nዝውውርዎን እዚህ ያጠናቅቁ፦ {link}\n\n_OmniPay ምንም አይነት የእርስዎን መረጃ አያከማችም።_",
    kyc_approved_notification: "🎉 የOmniPay መለያዎ ጸድቋል! አሁን የ{amount} {currency} ዝውውርዎን ወደ {country} ማጠናቀቅ ይችላሉ።\n\nእዚህ ይቀጥሉ፦ {link}",
  },
  ha: {
    greeting: "👋 Sannu! Ni ne mataimakin OmniPay.\n\nNawa kake son aikawa kuma zuwa wace ƙasa?\n\nRubuta kamar haka:\n• *200 USD Mexico*\n• *500 CAD Colombia*\n• *1000 EUR Spain*\n\n_(Wannan tattaunawar za ta ƙare a cikin mintuna 5 don tsaronka)_",
    parse_error: "Hmm, ban gane sosai ba 🤔\n\nRubuta adadi da ƙasar kamar haka:\n*200 USD Mexico*",
    ask_email: "Don ci gaba, menene imel ɗinka? Muna amfani da shi don tabbatar da asusunka tare da mai ba da hidimar biyan kuɗi da aka tsara.",
    invalid_email: "Wannan bai yi kama da ingantaccen imel ba. Sake gwadawa (misali: suna@email.com)",
    kyc_needed: "Don kammala canja wurin ka na farko, kana buƙatar tabbatar da asalinka (mintuna 2). Buɗe wannan hanyar haɗi: {link}",
    quote_ready: "✅ Tabbatacce: wanda za a biya zai karɓi {recipient_amount} {recipient_currency} (farashi: {rate} {recipient_currency} akan {from_currency} ɗaya).\n\nKammala canja wurin ka a nan: {link}\n\n_OmniPay baya adana kowanne bayaninka._",
    kyc_approved_notification: "🎉 An amince da asusun OmniPay naka! Yanzu za ka iya kammala canja wurin {amount} {currency} zuwa {country}.\n\nCi gaba a nan: {link}",
  },
  sw: {
    greeting: "👋 Habari! Mimi ni msaidizi wa OmniPay.\n\nUnataka kutuma kiasi gani na kwenda nchi gani?\n\nAndika kitu kama:\n• *200 USD Mexico*\n• *500 CAD Colombia*\n• *1000 EUR Spain*\n\n_(Mazungumzo haya yataisha muda wake baada ya dakika 5 kwa usalama wako)_",
    parse_error: "Hmm, sikuelewa vizuri 🤔\n\nAndika kiasi na nchi hivi:\n*200 USD Mexico*",
    ask_email: "Ili kuendelea, barua pepe yako ni ipi? Tunaitumia kuthibitisha akaunti yako na mtoa huduma wetu wa malipo aliyesajiliwa.",
    invalid_email: "Hiyo haionekani kama barua pepe halali. Jaribu tena (mfano: jina@email.com)",
    kyc_needed: "Ili kukamilisha uhamisho wako wa kwanza unahitaji kuthibitisha utambulisho wako (dakika 2). Fungua kiungo hiki: {link}",
    quote_ready: "✅ Imehakikishwa: mpokeaji wako atapata {recipient_amount} {recipient_currency} (kiwango: {rate} {recipient_currency} kwa {from_currency} moja).\n\nKamilisha uhamisho wako hapa: {link}\n\n_OmniPay haihifadhi data yako yoyote._",
    kyc_approved_notification: "🎉 Akaunti yako ya OmniPay imeidhinishwa! Sasa unaweza kukamilisha uhamisho wa {amount} {currency} kwenda {country}.\n\nEndelea hapa: {link}",
  },
};

// kyc.* keys — for app/kyc/page.tsx (Persona embed landing page)
const KYC = {
  en: {
    title: "Verify your identity",
    subtitle: "This takes about 2 minutes. OmniPay uses Bridge and Persona, regulated identity verification providers — we never see or store your documents.",
    loading: "Loading verification…",
    error: "Could not start verification. Please try again from WhatsApp.",
    missing_params: "This link is incomplete. Please request a new one from WhatsApp.",
  },
  es: {
    title: "Verifica tu identidad",
    subtitle: "Esto toma unos 2 minutos. OmniPay usa Bridge y Persona, proveedores regulados de verificación de identidad — nunca vemos ni guardamos tus documentos.",
    loading: "Cargando verificación…",
    error: "No se pudo iniciar la verificación. Intenta de nuevo desde WhatsApp.",
    missing_params: "Este link está incompleto. Solicita uno nuevo desde WhatsApp.",
  },
  pt: {
    title: "Verifique sua identidade",
    subtitle: "Isso leva cerca de 2 minutos. A OmniPay usa Bridge e Persona, provedores regulados de verificação de identidade — nunca vemos ou armazenamos seus documentos.",
    loading: "Carregando verificação…",
    error: "Não foi possível iniciar a verificação. Tente novamente pelo WhatsApp.",
    missing_params: "Este link está incompleto. Solicite um novo pelo WhatsApp.",
  },
  fr: {
    title: "Vérifiez votre identité",
    subtitle: "Cela prend environ 2 minutes. OmniPay utilise Bridge et Persona, prestataires réglementés de vérification d'identité — nous ne voyons ni ne stockons jamais vos documents.",
    loading: "Chargement de la vérification…",
    error: "Impossible de démarrer la vérification. Réessayez depuis WhatsApp.",
    missing_params: "Ce lien est incomplet. Demandez-en un nouveau depuis WhatsApp.",
  },
  de: {
    title: "Verifizieren Sie Ihre Identität",
    subtitle: "Dies dauert etwa 2 Minuten. OmniPay nutzt Bridge und Persona, regulierte Anbieter für Identitätsprüfung — wir sehen oder speichern Ihre Dokumente nie.",
    loading: "Verifizierung wird geladen…",
    error: "Verifizierung konnte nicht gestartet werden. Versuchen Sie es erneut über WhatsApp.",
    missing_params: "Dieser Link ist unvollständig. Fordern Sie einen neuen über WhatsApp an.",
  },
  it: {
    title: "Verifica la tua identità",
    subtitle: "Richiede circa 2 minuti. OmniPay utilizza Bridge e Persona, fornitori regolamentati di verifica dell'identità — non vediamo né memorizziamo mai i tuoi documenti.",
    loading: "Caricamento verifica…",
    error: "Impossibile avviare la verifica. Riprova da WhatsApp.",
    missing_params: "Questo link è incompleto. Richiedine uno nuovo da WhatsApp.",
  },
  nl: {
    title: "Verifieer je identiteit",
    subtitle: "Dit duurt ongeveer 2 minuten. OmniPay gebruikt Bridge en Persona, gereguleerde aanbieders van identiteitsverificatie — we zien of bewaren je documenten nooit.",
    loading: "Verificatie laden…",
    error: "Kon verificatie niet starten. Probeer opnieuw vanuit WhatsApp.",
    missing_params: "Deze link is onvolledig. Vraag een nieuwe aan via WhatsApp.",
  },
  ja: {
    title: "本人確認を行ってください",
    subtitle: "所要時間は約2分です。OmniPayは規制対象の本人確認プロバイダーであるBridgeとPersonaを使用しており、お客様の書類を確認・保存することはありません。",
    loading: "確認を読み込み中…",
    error: "確認を開始できませんでした。WhatsAppから再試行してください。",
    missing_params: "このリンクは不完全です。WhatsAppから新しいリンクをリクエストしてください。",
  },
  ko: {
    title: "신원을 확인하세요",
    subtitle: "약 2분 정도 소요됩니다. OmniPay는 규제된 신원 확인 제공업체인 Bridge와 Persona를 사용하며, 귀하의 문서를 확인하거나 저장하지 않습니다.",
    loading: "확인 로드 중…",
    error: "확인을 시작할 수 없습니다. WhatsApp에서 다시 시도해 주세요.",
    missing_params: "이 링크가 불완전합니다. WhatsApp에서 새 링크를 요청해 주세요.",
  },
  zh: {
    title: "验证您的身份",
    subtitle: "大约需要2分钟。OmniPay使用受监管的身份验证提供商Bridge和Persona——我们绝不查看或存储您的文件。",
    loading: "正在加载验证…",
    error: "无法开始验证。请从WhatsApp重试。",
    missing_params: "此链接不完整。请从WhatsApp请求新链接。",
  },
  hi: {
    title: "अपनी पहचान सत्यापित करें",
    subtitle: "इसमें लगभग 2 मिनट लगते हैं। OmniPay नियमित पहचान सत्यापन प्रदाता Bridge और Persona का उपयोग करता है — हम आपके दस्तावेज़ कभी नहीं देखते या संग्रहीत नहीं करते।",
    loading: "सत्यापन लोड हो रहा है…",
    error: "सत्यापन शुरू नहीं हो सका। WhatsApp से पुनः प्रयास करें।",
    missing_params: "यह लिंक अधूरा है। WhatsApp से नया अनुरोध करें।",
  },
  ar: {
    title: "تحقق من هويتك",
    subtitle: "يستغرق هذا حوالي دقيقتين. تستخدم OmniPay مزودي التحقق من الهوية المرخصين Bridge وPersona — لا نرى أو نخزن مستنداتك أبداً.",
    loading: "جارٍ تحميل التحقق…",
    error: "تعذر بدء التحقق. حاول مرة أخرى من WhatsApp.",
    missing_params: "هذا الرابط غير مكتمل. اطلب رابطاً جديداً من WhatsApp.",
  },
  tr: {
    title: "Kimliğinizi doğrulayın",
    subtitle: "Bu yaklaşık 2 dakika sürer. OmniPay, düzenlenmiş kimlik doğrulama sağlayıcıları Bridge ve Persona'yı kullanır — belgelerinizi asla görmeyiz veya saklamayız.",
    loading: "Doğrulama yükleniyor…",
    error: "Doğrulama başlatılamadı. WhatsApp'tan tekrar deneyin.",
    missing_params: "Bu bağlantı eksik. WhatsApp'tan yeni bir bağlantı isteyin.",
  },
  ru: {
    title: "Подтвердите свою личность",
    subtitle: "Это занимает около 2 минут. OmniPay использует регулируемых поставщиков проверки личности Bridge и Persona — мы никогда не видим и не храним ваши документы.",
    loading: "Загрузка проверки…",
    error: "Не удалось начать проверку. Повторите попытку через WhatsApp.",
    missing_params: "Эта ссылка неполная. Запросите новую через WhatsApp.",
  },
  vi: {
    title: "Xác minh danh tính của bạn",
    subtitle: "Việc này mất khoảng 2 phút. OmniPay sử dụng Bridge và Persona, các nhà cung cấp xác minh danh tính được quản lý — chúng tôi không bao giờ xem hoặc lưu trữ tài liệu của bạn.",
    loading: "Đang tải xác minh…",
    error: "Không thể bắt đầu xác minh. Vui lòng thử lại từ WhatsApp.",
    missing_params: "Liên kết này chưa đầy đủ. Vui lòng yêu cầu liên kết mới từ WhatsApp.",
  },
  id: {
    title: "Verifikasi identitas Anda",
    subtitle: "Ini memakan waktu sekitar 2 menit. OmniPay menggunakan Bridge dan Persona, penyedia verifikasi identitas yang teregulasi — kami tidak pernah melihat atau menyimpan dokumen Anda.",
    loading: "Memuat verifikasi…",
    error: "Tidak dapat memulai verifikasi. Coba lagi dari WhatsApp.",
    missing_params: "Tautan ini tidak lengkap. Minta tautan baru dari WhatsApp.",
  },
  am: {
    title: "ማንነትዎን ያረጋግጡ",
    subtitle: "ይህ ወደ 2 ደቂቃ ይወስዳል። OmniPay የተቆጣጣሪ የማንነት ማረጋገጫ አቅራቢዎችን Bridge እና Persona ይጠቀማል — የእርስዎን ሰነዶች በጭራሽ አናይም ወይም አናከማችም።",
    loading: "ማረጋገጫ በመጫን ላይ…",
    error: "ማረጋገጫ መጀመር አልተቻለም። ከWhatsApp እንደገና ይሞክሩ።",
    missing_params: "ይህ አገናኝ ያልተሟላ ነው። ከWhatsApp አዲስ ይጠይቁ።",
  },
  ha: {
    title: "Tabbatar da ainihin ka",
    subtitle: "Wannan yana ɗaukar kimanin mintuna 2. OmniPay yana amfani da Bridge da Persona, masu ba da tabbatar da ainihi da aka tsara — ba mu taɓa ganin ko adana takardunku ba.",
    loading: "Ana loda tabbatarwa…",
    error: "Ba a iya fara tabbatarwa ba. Sake gwadawa daga WhatsApp.",
    missing_params: "Wannan hanyar haɗi bata cika ba. Nemi sabuwa daga WhatsApp.",
  },
  sw: {
    title: "Thibitisha utambulisho wako",
    subtitle: "Hii inachukua takriban dakika 2. OmniPay hutumia Bridge na Persona, watoa huduma wa uthibitisho wa utambulisho waliosajiliwa — hatuoni wala kuhifadhi hati zako.",
    loading: "Inapakia uthibitisho…",
    error: "Imeshindwa kuanzisha uthibitisho. Jaribu tena kutoka WhatsApp.",
    missing_params: "Kiungo hiki hakijakamilika. Omba kipya kutoka WhatsApp.",
  },
};

for (const lang of Object.keys(WHATSAPP)) {
  const path = join(MSG, `${lang}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = WHATSAPP[lang];
  json.kyc = KYC[lang];
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`✓ whatsapp+kyc → ${lang}.json`);
}
