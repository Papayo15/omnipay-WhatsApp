// One-shot: trims "whatsapp.greeting" — removes the "(this chat expires in 5 min)" line
// (inaccurate: the real session TTL is 10 min in lib/wa-flow.ts, and framing it as an
// expiring chat was confusing) and the "(or go straight to amount/country/email)"
// parenthetical (redundant now that options 1/2 already cover it).
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: "👋 Hi! Welcome to OmniPay 🌍\nSend money abroad with the best exchange rate and $0 in hidden fees.\n\n1️⃣ Send money now\n2️⃣ Compare rates 📊\n\nWrite *1* or *2* to get started.",
  es: "👋 ¡Hola! Bienvenido a OmniPay 🌍\nEnvía dinero al extranjero con el mejor tipo de cambio y $0 en comisiones ocultas.\n\n1️⃣ Enviar dinero ahora\n2️⃣ Comparar tarifas 📊\n\nEscribe *1* o *2* para comenzar.",
  de: "👋 Hallo! Willkommen bei OmniPay 🌍\nSchick Geld ins Ausland zum besten Wechselkurs und ohne versteckte Gebühren.\n\n1️⃣ Jetzt Geld senden\n2️⃣ Gebühren vergleichen 📊\n\nSchreib *1* oder *2*, um loszulegen.",
  fr: "👋 Bonjour ! Bienvenue chez OmniPay 🌍\nEnvoie de l'argent à l'étranger au meilleur taux de change et sans frais cachés.\n\n1️⃣ Envoyer de l'argent maintenant\n2️⃣ Comparer les tarifs 📊\n\nÉcris *1* ou *2* pour commencer.",
  it: "👋 Ciao! Benvenuto su OmniPay 🌍\nInvia denaro all'estero al miglior tasso di cambio e senza commissioni nascoste.\n\n1️⃣ Invia denaro ora\n2️⃣ Confronta le tariffe 📊\n\nScrivi *1* o *2* per iniziare.",
  nl: "👋 Hoi! Welkom bij OmniPay 🌍\nStuur geld naar het buitenland tegen de beste wisselkoers en zonder verborgen kosten.\n\n1️⃣ Nu geld versturen\n2️⃣ Tarieven vergelijken 📊\n\nSchrijf *1* of *2* om te beginnen.",
  pt: "👋 Olá! Bem-vindo à OmniPay 🌍\nEnvie dinheiro para o exterior com a melhor taxa de câmbio e $0 em taxas ocultas.\n\n1️⃣ Enviar dinheiro agora\n2️⃣ Comparar tarifas 📊\n\nEscreva *1* ou *2* para começar.",
  tr: "👋 Merhaba! OmniPay'e hoş geldin 🌍\nEn iyi döviz kuruyla ve gizli ücret olmadan yurt dışına para gönder.\n\n1️⃣ Şimdi para gönder\n2️⃣ Ücretleri karşılaştır 📊\n\nBaşlamak için *1* veya *2* yaz.",
  ru: "👋 Привет! Добро пожаловать в OmniPay 🌍\nОтправляй деньги за границу по лучшему курсу и без скрытых комиссий.\n\n1️⃣ Отправить деньги сейчас\n2️⃣ Сравнить тарифы 📊\n\nНапиши *1* или *2*, чтобы начать.",
  vi: "👋 Xin chào! Chào mừng đến với OmniPay 🌍\nGửi tiền ra nước ngoài với tỷ giá tốt nhất và không phí ẩn.\n\n1️⃣ Gửi tiền ngay\n2️⃣ So sánh phí 📊\n\nViết *1* hoặc *2* để bắt đầu.",
  id: "👋 Hai! Selamat datang di OmniPay 🌍\nKirim uang ke luar negeri dengan kurs terbaik dan tanpa biaya tersembunyi.\n\n1️⃣ Kirim uang sekarang\n2️⃣ Bandingkan tarif 📊\n\nTulis *1* atau *2* untuk mulai.",
  ja: "👋 こんにちは！OmniPayへようこそ 🌍\n最高レートで、隠れ手数料なしで海外送金。\n\n1️⃣ 今すぐ送金する\n2️⃣ 料金を比較する 📊\n\n*1* または *2* と書いて始めてください。",
  ko: "👋 안녕하세요! OmniPay에 오신 것을 환영합니다 🌍\n최고의 환율과 숨겨진 수수료 없이 해외로 송금하세요.\n\n1️⃣ 지금 송금하기\n2️⃣ 요금 비교하기 📊\n\n시작하려면 *1* 또는 *2*를 입력하세요.",
  zh: "👋 你好！欢迎使用OmniPay 🌍\n以最优汇率汇款到国外，零隐藏费用。\n\n1️⃣ 立即汇款\n2️⃣ 比较费率 📊\n\n输入 *1* 或 *2* 开始。",
  hi: "👋 नमस्ते! OmniPay में आपका स्वागत है 🌍\nसबसे अच्छी विनिमय दर पर और बिना किसी छिपे शुल्क के विदेश पैसे भेजें।\n\n1️⃣ अभी पैसे भेजें\n2️⃣ दरों की तुलना करें 📊\n\nशुरू करने के लिए *1* या *2* लिखें।",
  ar: "👋 مرحباً! أهلاً بك في OmniPay 🌍\nأرسل أموالاً إلى الخارج بأفضل سعر صرف وبدون رسوم خفية.\n\n1️⃣ إرسال الأموال الآن\n2️⃣ مقارنة الأسعار 📊\n\nاكتب *1* أو *2* للبدء.",
  am: "👋 ሰላም! ወደ OmniPay እንኳን በደህና መጡ 🌍\nበተሻለ የምንዛሬ ተመን እና ያለ ተደብቀ ክፍያ ገንዘብ ወደ ውጭ ይላኩ።\n\n1️⃣ አሁን ገንዘብ ላክ\n2️⃣ ተመኖችን አወዳድር 📊\n\nለመጀመር *1* ወይም *2* ይጻፉ።",
  ha: "👋 Sannu! Barka da zuwa OmniPay 🌍\nAika kuɗi zuwa ƙasashen waje da mafi kyawun farashin canjin kuɗi kuma babu ɓoyayyun kuɗaden sabis.\n\n1️⃣ Aika kuɗi yanzu\n2️⃣ Kwatanta farashi 📊\n\nRubuta *1* ko *2* don farawa.",
  sw: "👋 Habari! Karibu OmniPay 🌍\nTuma pesa nje ya nchi kwa kiwango bora cha ubadilishaji na bila ada zilizofichwa.\n\n1️⃣ Tuma pesa sasa\n2️⃣ Linganisha viwango 📊\n\nAndika *1* au *2* kuanza.",
};

for (const [locale, greeting] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, greeting };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
