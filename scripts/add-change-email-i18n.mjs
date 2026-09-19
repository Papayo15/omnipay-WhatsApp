// One-shot: adds "whatsapp.change_email_prompt"/"change_email_confirmed"/"change_email_none"
// — the "cambiar correo" command, which explicitly asks for and confirms the new email
// instead of just deleting the old pointer and hoping the user retypes it unprompted.
import { readFileSync, writeFileSync } from "fs";

const T = {
  en: {
    change_email_prompt: "Your current email is: {old_email}\n\nWhat's your new email?",
    change_email_confirmed: "✅ Done — your email is now {email}. Your next transfer will use it.",
    change_email_none: "(none saved yet)",
  },
  es: {
    change_email_prompt: "Tu correo actual es: {old_email}\n\n¿Cuál es tu correo nuevo?",
    change_email_confirmed: "✅ Listo — tu correo ahora es {email}. Tu próximo envío lo usará.",
    change_email_none: "(no tenías ninguno guardado)",
  },
  de: {
    change_email_prompt: "Deine aktuelle E-Mail ist: {old_email}\n\nWie lautet deine neue E-Mail?",
    change_email_confirmed: "✅ Erledigt — deine E-Mail ist jetzt {email}. Deine nächste Überweisung nutzt sie.",
    change_email_none: "(bisher keine gespeichert)",
  },
  fr: {
    change_email_prompt: "Ton e-mail actuel est : {old_email}\n\nQuel est ton nouvel e-mail ?",
    change_email_confirmed: "✅ Fait — ton e-mail est maintenant {email}. Ton prochain envoi l'utilisera.",
    change_email_none: "(aucun enregistré pour l'instant)",
  },
  it: {
    change_email_prompt: "La tua email attuale è: {old_email}\n\nQual è la tua nuova email?",
    change_email_confirmed: "✅ Fatto — la tua email ora è {email}. Il tuo prossimo invio la userà.",
    change_email_none: "(nessuna salvata finora)",
  },
  nl: {
    change_email_prompt: "Je huidige e-mail is: {old_email}\n\nWat is je nieuwe e-mailadres?",
    change_email_confirmed: "✅ Gedaan — je e-mail is nu {email}. Je volgende overboeking gebruikt deze.",
    change_email_none: "(nog geen opgeslagen)",
  },
  pt: {
    change_email_prompt: "Seu e-mail atual é: {old_email}\n\nQual é o seu novo e-mail?",
    change_email_confirmed: "✅ Pronto — seu e-mail agora é {email}. Seu próximo envio vai usá-lo.",
    change_email_none: "(nenhum salvo ainda)",
  },
  tr: {
    change_email_prompt: "Mevcut e-postan: {old_email}\n\nYeni e-postan ne?",
    change_email_confirmed: "✅ Tamam — e-postan artık {email}. Bir sonraki transferin bunu kullanacak.",
    change_email_none: "(henüz kayıtlı yok)",
  },
  ru: {
    change_email_prompt: "Твой текущий email: {old_email}\n\nКакой у тебя новый email?",
    change_email_confirmed: "✅ Готово — теперь твой email {email}. Следующий перевод будет использовать его.",
    change_email_none: "(пока не сохранён)",
  },
  vi: {
    change_email_prompt: "Email hiện tại của bạn là: {old_email}\n\nEmail mới của bạn là gì?",
    change_email_confirmed: "✅ Xong — email của bạn bây giờ là {email}. Lần chuyển tiền tiếp theo sẽ dùng email này.",
    change_email_none: "(chưa lưu email nào)",
  },
  id: {
    change_email_prompt: "Email Anda saat ini: {old_email}\n\nApa email baru Anda?",
    change_email_confirmed: "✅ Selesai — email Anda sekarang {email}. Transfer berikutnya akan menggunakannya.",
    change_email_none: "(belum ada yang tersimpan)",
  },
  ja: {
    change_email_prompt: "現在のメールアドレスは：{old_email}\n\n新しいメールアドレスは何ですか？",
    change_email_confirmed: "✅ 完了しました — メールアドレスは {email} になりました。次回の送金で使用されます。",
    change_email_none: "（まだ保存されていません）",
  },
  ko: {
    change_email_prompt: "현재 이메일: {old_email}\n\n새 이메일이 무엇인가요?",
    change_email_confirmed: "✅ 완료되었습니다 — 이제 이메일이 {email}입니다. 다음 송금부터 적용됩니다.",
    change_email_none: "(아직 저장된 이메일 없음)",
  },
  zh: {
    change_email_prompt: "您当前的邮箱是：{old_email}\n\n您的新邮箱是什么？",
    change_email_confirmed: "✅ 已完成——您的邮箱现在是 {email}。下次汇款将使用此邮箱。",
    change_email_none: "（尚未保存任何邮箱）",
  },
  hi: {
    change_email_prompt: "आपका मौजूदा ईमेल है: {old_email}\n\nआपका नया ईमेल क्या है?",
    change_email_confirmed: "✅ हो गया — अब आपका ईमेल {email} है। आपका अगला ट्रांसफर इसका उपयोग करेगा।",
    change_email_none: "(अभी तक कोई सेव नहीं है)",
  },
  ar: {
    change_email_prompt: "بريدك الإلكتروني الحالي هو: {old_email}\n\nما هو بريدك الإلكتروني الجديد؟",
    change_email_confirmed: "✅ تم — بريدك الإلكتروني الآن {email}. سيُستخدم في تحويلك التالي.",
    change_email_none: "(لا يوجد بريد محفوظ بعد)",
  },
  am: {
    change_email_prompt: "የአሁኑ ኢሜይልዎ: {old_email}\n\nአዲሱ ኢሜይልዎ ምንድን ነው?",
    change_email_confirmed: "✅ ተከናውኗል — ኢሜይልዎ አሁን {email} ነው። የሚቀጥለው ዝውውርዎ ይህንን ይጠቀማል።",
    change_email_none: "(እስካሁን ምንም አልተቀመጠም)",
  },
  ha: {
    change_email_prompt: "Imel ɗinka na yanzu shine: {old_email}\n\nMenene sabon imel ɗinka?",
    change_email_confirmed: "✅ An gama — imel ɗinka yanzu shine {email}. Canja wurin ka na gaba zai yi amfani da shi.",
    change_email_none: "(babu wanda aka ajiye tukuna)",
  },
  sw: {
    change_email_prompt: "Barua pepe yako ya sasa ni: {old_email}\n\nBarua pepe yako mpya ni ipi?",
    change_email_confirmed: "✅ Imefanyika — barua pepe yako sasa ni {email}. Uhamisho wako ujao utaitumia.",
    change_email_none: "(hakuna iliyohifadhiwa bado)",
  },
};

for (const [locale, keys] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, ...keys };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
