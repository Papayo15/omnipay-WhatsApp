// One-shot: two UX fixes to the "whatsapp" namespace across all 19 locales.
//   1. Reuse notices (greeting_reuse_hint, confirmed_deposit_reusable) now say explicitly
//      "same recipient in that same country" — the VA/liquidation address is unique per
//      recipient+country/currency, not a blanket "reuse this account for anything".
//   2. "comparar" flow unified into ONE fluid message (compare_reply) instead of two
//      back-to-back messages that felt disjointed — ends with the SI-to-send bridge and
//      an explicit "or quote something else / '1' for the menu" alternative.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    compare_usage: "📊 To compare, write it like this:\n\"comparar [amount] [currency] [country]\" (e.g. comparar 200 USD Mexico)\n\nI'll show you how much more your recipient gets with OmniPay vs. traditional banking.",
    compare_reply: "🔎 Comparison for sending {amount} {currency} to {country_name} ({country_code}):\n\n⚡ With OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Traditional remittance company (est.): {competitor_amount} {recipient_currency}\n\n💰 Your recipient gets +{savings} {recipient_currency} extra with us.\n\n----------------------------------\nWhat would you like to do now?\n👉 Reply *YES* to send these {amount} {currency} now.\n👉 Or write another quote (e.g. comparar 500 USD Colombia) or \"1\" for the menu.",
    greeting_reuse_hint: "💡 Already sent to this same recipient in that same country before? No need to message us again — just use the same account saved in your banking app.",
    confirmed_deposit_reusable: "💡 Save this account in your banking app — it's yours for good to send to {recipient_name} in {country_name}. You can reuse it as many times as you want, just open your bank app and change the amount, no need to message us here again. (Sending to a different country will need a new transfer started here.)",
  },
  es: {
    compare_usage: "📊 Para comparar, escríbeme así:\n\"comparar [monto] [moneda] [país]\" (ej: comparar 200 USD México)\n\nTe muestro cuánto más recibe tu destinatario con OmniPay vs. la banca tradicional.",
    compare_reply: "🔎 Comparativa para enviar {amount} {currency} a {country_name} ({country_code}):\n\n⚡ Con OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Remesadora tradicional (est.): {competitor_amount} {recipient_currency}\n\n💰 Tu destinatario recibe +{savings} {recipient_currency} extra con nosotros.\n\n----------------------------------\n¿Qué deseas hacer ahora?\n👉 Responde *SI* para enviar estos {amount} {currency} ahora.\n👉 O escribe otra cotización (ej: comparar 500 USD Colombia) o \"1\" para ir al menú.",
    greeting_reuse_hint: "💡 ¿Ya le has enviado antes a este mismo destinatario en ese mismo país? No hace falta escribirnos de nuevo: usa la misma cuenta guardada en la app de tu banco.",
    confirmed_deposit_reusable: "💡 Guarda esta cuenta en tu app bancaria: es tuya para siempre para enviarle a {recipient_name} en {country_name}. Puedes reutilizarla las veces que quieras, solo entra a tu banco y cambia el monto, sin necesidad de escribirnos aquí de nuevo. (Si le envías a otro país, sí necesitarás iniciar un nuevo envío aquí.)",
  },
  de: {
    compare_usage: "📊 Für einen Vergleich schreib es so:\n\"comparar [Betrag] [Währung] [Land]\" (z. B. comparar 200 USD Mexiko)\n\nIch zeige dir, wie viel mehr dein Empfänger mit OmniPay bekommt im Vergleich zum klassischen Bankweg.",
    compare_reply: "🔎 Vergleich für {amount} {currency} nach {country_name} ({country_code}):\n\n⚡ Mit OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Klassischer Geldtransferdienst (geschätzt): {competitor_amount} {recipient_currency}\n\n💰 Dein Empfänger bekommt bei uns +{savings} {recipient_currency} extra.\n\n----------------------------------\nWas möchtest du jetzt tun?\n👉 Antworte mit *JA*, um diese {amount} {currency} jetzt zu senden.\n👉 Oder schreib einen anderen Vergleich (z. B. comparar 500 USD Kolumbien) oder \"1\" fürs Menü.",
    greeting_reuse_hint: "💡 Schon einmal an denselben Empfänger im selben Land gesendet? Du musst uns nicht erneut schreiben — nutze einfach dasselbe Konto aus deiner Banking-App.",
    confirmed_deposit_reusable: "💡 Speichere dieses Konto in deiner Banking-App — es gehört dir dauerhaft, um an {recipient_name} in {country_name} zu senden. Du kannst es beliebig oft wiederverwenden, öffne einfach deine Banking-App und ändere den Betrag, ohne uns hier erneut zu schreiben. (Für ein anderes Land musst du hier eine neue Überweisung starten.)",
  },
  fr: {
    compare_usage: "📊 Pour comparer, écris comme ça :\n\"comparar [montant] [devise] [pays]\" (ex : comparar 200 USD Mexique)\n\nJe te montre combien de plus ton destinataire reçoit avec OmniPay par rapport à la banque traditionnelle.",
    compare_reply: "🔎 Comparatif pour envoyer {amount} {currency} vers {country_name} ({country_code}) :\n\n⚡ Avec OmniPay : {omnipay_amount} {recipient_currency}\n🐌 Société de transfert traditionnelle (estimation) : {competitor_amount} {recipient_currency}\n\n💰 Ton destinataire reçoit +{savings} {recipient_currency} de plus avec nous.\n\n----------------------------------\nQue veux-tu faire maintenant ?\n👉 Réponds *OUI* pour envoyer ces {amount} {currency} maintenant.\n👉 Ou écris une autre comparaison (ex : comparar 500 USD Colombie) ou \"1\" pour le menu.",
    greeting_reuse_hint: "💡 Tu as déjà envoyé au même destinataire dans le même pays ? Pas besoin de nous réécrire — utilise le même compte enregistré dans ton appli bancaire.",
    confirmed_deposit_reusable: "💡 Enregistre ce compte dans ton appli bancaire — il est à toi pour toujours pour envoyer à {recipient_name} en {country_name}. Tu peux le réutiliser autant de fois que tu veux, ouvre juste ta banque et change le montant, sans avoir besoin de nous réécrire ici. (Pour un autre pays, il faudra démarrer un nouvel envoi ici.)",
  },
  it: {
    compare_usage: "📊 Per confrontare, scrivi così:\n\"comparar [importo] [valuta] [paese]\" (es: comparar 200 USD Messico)\n\nTi mostro quanto in più riceve il tuo destinatario con OmniPay rispetto alla banca tradizionale.",
    compare_reply: "🔎 Confronto per inviare {amount} {currency} a {country_name} ({country_code}):\n\n⚡ Con OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Rimessa tradizionale (stima): {competitor_amount} {recipient_currency}\n\n💰 Il tuo destinatario riceve +{savings} {recipient_currency} in più con noi.\n\n----------------------------------\nCosa vuoi fare ora?\n👉 Rispondi *SI* per inviare questi {amount} {currency} ora.\n👉 Oppure scrivi un altro confronto (es: comparar 500 USD Colombia) o \"1\" per il menu.",
    greeting_reuse_hint: "💡 Hai già inviato allo stesso destinatario nello stesso paese? Non serve riscriverci — usa lo stesso conto salvato nella tua app bancaria.",
    confirmed_deposit_reusable: "💡 Salva questo conto nella tua app bancaria — è tuo per sempre per inviare a {recipient_name} in {country_name}. Puoi riutilizzarlo quante volte vuoi, apri semplicemente la tua banca e cambia l'importo, senza bisogno di riscriverci qui. (Per un altro paese dovrai avviare un nuovo invio qui.)",
  },
  nl: {
    compare_usage: "📊 Om te vergelijken, schrijf zo:\n\"comparar [bedrag] [valuta] [land]\" (bijv. comparar 200 USD Mexico)\n\nIk laat je zien hoeveel meer je ontvanger krijgt met OmniPay vs. de traditionele bank.",
    compare_reply: "🔎 Vergelijking voor het versturen van {amount} {currency} naar {country_name} ({country_code}):\n\n⚡ Met OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Traditionele geldtransferdienst (schatting): {competitor_amount} {recipient_currency}\n\n💰 Je ontvanger krijgt bij ons +{savings} {recipient_currency} extra.\n\n----------------------------------\nWat wil je nu doen?\n👉 Antwoord met *JA* om deze {amount} {currency} nu te versturen.\n👉 Of schrijf een andere vergelijking (bijv. comparar 500 USD Colombia) of \"1\" voor het menu.",
    greeting_reuse_hint: "💡 Al eerder naar dezelfde ontvanger in datzelfde land gestuurd? Je hoeft ons niet opnieuw te schrijven — gebruik dezelfde rekening die opgeslagen staat in je bank-app.",
    confirmed_deposit_reusable: "💡 Sla deze rekening op in je bank-app — hij is voorgoed van jou om naar {recipient_name} in {country_name} te sturen. Je kunt hem zo vaak gebruiken als je wilt, open gewoon je bank en wijzig het bedrag, zonder ons hier opnieuw te hoeven schrijven. (Voor een ander land moet je hier een nieuwe overboeking starten.)",
  },
  pt: {
    compare_usage: "📊 Para comparar, escreva assim:\n\"comparar [valor] [moeda] [país]\" (ex: comparar 200 USD México)\n\nMostro quanto a mais seu destinatário recebe com a OmniPay em comparação com o banco tradicional.",
    compare_reply: "🔎 Comparativo para enviar {amount} {currency} para {country_name} ({country_code}):\n\n⚡ Com a OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Remessa tradicional (estimativa): {competitor_amount} {recipient_currency}\n\n💰 Seu destinatário recebe +{savings} {recipient_currency} a mais com a gente.\n\n----------------------------------\nO que você quer fazer agora?\n👉 Responda *SIM* para enviar esses {amount} {currency} agora.\n👉 Ou escreva outra cotação (ex: comparar 500 USD Colômbia) ou \"1\" para o menu.",
    greeting_reuse_hint: "💡 Já enviou para esse mesmo destinatário nesse mesmo país antes? Não precisa nos escrever de novo — use a mesma conta salva no app do seu banco.",
    confirmed_deposit_reusable: "💡 Salve esta conta no app do seu banco — ela é sua para sempre para enviar a {recipient_name} em {country_name}. Você pode reutilizá-la quantas vezes quiser, é só abrir seu banco e mudar o valor, sem precisar nos escrever aqui de novo. (Para outro país, você vai precisar iniciar um novo envio aqui.)",
  },
  tr: {
    compare_usage: "📊 Karşılaştırmak için şöyle yaz:\n\"comparar [tutar] [para birimi] [ülke]\" (örn: comparar 200 USD Meksika)\n\nAlıcının OmniPay ile geleneksel bankacılığa göre ne kadar daha fazla aldığını göstereyim.",
    compare_reply: "🔎 {amount} {currency} tutarını {country_name} ({country_code}) ülkesine gönderme karşılaştırması:\n\n⚡ OmniPay ile: {omnipay_amount} {recipient_currency}\n🐌 Geleneksel para transfer şirketi (tahmini): {competitor_amount} {recipient_currency}\n\n💰 Alıcın bizimle +{savings} {recipient_currency} fazladan alıyor.\n\n----------------------------------\nŞimdi ne yapmak istersin?\n👉 Bu {amount} {currency} tutarını şimdi göndermek için *EVET* yaz.\n👉 Ya da başka bir karşılaştırma yaz (örn: comparar 500 USD Kolombiya) veya menü için \"1\" yaz.",
    greeting_reuse_hint: "💡 Aynı alıcıya aynı ülkede daha önce gönderdin mi? Bize tekrar yazmana gerek yok — bankacılık uygulamanda kayıtlı aynı hesabı kullan.",
    confirmed_deposit_reusable: "💡 Bu hesabı bankacılık uygulamana kaydet — {country_name} ülkesindeki {recipient_name}'e göndermek için sonsuza kadar senin. İstediğin kadar tekrar kullanabilirsin, bankana gir ve tutarı değiştir, burada bize tekrar yazmana gerek yok. (Başka bir ülkeye göndermek için burada yeni bir transfer başlatman gerekecek.)",
  },
  ru: {
    compare_usage: "📊 Чтобы сравнить, напиши так:\n\"comparar [сумма] [валюта] [страна]\" (напр. comparar 200 USD Мексика)\n\nПокажу, сколько больше получит твой получатель с OmniPay по сравнению с традиционным банком.",
    compare_reply: "🔎 Сравнение для отправки {amount} {currency} в {country_name} ({country_code}):\n\n⚡ С OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Традиционная служба переводов (примерно): {competitor_amount} {recipient_currency}\n\n💰 Твой получатель получает у нас на +{savings} {recipient_currency} больше.\n\n----------------------------------\nЧто хочешь сделать сейчас?\n👉 Ответь *ДА*, чтобы отправить эти {amount} {currency} прямо сейчас.\n👉 Или напиши другое сравнение (напр. comparar 500 USD Колумбия) или \"1\" для меню.",
    greeting_reuse_hint: "💡 Уже отправлял этому же получателю в той же стране раньше? Писать нам снова не нужно — просто используй тот же счёт, сохранённый в приложении твоего банка.",
    confirmed_deposit_reusable: "💡 Сохрани этот счёт в приложении своего банка — он твой навсегда для отправки {recipient_name} в {country_name}. Можешь использовать его сколько угодно раз, просто открой банк и измени сумму, писать нам здесь снова не нужно. (Для другой страны нужно будет начать новый перевод здесь.)",
  },
  vi: {
    compare_usage: "📊 Để so sánh, viết thế này:\n\"comparar [số tiền] [tiền tệ] [quốc gia]\" (vd: comparar 200 USD Mexico)\n\nTôi sẽ cho bạn thấy người nhận của bạn nhận được nhiều hơn bao nhiêu với OmniPay so với ngân hàng truyền thống.",
    compare_reply: "🔎 So sánh khi gửi {amount} {currency} đến {country_name} ({country_code}):\n\n⚡ Với OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Dịch vụ chuyển tiền truyền thống (ước tính): {competitor_amount} {recipient_currency}\n\n💰 Người nhận của bạn nhận thêm +{savings} {recipient_currency} khi dùng chúng tôi.\n\n----------------------------------\nBạn muốn làm gì bây giờ?\n👉 Trả lời *CÓ* để gửi {amount} {currency} này ngay bây giờ.\n👉 Hoặc viết một báo giá khác (vd: comparar 500 USD Colombia) hoặc \"1\" để vào menu.",
    greeting_reuse_hint: "💡 Đã từng gửi cho cùng người nhận này ở cùng quốc gia đó rồi? Không cần nhắn lại cho chúng tôi — chỉ cần dùng cùng tài khoản đã lưu trong ứng dụng ngân hàng của bạn.",
    confirmed_deposit_reusable: "💡 Lưu tài khoản này trong ứng dụng ngân hàng của bạn — nó là của bạn mãi mãi để gửi cho {recipient_name} tại {country_name}. Bạn có thể dùng lại bao nhiêu lần tùy thích, chỉ cần mở ngân hàng và đổi số tiền, không cần nhắn lại cho chúng tôi ở đây. (Nếu gửi sang quốc gia khác, bạn sẽ cần bắt đầu một giao dịch mới ở đây.)",
  },
  id: {
    compare_usage: "📊 Untuk membandingkan, tulis seperti ini:\n\"comparar [jumlah] [mata uang] [negara]\" (mis: comparar 200 USD Meksiko)\n\nSaya akan tunjukkan berapa lebih banyak penerima Anda dapatkan dengan OmniPay dibanding perbankan tradisional.",
    compare_reply: "🔎 Perbandingan untuk mengirim {amount} {currency} ke {country_name} ({country_code}):\n\n⚡ Dengan OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Perusahaan pengiriman uang tradisional (perkiraan): {competitor_amount} {recipient_currency}\n\n💰 Penerima Anda mendapat +{savings} {recipient_currency} ekstra bersama kami.\n\n----------------------------------\nApa yang ingin Anda lakukan sekarang?\n👉 Balas *YA* untuk mengirim {amount} {currency} ini sekarang.\n👉 Atau tulis perbandingan lain (mis: comparar 500 USD Kolombia) atau \"1\" untuk menu.",
    greeting_reuse_hint: "💡 Sudah pernah kirim ke penerima yang sama di negara yang sama sebelumnya? Tidak perlu chat kami lagi — gunakan saja rekening yang sama yang tersimpan di aplikasi bank Anda.",
    confirmed_deposit_reusable: "💡 Simpan rekening ini di aplikasi bank Anda — ini milik Anda selamanya untuk mengirim ke {recipient_name} di {country_name}. Anda bisa menggunakannya berkali-kali, cukup buka bank Anda dan ubah jumlahnya, tanpa perlu chat kami di sini lagi. (Untuk negara lain, Anda perlu memulai transfer baru di sini.)",
  },
  ja: {
    compare_usage: "📊 比較するには、このように書いてください：\n「comparar [金額] [通貨] [国]」（例：comparar 200 USD メキシコ）\n\nOmniPayと従来の銀行を比べて、受取人がどれだけ多く受け取れるかをお見せします。",
    compare_reply: "🔎 {amount} {currency} を {country_name}（{country_code}）に送る場合の比較：\n\n⚡ OmniPayの場合：{omnipay_amount} {recipient_currency}\n🐌 従来の送金会社（概算）：{competitor_amount} {recipient_currency}\n\n💰 当社なら受取人は +{savings} {recipient_currency} 多く受け取れます。\n\n----------------------------------\n次にどうしますか？\n👉 この {amount} {currency} を今すぐ送るには「はい」と返信してください。\n👉 または他の比較を書く（例：comparar 500 USD コロンビア）か、メニューに戻るには「1」と書いてください。",
    greeting_reuse_hint: "💡 同じ受取人に同じ国で以前送金したことがありますか？ 再度メッセージする必要はありません — 銀行アプリに保存されている同じ口座を使ってください。",
    confirmed_deposit_reusable: "💡 この口座を銀行アプリに保存してください — {country_name} の {recipient_name} への送金にずっと使えます。何度でも再利用できます。銀行アプリを開いて金額を変えるだけで、ここに再度メッセージする必要はありません。（別の国に送る場合は、ここで新しい送金を開始する必要があります。）",
  },
  ko: {
    compare_usage: "📊 비교하려면 이렇게 써주세요:\n\"comparar [금액] [통화] [국가]\" (예: comparar 200 USD 멕시코)\n\nOmniPay와 기존 은행을 비교해 수취인이 얼마나 더 받는지 보여드릴게요.",
    compare_reply: "🔎 {amount} {currency}를 {country_name}({country_code})으로 보낼 때 비교:\n\n⚡ OmniPay 이용 시: {omnipay_amount} {recipient_currency}\n🐌 기존 송금 회사(추정): {competitor_amount} {recipient_currency}\n\n💰 저희를 이용하면 수취인이 +{savings} {recipient_currency} 더 받습니다.\n\n----------------------------------\n지금 무엇을 하고 싶으신가요?\n👉 이 {amount} {currency}를 지금 보내려면 *예*라고 답장하세요.\n👉 또는 다른 비교를 입력하거나 (예: comparar 500 USD 콜롬비아) 메뉴로 가려면 \"1\"을 입력하세요.",
    greeting_reuse_hint: "💡 같은 수취인에게 같은 국가로 예전에 보낸 적이 있나요? 다시 메시지할 필요 없어요 — 은행 앱에 저장된 같은 계좌를 사용하세요.",
    confirmed_deposit_reusable: "💡 이 계좌를 은행 앱에 저장하세요 — {country_name}의 {recipient_name}님께 보낼 때 영구적으로 사용할 수 있습니다. 몇 번이든 다시 사용할 수 있어요. 은행 앱을 열고 금액만 바꾸면 되며, 여기로 다시 메시지할 필요는 없습니다. (다른 국가로 보내려면 여기서 새 송금을 시작해야 합니다.)",
  },
  zh: {
    compare_usage: "📊 要比较，请这样写：\n\"comparar [金额] [货币] [国家]\"（例如：comparar 200 USD 墨西哥）\n\n我会告诉你用OmniPay比传统银行多汇多少钱给收款人。",
    compare_reply: "🔎 汇出 {amount} {currency} 到 {country_name}（{country_code}）的比较：\n\n⚡ 使用OmniPay：{omnipay_amount} {recipient_currency}\n🐌 传统汇款公司（估算）：{competitor_amount} {recipient_currency}\n\n💰 通过我们，收款人多收到 +{savings} {recipient_currency}。\n\n----------------------------------\n您现在想做什么？\n👉 回复\"是\"立即汇出这 {amount} {currency}。\n👉 或者输入另一个报价（例如：comparar 500 USD 哥伦比亚）或输入\"1\"返回菜单。",
    greeting_reuse_hint: "💡 之前在同一个国家给同一个收款人汇过款？无需再联系我们——直接使用银行App里保存的同一个账户。",
    confirmed_deposit_reusable: "💡 把这个账户保存到你的银行App里——它永久属于你，可用于向{country_name}的{recipient_name}汇款。你可以随时重复使用，只需打开银行App修改金额，无需再来这里给我们发消息。（如果要汇往其他国家，需要在这里重新开始一笔新的汇款。）",
  },
  hi: {
    compare_usage: "📊 तुलना करने के लिए, ऐसे लिखें:\n\"comparar [राशि] [मुद्रा] [देश]\" (जैसे: comparar 200 USD मेक्सिको)\n\nमैं आपको दिखाऊंगा कि पारंपरिक बैंकिंग की तुलना में OmniPay से आपके प्राप्तकर्ता को कितना अधिक मिलता है।",
    compare_reply: "🔎 {amount} {currency} को {country_name} ({country_code}) भेजने की तुलना:\n\n⚡ OmniPay के साथ: {omnipay_amount} {recipient_currency}\n🐌 पारंपरिक मनी ट्रांसफर कंपनी (अनुमानित): {competitor_amount} {recipient_currency}\n\n💰 हमारे साथ आपके प्राप्तकर्ता को +{savings} {recipient_currency} अतिरिक्त मिलता है।\n\n----------------------------------\nअब आप क्या करना चाहते हैं?\n👉 अभी यह {amount} {currency} भेजने के लिए *हाँ* लिखें।\n👉 या कोई और तुलना लिखें (जैसे: comparar 500 USD कोलंबिया) या मेनू के लिए \"1\" लिखें।",
    greeting_reuse_hint: "💡 क्या आपने पहले भी इसी प्राप्तकर्ता को उसी देश में भेजा है? दोबारा हमें लिखने की ज़रूरत नहीं — बस अपने बैंक ऐप में सेव किया वही खाता इस्तेमाल करें।",
    confirmed_deposit_reusable: "💡 इस खाते को अपने बैंक ऐप में सेव कर लें — यह {country_name} में {recipient_name} को भेजने के लिए हमेशा के लिए आपका है। आप इसे जितनी बार चाहें दोबारा इस्तेमाल कर सकते हैं, बस अपना बैंक खोलें और राशि बदलें, यहां दोबारा लिखने की ज़रूरत नहीं। (किसी दूसरे देश के लिए आपको यहां नया ट्रांसफर शुरू करना होगा।)",
  },
  ar: {
    compare_usage: "📊 للمقارنة، اكتب هكذا:\n\"comparar [المبلغ] [العملة] [الدولة]\" (مثال: comparar 200 USD المكسيك)\n\nسأريك كم يحصل مستفيدك أكثر مع OmniPay مقارنة بالبنوك التقليدية.",
    compare_reply: "🔎 مقارنة لإرسال {amount} {currency} إلى {country_name} ({country_code}):\n\n⚡ مع OmniPay: {omnipay_amount} {recipient_currency}\n🐌 شركة تحويل أموال تقليدية (تقديري): {competitor_amount} {recipient_currency}\n\n💰 يحصل المستفيد لديك على +{savings} {recipient_currency} إضافية معنا.\n\n----------------------------------\nماذا تريد أن تفعل الآن؟\n👉 أجب بـ *نعم* لإرسال هذا المبلغ {amount} {currency} الآن.\n👉 أو اكتب مقارنة أخرى (مثال: comparar 500 USD كولومبيا) أو \"1\" للقائمة.",
    greeting_reuse_hint: "💡 هل أرسلت من قبل لنفس المستفيد في نفس الدولة؟ لا داعي لمراسلتنا مرة أخرى — فقط استخدم نفس الحساب المحفوظ في تطبيق بنكك.",
    confirmed_deposit_reusable: "💡 احفظ هذا الحساب في تطبيق بنكك — إنه لك إلى الأبد لإرسال الأموال إلى {recipient_name} في {country_name}. يمكنك إعادة استخدامه كما تشاء، فقط افتح تطبيق بنكك وغيّر المبلغ، دون الحاجة لمراسلتنا هنا مرة أخرى. (للإرسال إلى دولة أخرى، ستحتاج لبدء تحويل جديد هنا.)",
  },
  am: {
    compare_usage: "📊 ለማወዳደር፣ እንደዚህ ይጻፉ:\n\"comparar [መጠን] [ገንዘብ] [ሀገር]\" (ለምሳሌ: comparar 200 USD ሜክሲኮ)\n\nከባህላዊ ባንክ ጋር ሲነጻጸር ተቀባይዎ በOmniPay ምን ያህል ተጨማሪ እንደሚያገኝ አሳይዎታለሁ።",
    compare_reply: "🔎 {amount} {currency} ወደ {country_name} ({country_code}) ለመላክ ንጽጽር:\n\n⚡ በOmniPay: {omnipay_amount} {recipient_currency}\n🐌 ባህላዊ የገንዘብ መላኪያ (ግምት): {competitor_amount} {recipient_currency}\n\n💰 ተቀባይዎ ከእኛ ጋር +{savings} {recipient_currency} ተጨማሪ ያገኛል።\n\n----------------------------------\nአሁን ምን ማድረግ ይፈልጋሉ?\n👉 ይህን {amount} {currency} አሁን ለመላክ *አዎ* ብለው ይመልሱ።\n👉 ወይም ሌላ ንጽጽር ይጻፉ (ለምሳሌ: comparar 500 USD ኮሎምቢያ) ወይም ለምናሌ \"1\" ይጻፉ።",
    greeting_reuse_hint: "💡 ከዚህ በፊት ለዚህ ተቀባይ በዚሁ ሀገር ልከው ያውቃሉ? እዚህ ደግመው መጻፍ አያስፈልግም — በባንክ መተግበሪያዎ የተቀመጠውን ተመሳሳይ አካውንት ይጠቀሙ።",
    confirmed_deposit_reusable: "💡 ይህን አካውንት በባንክ መተግበሪያዎ ያስቀምጡ — በ{country_name} ላለው {recipient_name} ለመላክ ለዘላለም የእርስዎ ነው። በፈለጉት ጊዜ ሁሉ እንደገና መጠቀም ይችላሉ፣ ባንክዎን ብቻ ይክፈቱ እና መጠኑን ይቀይሩ፣ እዚህ ደግመው መጻፍ አያስፈልግም። (ለሌላ ሀገር፣ እዚህ አዲስ ዝውውር መጀመር ያስፈልግዎታል።)",
  },
  ha: {
    compare_usage: "📊 Don kwatanta, rubuta kamar haka:\n\"comparar [adadi] [kuɗi] [ƙasa]\" (misali: comparar 200 USD Mexico)\n\nZan nuna maka nawa mai karɓarka zai samu ƙari da OmniPay idan aka kwatanta da banki na gargajiya.",
    compare_reply: "🔎 Kwatance don aika {amount} {currency} zuwa {country_name} ({country_code}):\n\n⚡ Da OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Kamfanin canja wurin kuɗi na gargajiya (ƙiyasi): {competitor_amount} {recipient_currency}\n\n💰 Mai karɓarka yana samun +{savings} {recipient_currency} ƙari tare da mu.\n\n----------------------------------\nMe kake son yi yanzu?\n👉 Amsa da *I* don aika wannan {amount} {currency} yanzu.\n👉 Ko rubuta wani kwatance (misali: comparar 500 USD Colombia) ko \"1\" don menu.",
    greeting_reuse_hint: "💡 Ka taɓa aikawa ga wannan mai karɓa a wannan ƙasar a baya? Ba bukatar sake rubuto mana — kawai yi amfani da asusun nan da aka ajiye a app ɗin bankinka.",
    confirmed_deposit_reusable: "💡 Ajiye wannan asusun a app ɗin bankinka — naka ne har abada don aikawa ga {recipient_name} a {country_name}. Za ka iya sake amfani da shi sau da yawa yadda kake so, kawai buɗe bankinka ka canza adadin, ba tare da bukatar sake rubuto mana a nan ba. (Don wata ƙasa dabam, za ka bukaci fara sabon canja wuri a nan.)",
  },
  sw: {
    compare_usage: "📊 Kulinganisha, andika hivi:\n\"comparar [kiasi] [sarafu] [nchi]\" (mfano: comparar 200 USD Mexico)\n\nNitakuonyesha ni kiasi gani zaidi mpokeaji wako anapata kwa OmniPay ikilinganishwa na benki ya kawaida.",
    compare_reply: "🔎 Ulinganisho wa kutuma {amount} {currency} kwenda {country_name} ({country_code}):\n\n⚡ Kwa OmniPay: {omnipay_amount} {recipient_currency}\n🐌 Kampuni ya kawaida ya kutuma pesa (makadirio): {competitor_amount} {recipient_currency}\n\n💰 Mpokeaji wako anapata +{savings} {recipient_currency} zaidi kwetu.\n\n----------------------------------\nUnataka kufanya nini sasa?\n👉 Jibu *NDIYO* kutuma {amount} {currency} hii sasa.\n👉 Au andika ulinganisho mwingine (mfano: comparar 500 USD Colombia) au \"1\" kwa menyu.",
    greeting_reuse_hint: "💡 Umeshamtumia mpokeaji huyu huyu katika nchi hiyo hiyo hapo awali? Hakuna haja ya kuandika tena — tumia tu akaunti ile ile iliyohifadhiwa kwenye programu ya benki yako.",
    confirmed_deposit_reusable: "💡 Hifadhi akaunti hii katika programu ya benki yako — ni yako milele kutuma kwa {recipient_name} nchini {country_name}. Unaweza kuitumia tena mara nyingi upendavyo, fungua tu benki yako na ubadilishe kiasi, bila kuhitaji kuandika tena hapa. (Kwa nchi nyingine, utahitaji kuanzisha uhamisho mpya hapa.)",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
