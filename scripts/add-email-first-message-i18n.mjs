// One-shot: updates "whatsapp.greeting" (ask for email in the SAME first message, to save
// a round trip) and "whatsapp.kyc_needed" (clarify ToS/KYC is a one-time thing per email)
// across all 19 messages/*.json locale files.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    greeting: "👋 Hi! I'm the OmniPay assistant.\n\nHow much do you want to send, to which country, and what's your email? (we use it to verify your account, so this only happens once)\n\nTry something like:\n• *200 USD Mexico juan@email.com*\n• *500 CAD Colombia juan@email.com*\n• *1000 EUR Spain juan@email.com*\n\n_(This chat expires in 5 minutes for your security)_",
    kyc_needed: "To complete your first transfer you need to verify your identity (2 minutes) — this is only done once, future transfers won't ask again. Open this link: {link}",
  },
  es: {
    greeting: "👋 ¡Hola! Soy el asistente de OmniPay.\n\n¿Cuánto quieres enviar, a qué país y cuál es tu correo? (lo usamos para verificar tu cuenta, esto solo se hace una vez)\n\nEscríbeme algo como:\n• *200 USD México juan@correo.com*\n• *500 CAD Colombia juan@correo.com*\n• *1000 EUR España juan@correo.com*\n\n_(Este chat expira en 5 minutos por seguridad)_",
    kyc_needed: "Para completar tu primer envío necesitas verificar tu identidad (2 minutos) — esto solo se hace una vez, tus próximos envíos no lo piden de nuevo. Abre este link: {link}",
  },
  de: {
    greeting: "👋 Hallo! Ich bin der OmniPay-Assistent.\n\nWie viel möchten Sie senden, in welches Land, und wie lautet Ihre E-Mail? (wir nutzen sie zur Kontoverifizierung — das passiert nur einmal)\n\nSchreiben Sie zum Beispiel:\n• *200 USD Mexiko juan@email.com*\n• *500 CAD Kolumbien juan@email.com*\n• *1000 EUR Spanien juan@email.com*\n\n_(Dieser Chat läuft aus Sicherheitsgründen in 5 Minuten ab)_",
    kyc_needed: "Um Ihre erste Überweisung abzuschließen, müssen Sie Ihre Identität verifizieren (2 Minuten) — das passiert nur einmal, künftige Überweisungen fragen nicht erneut danach. Öffnen Sie diesen Link: {link}",
  },
  fr: {
    greeting: "👋 Bonjour ! Je suis l'assistant OmniPay.\n\nCombien voulez-vous envoyer, vers quel pays, et quel est votre e-mail ? (on l'utilise pour vérifier ton compte, une seule fois)\n\nÉcrivez par exemple :\n• *200 USD Mexique juan@email.com*\n• *500 CAD Colombie juan@email.com*\n• *1000 EUR Espagne juan@email.com*\n\n_(Cette conversation expire dans 5 minutes pour votre sécurité)_",
    kyc_needed: "Pour compléter votre premier envoi, vous devez vérifier votre identité (2 minutes) — cela ne se fait qu'une seule fois, vos prochains envois ne le redemanderont pas. Ouvrez ce lien : {link}",
  },
  it: {
    greeting: "👋 Ciao! Sono l'assistente OmniPay.\n\nQuanto vuoi inviare, verso quale paese e qual è la tua email? (la usiamo per verificare il tuo account, solo una volta)\n\nScrivi qualcosa come:\n• *200 USD Messico juan@email.com*\n• *500 CAD Colombia juan@email.com*\n• *1000 EUR Spagna juan@email.com*\n\n_(Questa chat scade tra 5 minuti per sicurezza)_",
    kyc_needed: "Per completare il tuo primo invio devi verificare la tua identità (2 minuti) — si fa una sola volta, i prossimi invii non lo richiederanno più. Apri questo link: {link}",
  },
  nl: {
    greeting: "👋 Hoi! Ik ben de OmniPay-assistent.\n\nHoeveel wil je versturen, naar welk land, en wat is je e-mailadres? (we gebruiken het om je account te verifiëren, dit gebeurt maar één keer)\n\nSchrijf bijvoorbeeld:\n• *200 USD Mexico juan@email.com*\n• *500 CAD Colombia juan@email.com*\n• *1000 EUR Spanje juan@email.com*\n\n_(Deze chat verloopt over 5 minuten voor je veiligheid)_",
    kyc_needed: "Om je eerste overboeking te voltooien moet je je identiteit verifiëren (2 minuten) — dit gebeurt maar één keer, volgende overboekingen vragen er niet opnieuw naar. Open deze link: {link}",
  },
  pt: {
    greeting: "👋 Olá! Sou o assistente da OmniPay.\n\nQuanto você quer enviar, para qual país e qual é o seu e-mail? (usamos para verificar sua conta, isso é feito só uma vez)\n\nEscreva algo como:\n• *200 USD México juan@email.com*\n• *500 CAD Colômbia juan@email.com*\n• *1000 EUR Espanha juan@email.com*\n\n_(Este chat expira em 5 minutos por segurança)_",
    kyc_needed: "Para concluir seu primeiro envio você precisa verificar sua identidade (2 minutos) — isso é feito só uma vez, seus próximos envios não vão pedir de novo. Abra este link: {link}",
  },
  tr: {
    greeting: "👋 Merhaba! Ben OmniPay asistanıyım.\n\nNe kadar göndermek istiyorsunuz, hangi ülkeye ve e-postanız nedir? (hesabınızı doğrulamak için kullanıyoruz, bu yalnızca bir kez yapılır)\n\nŞöyle yazın:\n• *200 USD Meksika juan@email.com*\n• *500 CAD Kolombiya juan@email.com*\n• *1000 EUR İspanya juan@email.com*\n\n_(Bu sohbet güvenliğiniz için 5 dakika içinde sona erer)_",
    kyc_needed: "İlk transferinizi tamamlamak için kimliğinizi doğrulamanız gerekiyor (2 dakika) — bu yalnızca bir kez yapılır, sonraki transferlerinizde tekrar sorulmaz. Bu bağlantıyı açın: {link}",
  },
  ru: {
    greeting: "👋 Привет! Я ассистент OmniPay.\n\nСколько вы хотите отправить, в какую страну и какой у вас email? (используем его для проверки аккаунта, это происходит только один раз)\n\nНапишите, например:\n• *200 USD Мексика juan@email.com*\n• *500 CAD Колумбия juan@email.com*\n• *1000 EUR Испания juan@email.com*\n\n_(Этот чат истекает через 5 минут в целях безопасности)_",
    kyc_needed: "Чтобы завершить первый перевод, нужно подтвердить личность (2 минуты) — это делается только один раз, в следующих переводах это не спросят снова. Откройте эту ссылку: {link}",
  },
  vi: {
    greeting: "👋 Xin chào! Tôi là trợ lý OmniPay.\n\nBạn muốn gửi bao nhiêu, đến quốc gia nào, và email của bạn là gì? (chúng tôi dùng để xác minh tài khoản, việc này chỉ làm một lần)\n\nHãy viết như thế này:\n• *200 USD Mexico juan@email.com*\n• *500 CAD Colombia juan@email.com*\n• *1000 EUR Tây Ban Nha juan@email.com*\n\n_(Cuộc trò chuyện này hết hạn sau 5 phút vì lý do bảo mật)_",
    kyc_needed: "Để hoàn tất lần chuyển tiền đầu tiên, bạn cần xác minh danh tính (2 phút) — việc này chỉ làm một lần, các lần chuyển tiền sau sẽ không hỏi lại. Mở liên kết này: {link}",
  },
  id: {
    greeting: "👋 Hai! Saya asisten OmniPay.\n\nBerapa yang ingin Anda kirim, ke negara mana, dan apa email Anda? (kami gunakan untuk memverifikasi akun Anda, ini hanya dilakukan sekali)\n\nTulis seperti ini:\n• *200 USD Meksiko juan@email.com*\n• *500 CAD Kolombia juan@email.com*\n• *1000 EUR Spanyol juan@email.com*\n\n_(Obrolan ini kedaluwarsa dalam 5 menit demi keamanan Anda)_",
    kyc_needed: "Untuk menyelesaikan transfer pertama Anda, Anda perlu memverifikasi identitas (2 menit) — ini hanya dilakukan sekali, transfer berikutnya tidak akan menanyakannya lagi. Buka tautan ini: {link}",
  },
  ja: {
    greeting: "👋 こんにちは！OmniPayアシスタントです。\n\nいくら、どの国に送金しますか？また、メールアドレスは何ですか？（アカウント確認に使用します。これは一度だけです）\n\n例えばこう書いてください：\n• *200 USD メキシコ juan@email.com*\n• *500 CAD コロンビア juan@email.com*\n• *1000 EUR スペイン juan@email.com*\n\n_(このチャットはセキュリティのため5分で期限切れになります)_",
    kyc_needed: "最初の送金を完了するには本人確認が必要です（2分）。これは一度だけで、次回以降の送金では再度聞かれません。このリンクを開いてください：{link}",
  },
  ko: {
    greeting: "👋 안녕하세요! OmniPay 어시스턴트입니다.\n\n얼마를 어느 나라로 보내고 싶으신가요? 그리고 이메일은 무엇인가요? (계정 확인에 사용하며, 이는 한 번만 진행됩니다)\n\n예시처럼 작성해 주세요:\n• *200 USD 멕시코 juan@email.com*\n• *500 CAD 콜롬비아 juan@email.com*\n• *1000 EUR 스페인 juan@email.com*\n\n_(보안을 위해 이 채팅은 5분 후 만료됩니다)_",
    kyc_needed: "첫 송금을 완료하려면 신원 확인이 필요합니다 (2분) — 이는 한 번만 진행되며, 다음 송금부터는 다시 묻지 않습니다. 이 링크를 열어주세요: {link}",
  },
  zh: {
    greeting: "👋 你好！我是OmniPay助手。\n\n您想汇多少钱到哪个国家？您的邮箱是什么？（我们用它来验证您的账户，只需一次）\n\n请这样写：\n• *200 USD 墨西哥 juan@email.com*\n• *500 CAD 哥伦比亚 juan@email.com*\n• *1000 EUR 西班牙 juan@email.com*\n\n_(为了您的安全，此聊天将在5分钟后过期)_",
    kyc_needed: "要完成您的首次汇款，您需要验证身份（2分钟）——这只需要一次，以后的汇款不会再询问。请打开此链接：{link}",
  },
  hi: {
    greeting: "👋 नमस्ते! मैं OmniPay सहायक हूं।\n\nआप कितना भेजना चाहते हैं, किस देश को, और आपका ईमेल क्या है? (हम इसका उपयोग आपके खाते को सत्यापित करने के लिए करते हैं, यह केवल एक बार होता है)\n\nऐसा कुछ लिखें:\n• *200 USD मेक्सिको juan@email.com*\n• *500 CAD कोलंबिया juan@email.com*\n• *1000 EUR स्पेन juan@email.com*\n\n_(सुरक्षा के लिए यह चैट 5 मिनट में समाप्त हो जाती है)_",
    kyc_needed: "अपना पहला ट्रांसफर पूरा करने के लिए आपको अपनी पहचान सत्यापित करनी होगी (2 मिनट) — यह केवल एक बार होता है, आपके अगले ट्रांसफर में यह दोबारा नहीं पूछा जाएगा। यह लिंक खोलें: {link}",
  },
  ar: {
    greeting: "👋 مرحباً! أنا مساعد OmniPay.\n\nكم تريد إرساله، وإلى أي دولة، وما هو بريدك الإلكتروني؟ (نستخدمه للتحقق من حسابك، ويتم هذا مرة واحدة فقط)\n\nاكتب شيئاً مثل:\n• *200 USD المكسيك juan@email.com*\n• *500 CAD كولومبيا juan@email.com*\n• *1000 EUR إسبانيا juan@email.com*\n\n_(تنتهي صلاحية هذه المحادثة خلال 5 دقائق لأمانك)_",
    kyc_needed: "لإكمال أول تحويل لك، تحتاج إلى التحقق من هويتك (دقيقتان) — يتم هذا مرة واحدة فقط، ولن يُطلب منك مجدداً في التحويلات القادمة. افتح هذا الرابط: {link}",
  },
  am: {
    greeting: "👋 ሰላም! እኔ የOmniPay ረዳት ነኝ።\n\nምን ያህል መላክ ይፈልጋሉ፣ ወደ የትኛው ሀገር፣ እና ኢሜይልዎ ምንድን ነው? (መለያዎን ለማረጋገጥ እንጠቀምበታለን፣ ይህ የሚደረገው አንድ ጊዜ ብቻ ነው)\n\nእንደዚህ ይጻፉ:\n• *200 USD ሜክሲኮ juan@email.com*\n• *500 CAD ኮሎምቢያ juan@email.com*\n• *1000 EUR ስፔን juan@email.com*\n\n_(ይህ ውይይት ለደህንነትዎ በ5 ደቂቃ ውስጥ ያበቃል)_",
    kyc_needed: "የመጀመሪያ ዝውውርዎን ለማጠናቀቅ ማንነትዎን ማረጋገጥ ያስፈልግዎታል (2 ደቂቃ) — ይህ የሚደረገው አንድ ጊዜ ብቻ ነው፣ የሚቀጥሉት ዝውውሮችዎ እንደገና አይጠየቁም። ይህን አገናኝ ይክፈቱ: {link}",
  },
  ha: {
    greeting: "👋 Sannu! Ni ne mataimakin OmniPay.\n\nNawa kake son aikawa, zuwa wace ƙasa, kuma menene imel ɗinka? (muna amfani da shi don tabbatar da asusunka, ana yin wannan sau ɗaya kawai)\n\nRubuta kamar haka:\n• *200 USD Mexico juan@email.com*\n• *500 CAD Colombia juan@email.com*\n• *1000 EUR Spain juan@email.com*\n\n_(Wannan tattaunawar za ta ƙare a cikin mintuna 5 don tsaronka)_",
    kyc_needed: "Don kammala canja wurin ka na farko, kana buƙatar tabbatar da asalinka (mintuna 2) — ana yin wannan sau ɗaya kawai, canja wurin ka na gaba ba za a sake tambaya ba. Buɗe wannan hanyar haɗi: {link}",
  },
  sw: {
    greeting: "👋 Habari! Mimi ni msaidizi wa OmniPay.\n\nUnataka kutuma kiasi gani, kwenda nchi gani, na barua pepe yako ni ipi? (tunaitumia kuthibitisha akaunti yako, hii hufanyika mara moja tu)\n\nAndika kitu kama:\n• *200 USD Mexico juan@email.com*\n• *500 CAD Colombia juan@email.com*\n• *1000 EUR Spain juan@email.com*\n\n_(Mazungumzo haya yataisha muda wake baada ya dakika 5 kwa usalama wako)_",
    kyc_needed: "Ili kukamilisha uhamisho wako wa kwanza unahitaji kuthibitisha utambulisho wako (dakika 2) — hii hufanyika mara moja tu, uhamisho wako ujao hautaulizwa tena. Fungua kiungo hiki: {link}",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
