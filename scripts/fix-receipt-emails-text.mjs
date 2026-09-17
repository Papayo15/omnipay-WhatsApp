// Corrige receipt_emails_sent (namespace "enviar") en los 19 idiomas — el formulario
// nunca pide el email del receptor, así que solo se le puede confirmar al emisor.
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const MSG   = join(__dir, "../messages");

const TEXT = {
  en: "Confirmation email sent to sender",
  es: "Correo de confirmación enviado al emisor",
  pt: "E-mail de confirmação enviado ao remetente",
  fr: "E-mail de confirmation envoyé à l'expéditeur",
  de: "Bestätigungs-E-Mail an den Absender gesendet",
  it: "Email di conferma inviata al mittente",
  nl: "Bevestigingsmail verzonden naar de afzender",
  ja: "確認メールを送信者に送信しました",
  ko: "확인 이메일이 발신자에게 전송되었습니다",
  zh: "确认邮件已发送给发件人",
  hi: "पुष्टिकरण ईमेल भेजने वाले को भेजा गया",
  ar: "تم إرسال بريد إلكتروني للتأكيد إلى المرسل",
  tr: "Onay e-postası gönderene iletildi",
  ru: "Письмо с подтверждением отправлено отправителю",
  vi: "Email xác nhận đã gửi cho người gửi",
  id: "Email konfirmasi dikirim ke pengirim",
  am: "የማረጋገጫ ኢሜይል ለላኪው ተልኳል",
  ha: "An aika imel na tabbatarwa ga mai aikawa",
  sw: "Barua pepe ya uthibitisho imetumwa kwa mtumaji",
};

for (const [lang, text] of Object.entries(TEXT)) {
  const path = join(MSG, `${lang}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  if (json.enviar?.receipt_emails_sent) {
    json.enviar.receipt_emails_sent = text;
    writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
    console.log(`✓ ${lang}.json`);
  } else {
    console.log(`⚠ ${lang}.json — key not found, skipped`);
  }
}
