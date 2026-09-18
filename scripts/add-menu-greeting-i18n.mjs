// One-shot: rewrites "whatsapp.greeting" as a numbered menu (1) send now / (2) compare
// rates — per the user's spec: the comparison should be a visible, zero-friction entry
// point next to "send money", not a hidden command. Also adds "menu_option_send_prompt"
// (shown when the user picks "1"). Direct free-form entry ("200 USD Mexico juan@x.com")
// still works exactly as before — this is additive, not a replacement of that path.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    greeting: "👋 Hi! Welcome to OmniPay 🌍\nSend money abroad with the best exchange rate and $0 in hidden fees.\n\n1️⃣ Send money now\n2️⃣ Compare rates 📊\n\nWrite *1* or *2* to get started (or go straight to the amount, country and your email, e.g. *200 USD Mexico juan@email.com*).\n\n_(This chat expires in 5 minutes for your security)_",
    menu_option_send_prompt: "Great 👍 Write the amount, country and your email, all together. E.g.: *200 USD Mexico juan@email.com*",
  },
  es: {
    greeting: "👋 ¡Hola! Bienvenido a OmniPay 🌍\nEnvía dinero al extranjero con el mejor tipo de cambio y $0 en comisiones ocultas.\n\n1️⃣ Enviar dinero ahora\n2️⃣ Comparar tarifas 📊\n\nEscribe *1* o *2* para comenzar (o directo el monto, país y tu correo, ej. *200 USD México juan@correo.com*).\n\n_(Este chat expira en 5 minutos por seguridad)_",
    menu_option_send_prompt: "Perfecto 👍 Escríbeme el monto, el país y tu correo, todo junto. Ej: *200 USD México juan@correo.com*",
  },
  de: {
    greeting: "👋 Hallo! Willkommen bei OmniPay 🌍\nSchick Geld ins Ausland zum besten Wechselkurs und ohne versteckte Gebühren.\n\n1️⃣ Jetzt Geld senden\n2️⃣ Gebühren vergleichen 📊\n\nSchreib *1* oder *2*, um loszulegen (oder direkt Betrag, Land und deine E-Mail, z. B. *200 USD Mexiko juan@email.com*).\n\n_(Dieser Chat läuft aus Sicherheitsgründen in 5 Minuten ab)_",
    menu_option_send_prompt: "Super 👍 Schreib mir Betrag, Land und deine E-Mail zusammen. Z. B.: *200 USD Mexiko juan@email.com*",
  },
  fr: {
    greeting: "👋 Bonjour ! Bienvenue chez OmniPay 🌍\nEnvoie de l'argent à l'étranger au meilleur taux de change et sans frais cachés.\n\n1️⃣ Envoyer de l'argent maintenant\n2️⃣ Comparer les tarifs 📊\n\nÉcris *1* ou *2* pour commencer (ou directement le montant, le pays et ton e-mail, ex. *200 USD Mexique juan@email.com*).\n\n_(Cette conversation expire dans 5 minutes pour votre sécurité)_",
    menu_option_send_prompt: "Parfait 👍 Écris-moi le montant, le pays et ton e-mail, le tout ensemble. Ex. : *200 USD Mexique juan@email.com*",
  },
  it: {
    greeting: "👋 Ciao! Benvenuto su OmniPay 🌍\nInvia denaro all'estero al miglior tasso di cambio e senza commissioni nascoste.\n\n1️⃣ Invia denaro ora\n2️⃣ Confronta le tariffe 📊\n\nScrivi *1* o *2* per iniziare (oppure vai diretto con importo, paese e la tua email, es. *200 USD Messico juan@email.com*).\n\n_(Questa chat scade tra 5 minuti per sicurezza)_",
    menu_option_send_prompt: "Perfetto 👍 Scrivimi importo, paese e la tua email, tutto insieme. Es.: *200 USD Messico juan@email.com*",
  },
  nl: {
    greeting: "👋 Hoi! Welkom bij OmniPay 🌍\nStuur geld naar het buitenland tegen de beste wisselkoers en zonder verborgen kosten.\n\n1️⃣ Nu geld versturen\n2️⃣ Tarieven vergelijken 📊\n\nSchrijf *1* of *2* om te beginnen (of meteen bedrag, land en je e-mail, bijv. *200 USD Mexico juan@email.com*).\n\n_(Deze chat verloopt over 5 minuten voor je veiligheid)_",
    menu_option_send_prompt: "Top 👍 Schrijf me bedrag, land en je e-mail, allemaal samen. Bijv.: *200 USD Mexico juan@email.com*",
  },
  pt: {
    greeting: "👋 Olá! Bem-vindo à OmniPay 🌍\nEnvie dinheiro para o exterior com a melhor taxa de câmbio e $0 em taxas ocultas.\n\n1️⃣ Enviar dinheiro agora\n2️⃣ Comparar tarifas 📊\n\nEscreva *1* ou *2* para começar (ou direto o valor, país e seu e-mail, ex. *200 USD México juan@email.com*).\n\n_(Este chat expira em 5 minutos por segurança)_",
    menu_option_send_prompt: "Perfeito 👍 Escreva o valor, o país e seu e-mail, tudo junto. Ex.: *200 USD México juan@email.com*",
  },
  tr: {
    greeting: "👋 Merhaba! OmniPay'e hoş geldin 🌍\nEn iyi döviz kuruyla ve gizli ücret olmadan yurt dışına para gönder.\n\n1️⃣ Şimdi para gönder\n2️⃣ Ücretleri karşılaştır 📊\n\nBaşlamak için *1* veya *2* yaz (ya da direkt tutar, ülke ve e-postanı yaz, örn. *200 USD Meksika juan@email.com*).\n\n_(Bu sohbet güvenliğiniz için 5 dakika içinde sona erer)_",
    menu_option_send_prompt: "Harika 👍 Tutar, ülke ve e-postanı birlikte yaz. Örn.: *200 USD Meksika juan@email.com*",
  },
  ru: {
    greeting: "👋 Привет! Добро пожаловать в OmniPay 🌍\nОтправляй деньги за границу по лучшему курсу и без скрытых комиссий.\n\n1️⃣ Отправить деньги сейчас\n2️⃣ Сравнить тарифы 📊\n\nНапиши *1* или *2*, чтобы начать (или сразу сумму, страну и свой email, напр. *200 USD Мексика juan@email.com*).\n\n_(Этот чат истекает через 5 минут в целях безопасности)_",
    menu_option_send_prompt: "Отлично 👍 Напиши сумму, страну и свой email вместе. Напр.: *200 USD Мексика juan@email.com*",
  },
  vi: {
    greeting: "👋 Xin chào! Chào mừng đến với OmniPay 🌍\nGửi tiền ra nước ngoài với tỷ giá tốt nhất và không phí ẩn.\n\n1️⃣ Gửi tiền ngay\n2️⃣ So sánh phí 📊\n\nViết *1* hoặc *2* để bắt đầu (hoặc viết luôn số tiền, quốc gia và email của bạn, vd. *200 USD Mexico juan@email.com*).\n\n_(Cuộc trò chuyện này hết hạn sau 5 phút vì lý do bảo mật)_",
    menu_option_send_prompt: "Tuyệt 👍 Viết số tiền, quốc gia và email của bạn cùng nhau. Vd.: *200 USD Mexico juan@email.com*",
  },
  id: {
    greeting: "👋 Hai! Selamat datang di OmniPay 🌍\nKirim uang ke luar negeri dengan kurs terbaik dan tanpa biaya tersembunyi.\n\n1️⃣ Kirim uang sekarang\n2️⃣ Bandingkan tarif 📊\n\nTulis *1* atau *2* untuk mulai (atau langsung jumlah, negara, dan email Anda, mis. *200 USD Meksiko juan@email.com*).\n\n_(Obrolan ini kedaluwarsa dalam 5 menit demi keamanan Anda)_",
    menu_option_send_prompt: "Bagus 👍 Tulis jumlah, negara, dan email Anda sekaligus. Mis.: *200 USD Meksiko juan@email.com*",
  },
  ja: {
    greeting: "👋 こんにちは！OmniPayへようこそ 🌍\n最高レートで、隠れ手数料なしで海外送金。\n\n1️⃣ 今すぐ送金する\n2️⃣ 料金を比較する 📊\n\n*1* または *2* と書いて始めてください（または金額、国、メールアドレスを直接書いてもOKです。例：*200 USD メキシコ juan@email.com*）。\n\n_(このチャットはセキュリティのため5分で期限切れになります)_",
    menu_option_send_prompt: "了解です 👍 金額、国、メールアドレスを一緒に書いてください。例：*200 USD メキシコ juan@email.com*",
  },
  ko: {
    greeting: "👋 안녕하세요! OmniPay에 오신 것을 환영합니다 🌍\n최고의 환율과 숨겨진 수수료 없이 해외로 송금하세요.\n\n1️⃣ 지금 송금하기\n2️⃣ 요금 비교하기 📊\n\n시작하려면 *1* 또는 *2*를 입력하세요 (또는 금액, 국가, 이메일을 바로 입력해도 됩니다. 예: *200 USD 멕시코 juan@email.com*).\n\n_(보안을 위해 이 채팅은 5분 후 만료됩니다)_",
    menu_option_send_prompt: "좋아요 👍 금액, 국가, 이메일을 함께 적어주세요. 예: *200 USD 멕시코 juan@email.com*",
  },
  zh: {
    greeting: "👋 你好！欢迎使用OmniPay 🌍\n以最优汇率汇款到国外，零隐藏费用。\n\n1️⃣ 立即汇款\n2️⃣ 比较费率 📊\n\n输入 *1* 或 *2* 开始（或直接输入金额、国家和您的邮箱，例如 *200 USD 墨西哥 juan@email.com*）。\n\n_(为了您的安全，此聊天将在5分钟后过期)_",
    menu_option_send_prompt: "好的 👍 请把金额、国家和邮箱一起写给我。例如：*200 USD 墨西哥 juan@email.com*",
  },
  hi: {
    greeting: "👋 नमस्ते! OmniPay में आपका स्वागत है 🌍\nसबसे अच्छी विनिमय दर पर और बिना किसी छिपे शुल्क के विदेश पैसे भेजें।\n\n1️⃣ अभी पैसे भेजें\n2️⃣ दरों की तुलना करें 📊\n\nशुरू करने के लिए *1* या *2* लिखें (या सीधे राशि, देश और अपना ईमेल लिखें, जैसे *200 USD मेक्सिको juan@email.com*)।\n\n_(सुरक्षा के लिए यह चैट 5 मिनट में समाप्त हो जाती है)_",
    menu_option_send_prompt: "बढ़िया 👍 राशि, देश और अपना ईमेल एक साथ लिखें। जैसे: *200 USD मेक्सिको juan@email.com*",
  },
  ar: {
    greeting: "👋 مرحباً! أهلاً بك في OmniPay 🌍\nأرسل أموالاً إلى الخارج بأفضل سعر صرف وبدون رسوم خفية.\n\n1️⃣ إرسال الأموال الآن\n2️⃣ مقارنة الأسعار 📊\n\nاكتب *1* أو *2* للبدء (أو اكتب المبلغ والدولة وبريدك الإلكتروني مباشرة، مثال: *200 USD المكسيك juan@email.com*).\n\n_(تنتهي صلاحية هذه المحادثة خلال 5 دقائق لأمانك)_",
    menu_option_send_prompt: "ممتاز 👍 اكتب المبلغ والدولة وبريدك الإلكتروني معاً. مثال: *200 USD المكسيك juan@email.com*",
  },
  am: {
    greeting: "👋 ሰላም! ወደ OmniPay እንኳን በደህና መጡ 🌍\nበተሻለ የምንዛሬ ተመን እና ያለ ተደብቀ ክፍያ ገንዘብ ወደ ውጭ ይላኩ።\n\n1️⃣ አሁን ገንዘብ ላክ\n2️⃣ ተመኖችን አወዳድር 📊\n\nለመጀመር *1* ወይም *2* ይጻፉ (ወይም በቀጥታ መጠን፣ ሀገር እና ኢሜይልዎን ይጻፉ፣ ለምሳሌ *200 USD ሜክሲኮ juan@email.com*)።\n\n_(ይህ ውይይት ለደህንነትዎ በ5 ደቂቃ ውስጥ ያበቃል)_",
    menu_option_send_prompt: "እሺ 👍 መጠን፣ ሀገር እና ኢሜይልዎን አብረው ይጻፉ። ለምሳሌ: *200 USD ሜክሲኮ juan@email.com*",
  },
  ha: {
    greeting: "👋 Sannu! Barka da zuwa OmniPay 🌍\nAika kuɗi zuwa ƙasashen waje da mafi kyawun farashin canjin kuɗi kuma babu ɓoyayyun kuɗaden sabis.\n\n1️⃣ Aika kuɗi yanzu\n2️⃣ Kwatanta farashi 📊\n\nRubuta *1* ko *2* don farawa (ko kai tsaye adadi, ƙasa da imel ɗinka, misali *200 USD Mexico juan@email.com*).\n\n_(Wannan tattaunawar za ta ƙare a cikin mintuna 5 don tsaronka)_",
    menu_option_send_prompt: "Madalla 👍 Rubuta adadi, ƙasa da imel ɗinka tare. Misali: *200 USD Mexico juan@email.com*",
  },
  sw: {
    greeting: "👋 Habari! Karibu OmniPay 🌍\nTuma pesa nje ya nchi kwa kiwango bora cha ubadilishaji na bila ada zilizofichwa.\n\n1️⃣ Tuma pesa sasa\n2️⃣ Linganisha viwango 📊\n\nAndika *1* au *2* kuanza (au moja kwa moja kiasi, nchi na barua pepe yako, mfano *200 USD Mexico juan@email.com*).\n\n_(Mazungumzo haya yataisha muda wake baada ya dakika 5 kwa usalama wako)_",
    menu_option_send_prompt: "Vizuri 👍 Andika kiasi, nchi na barua pepe yako pamoja. Mfano: *200 USD Mexico juan@email.com*",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
