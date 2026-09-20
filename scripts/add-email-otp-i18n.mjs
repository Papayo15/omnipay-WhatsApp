// One-shot: adds otp_sent/otp_invalid/otp_expired/otp_too_many_attempts to the "whatsapp"
// namespace — new anti-suplantación gate: the first time a phone number presents an email
// Bridge doesn't already know this phone by, we require a 6-digit code sent to that email
// before letting the conversation continue (matches industry pattern — Félix Pago et al. —
// so a phone can't move money "as" an already-KYC'd identity just by typing its email).
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: {
    otp_sent: "🔐 Por seguridad, enviamos un código de 6 dígitos a {masked_email}. Escríbelo aquí para confirmar que ese correo es tuyo (vence en 10 min).",
    otp_invalid: "Ese código no es correcto. Verifica tu correo e inténtalo de nuevo.",
    otp_expired: "El código venció. Escribe tu monto y correo de nuevo para que te mandemos uno nuevo.",
    otp_too_many_attempts: "Demasiados intentos fallidos. Escribe tu monto y correo de nuevo para pedir un código nuevo.",
  },
  en: {
    otp_sent: "🔐 For your security, we sent a 6-digit code to {masked_email}. Enter it here to confirm this email is yours (expires in 10 min).",
    otp_invalid: "That code isn't right. Check your email and try again.",
    otp_expired: "That code expired. Send your amount and email again and we'll text you a new one.",
    otp_too_many_attempts: "Too many failed attempts. Send your amount and email again to request a new code.",
  },
  de: {
    otp_sent: "🔐 Zu deiner Sicherheit haben wir einen 6-stelligen Code an {masked_email} gesendet. Gib ihn hier ein, um zu bestätigen, dass diese E-Mail dir gehört (läuft in 10 Min. ab).",
    otp_invalid: "Der Code ist falsch. Prüfe deine E-Mail und versuch es erneut.",
    otp_expired: "Der Code ist abgelaufen. Schick deinen Betrag und deine E-Mail erneut, wir senden dir einen neuen.",
    otp_too_many_attempts: "Zu viele fehlgeschlagene Versuche. Schick deinen Betrag und deine E-Mail erneut, um einen neuen Code anzufordern.",
  },
  fr: {
    otp_sent: "🔐 Pour ta sécurité, on a envoyé un code à 6 chiffres à {masked_email}. Saisis-le ici pour confirmer que cet e-mail est le tien (expire dans 10 min).",
    otp_invalid: "Ce code n'est pas correct. Vérifie ton e-mail et réessaie.",
    otp_expired: "Le code a expiré. Renvoie ton montant et ton e-mail pour qu'on t'en envoie un nouveau.",
    otp_too_many_attempts: "Trop de tentatives échouées. Renvoie ton montant et ton e-mail pour demander un nouveau code.",
  },
  it: {
    otp_sent: "🔐 Per sicurezza, abbiamo inviato un codice a 6 cifre a {masked_email}. Scrivilo qui per confermare che questa email è tua (scade tra 10 min).",
    otp_invalid: "Quel codice non è corretto. Controlla la tua email e riprova.",
    otp_expired: "Il codice è scaduto. Scrivi di nuovo il tuo importo ed email e te ne mandiamo uno nuovo.",
    otp_too_many_attempts: "Troppi tentativi falliti. Scrivi di nuovo il tuo importo ed email per richiedere un nuovo codice.",
  },
  nl: {
    otp_sent: "🔐 Voor je veiligheid hebben we een 6-cijferige code gestuurd naar {masked_email}. Voer die hier in om te bevestigen dat dit jouw e-mail is (verloopt over 10 min).",
    otp_invalid: "Die code klopt niet. Controleer je e-mail en probeer opnieuw.",
    otp_expired: "De code is verlopen. Stuur je bedrag en e-mail opnieuw, dan sturen we een nieuwe.",
    otp_too_many_attempts: "Te veel mislukte pogingen. Stuur je bedrag en e-mail opnieuw om een nieuwe code aan te vragen.",
  },
  pt: {
    otp_sent: "🔐 Por segurança, enviamos um código de 6 dígitos para {masked_email}. Digite-o aqui para confirmar que este e-mail é seu (expira em 10 min).",
    otp_invalid: "Esse código não está certo. Confira seu e-mail e tente de novo.",
    otp_expired: "O código expirou. Envie seu valor e e-mail de novo para receber um novo.",
    otp_too_many_attempts: "Muitas tentativas erradas. Envie seu valor e e-mail de novo para pedir um novo código.",
  },
  tr: {
    otp_sent: "🔐 Güvenliğin için {masked_email} adresine 6 haneli bir kod gönderdik. Bu e-postanın sana ait olduğunu onaylamak için buraya yaz (10 dakika içinde sona erer).",
    otp_invalid: "Bu kod doğru değil. E-postanı kontrol et ve tekrar dene.",
    otp_expired: "Kodun süresi doldu. Tutarını ve e-postanı tekrar yaz, sana yeni bir kod gönderelim.",
    otp_too_many_attempts: "Çok fazla başarısız deneme. Yeni bir kod istemek için tutarını ve e-postanı tekrar yaz.",
  },
  ru: {
    otp_sent: "🔐 В целях безопасности мы отправили 6-значный код на {masked_email}. Введите его здесь, чтобы подтвердить, что эта почта ваша (истекает через 10 минут).",
    otp_invalid: "Код неверный. Проверьте почту и попробуйте снова.",
    otp_expired: "Код истёк. Отправьте сумму и почту заново, и мы пришлём новый.",
    otp_too_many_attempts: "Слишком много неудачных попыток. Отправьте сумму и почту заново, чтобы запросить новый код.",
  },
  vi: {
    otp_sent: "🔐 Để bảo mật, chúng tôi đã gửi mã 6 chữ số đến {masked_email}. Nhập mã tại đây để xác nhận email này là của bạn (hết hạn sau 10 phút).",
    otp_invalid: "Mã đó không đúng. Kiểm tra email của bạn và thử lại.",
    otp_expired: "Mã đã hết hạn. Gửi lại số tiền và email để nhận mã mới.",
    otp_too_many_attempts: "Quá nhiều lần thử sai. Gửi lại số tiền và email để yêu cầu mã mới.",
  },
  id: {
    otp_sent: "🔐 Demi keamanan, kami mengirim kode 6 digit ke {masked_email}. Masukkan di sini untuk mengonfirmasi email ini milik Anda (kedaluwarsa dalam 10 menit).",
    otp_invalid: "Kode itu salah. Periksa email Anda dan coba lagi.",
    otp_expired: "Kode sudah kedaluwarsa. Kirim ulang jumlah dan email Anda untuk mendapatkan kode baru.",
    otp_too_many_attempts: "Terlalu banyak percobaan gagal. Kirim ulang jumlah dan email Anda untuk meminta kode baru.",
  },
  ja: {
    otp_sent: "🔐 安全のため、{masked_email}宛てに6桁のコードを送信しました。このメールがあなたのものであることを確認するため、ここに入力してください（10分で失効します）。",
    otp_invalid: "そのコードは正しくありません。メールを確認してもう一度お試しください。",
    otp_expired: "コードの有効期限が切れました。金額とメールをもう一度送信すると、新しいコードをお送りします。",
    otp_too_many_attempts: "失敗が多すぎます。金額とメールをもう一度送信して新しいコードをリクエストしてください。",
  },
  ko: {
    otp_sent: "🔐 보안을 위해 {masked_email}로 6자리 코드를 보냈습니다. 이 이메일이 본인 것임을 확인하려면 여기에 입력하세요 (10분 후 만료).",
    otp_invalid: "코드가 올바르지 않습니다. 이메일을 확인하고 다시 시도하세요.",
    otp_expired: "코드가 만료되었습니다. 금액과 이메일을 다시 보내면 새 코드를 보내드립니다.",
    otp_too_many_attempts: "실패 시도가 너무 많습니다. 새 코드를 요청하려면 금액과 이메일을 다시 보내세요.",
  },
  zh: {
    otp_sent: "🔐 为了您的安全，我们已向{masked_email}发送了6位验证码。请在此输入以确认这是您的邮箱（10分钟后失效）。",
    otp_invalid: "验证码不正确。请检查您的邮箱并重试。",
    otp_expired: "验证码已过期。请重新发送金额和邮箱，我们会给您发送新的验证码。",
    otp_too_many_attempts: "失败次数过多。请重新发送金额和邮箱以请求新验证码。",
  },
  hi: {
    otp_sent: "🔐 आपकी सुरक्षा के लिए, हमने {masked_email} पर 6 अंकों का कोड भेजा है। यह पुष्टि करने के लिए कि यह ईमेल आपका है, इसे यहाँ दर्ज करें (10 मिनट में समाप्त हो जाएगा)।",
    otp_invalid: "वह कोड सही नहीं है। अपना ईमेल जांचें और फिर से प्रयास करें।",
    otp_expired: "कोड समाप्त हो गया। नया कोड पाने के लिए अपनी राशि और ईमेल फिर से भेजें।",
    otp_too_many_attempts: "बहुत सारे असफल प्रयास। नया कोड मांगने के लिए अपनी राशि और ईमेल फिर से भेजें।",
  },
  ar: {
    otp_sent: "🔐 لأمانك، أرسلنا رمزًا من 6 أرقام إلى {masked_email}. أدخله هنا لتأكيد أن هذا البريد ملكك (تنتهي صلاحيته خلال 10 دقائق).",
    otp_invalid: "هذا الرمز غير صحيح. تحقق من بريدك الإلكتروني وحاول مرة أخرى.",
    otp_expired: "انتهت صلاحية الرمز. أرسل المبلغ والبريد الإلكتروني مرة أخرى لنرسل لك رمزًا جديدًا.",
    otp_too_many_attempts: "محاولات فاشلة كثيرة جدًا. أرسل المبلغ والبريد الإلكتروني مرة أخرى لطلب رمز جديد.",
  },
  am: {
    otp_sent: "🔐 ለደህንነትዎ ሲባል የ6 አሃዝ ኮድ ወደ {masked_email} ልከናል። ይህ ኢሜይል የእርስዎ መሆኑን ለማረጋገጥ እዚህ ያስገቡት (በ10 ደቂቃ ውስጥ ያበቃል)።",
    otp_invalid: "ያ ኮድ ትክክል አይደለም። ኢሜይልዎን ይመልከቱ እና እንደገና ይሞክሩ።",
    otp_expired: "ኮዱ አልቋል። አዲስ ኮድ እንድንልክልዎ መጠንዎን እና ኢሜይልዎን እንደገና ይላኩ።",
    otp_too_many_attempts: "በጣም ብዙ ያልተሳኩ ሙከራዎች። አዲስ ኮድ ለመጠየቅ መጠንዎን እና ኢሜይልዎን እንደገና ይላኩ።",
  },
  ha: {
    otp_sent: "🔐 Don tsaronka, mun aika lambar lamba 6 zuwa {masked_email}. Shigar da ita anan don tabbatar da wannan imel naka ne (za ta ƙare cikin minti 10).",
    otp_invalid: "Wannan lambar ba daidai ba ce. Duba imel ɗinka ka sake gwadawa.",
    otp_expired: "Lambar ta ƙare. Sake tura adadin kuɗinka da imel don mu turo maka sabuwa.",
    otp_too_many_attempts: "Yawan gwaje-gwajen da suka gaza ya yi yawa. Sake tura adadin kuɗinka da imel don neman sabuwar lamba.",
  },
  sw: {
    otp_sent: "🔐 Kwa usalama wako, tumetuma msimbo wa tarakimu 6 kwa {masked_email}. Uandike hapa kuthibitisha barua pepe hii ni yako (utaisha baada ya dakika 10).",
    otp_invalid: "Msimbo huo si sahihi. Angalia barua pepe yako na ujaribu tena.",
    otp_expired: "Msimbo umeisha muda wake. Tuma tena kiasi na barua pepe yako ili tukutumie mpya.",
    otp_too_many_attempts: "Majaribio mengi yameshindwa. Tuma tena kiasi na barua pepe yako kuomba msimbo mpya.",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
