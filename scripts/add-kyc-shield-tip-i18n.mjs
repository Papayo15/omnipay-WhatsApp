// One-shot: adds "kyc_needed_tip" to the "whatsapp" namespace — the "mensaje escudo" sent
// right after kyc_needed, so the user knows what to expect before Persona opens and what to
// do if the window closes on its own (doesn't depend on Persona firing its redirect — the
// bot picks the conversation back up on its own via the Bridge webhook either way).
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: "💡 Al terminar, toca \"Continuar\" en la pantalla de verificación y luego \"Volver a WhatsApp\". Si la ventana se cierra sola, no pasa nada — vuelve a este chat y seguimos donde quedamos.",
  en: "💡 When you finish, tap \"Continue\" on the verification screen, then \"Back to WhatsApp\". If the window closes on its own, no problem — come back to this chat and we'll pick up right where we left off.",
  de: "💡 Tippe am Ende auf \"Weiter\" im Verifizierungsbildschirm und dann auf \"Zurück zu WhatsApp\". Falls sich das Fenster von selbst schließt, kein Problem — komm einfach zu diesem Chat zurück, wir machen genau dort weiter.",
  fr: "💡 À la fin, appuie sur \"Continuer\" sur l'écran de vérification, puis sur \"Retour à WhatsApp\". Si la fenêtre se ferme toute seule, pas de souci — reviens dans cette conversation, on reprend là où on en était.",
  it: "💡 Alla fine, tocca \"Continua\" nella schermata di verifica, poi \"Torna a WhatsApp\". Se la finestra si chiude da sola, nessun problema — torna in questa chat e riprendiamo da dove eravamo rimasti.",
  nl: "💡 Tik aan het einde op \"Doorgaan\" op het verificatiescherm en dan op \"Terug naar WhatsApp\". Sluit het venster zichzelf? Geen probleem — kom terug naar deze chat, we gaan gewoon verder waar we gebleven waren.",
  pt: "💡 No final, toque em \"Continuar\" na tela de verificação e depois em \"Voltar ao WhatsApp\". Se a janela se fechar sozinha, sem problema — volte para este chat e continuamos de onde paramos.",
  tr: "💡 Bitince doğrulama ekranında \"Devam\"a, sonra \"WhatsApp'a Dön\"e dokun. Pencere kendi kendine kapanırsa sorun değil — bu sohbete geri dön, kaldığımız yerden devam ederiz.",
  ru: "💡 В конце нажми \"Продолжить\" на экране верификации, затем \"Вернуться в WhatsApp\". Если окно закроется само — не страшно, вернись в этот чат, и мы продолжим с того места, где остановились.",
  vi: "💡 Khi xong, nhấn \"Tiếp tục\" trên màn hình xác minh, rồi \"Quay lại WhatsApp\". Nếu cửa sổ tự đóng cũng không sao — quay lại cuộc trò chuyện này, chúng ta sẽ tiếp tục từ chỗ đã dừng.",
  id: "💡 Setelah selesai, ketuk \"Lanjutkan\" di layar verifikasi, lalu \"Kembali ke WhatsApp\". Jika jendela tertutup sendiri, tidak masalah — kembali ke chat ini, kita lanjutkan dari sana.",
  ja: "💡 終わったら、確認画面で「続ける」をタップし、次に「WhatsAppに戻る」をタップしてください。ウィンドウが自動的に閉じても問題ありません — このチャットに戻れば、続きから再開します。",
  ko: "💡 완료되면 인증 화면에서 \"계속\"을 누른 다음 \"WhatsApp으로 돌아가기\"를 누르세요. 창이 저절로 닫혀도 괜찮습니다 — 이 채팅으로 돌아오면 이어서 진행됩니다.",
  zh: "💡 完成后，请在验证界面点击\"继续\"，然后点击\"返回WhatsApp\"。如果窗口自动关闭也没关系——回到这个聊天，我们会从刚才的地方继续。",
  hi: "💡 पूरा होने पर, सत्यापन स्क्रीन पर \"जारी रखें\" दबाएं, फिर \"WhatsApp पर वापस जाएं\" दबाएं। अगर विंडो अपने आप बंद हो जाए, कोई बात नहीं — इस चैट पर वापस आएं, हम वहीं से जारी रखेंगे।",
  ar: "💡 عند الانتهاء، اضغط على \"متابعة\" في شاشة التحقق، ثم \"العودة إلى WhatsApp\". إذا أُغلقت النافذة من تلقاء نفسها، لا مشكلة — عد إلى هذه المحادثة وسنكمل من حيث توقفنا.",
  am: "💡 ሲጨርሱ፣ በማረጋገጫ ስክሪኑ ላይ \"ቀጥል\" የሚለውን ይንኩ፣ ከዚያ \"ወደ WhatsApp ተመለስ\" የሚለውን ይንኩ። መስኮቱ በራሱ ቢዘጋ ችግር የለውም — ወደዚህ ውይይት ይመለሱ፣ ካቆምንበት እንቀጥላለን።",
  ha: "💡 Idan ka gama, danna \"Ci gaba\" a allon tabbatarwa, sannan \"Koma WhatsApp\". Idan taga ta rufe da kanta, babu matsala — koma wannan hira, za mu ci gaba daga inda muka tsaya.",
  sw: "💡 ukimaliza, gusa \"Endelea\" kwenye skrini ya uthibitisho, kisha \"Rudi WhatsApp\". Ikiwa dirisha litajifunga lenyewe, si tatizo — rudi kwenye mazungumzo haya, tutaendelea pale tulipoishia.",
};

for (const [locale, tip] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, kyc_needed_tip: tip };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
