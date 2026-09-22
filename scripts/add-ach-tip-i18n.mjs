// One-shot: adds "confirmed_deposit_ach_tip" to the "whatsapp" namespace — only shown when
// the deposit rail is "ACH / Wire" (US-origin senders). Root cause it addresses: US banks
// (Wells Fargo, Chase, BofA...) offer a "Link External Account / Transfer to My Own
// Accounts" flow that assumes the account belongs to the same person, and legally requires
// micro-deposit ("trial deposit") verification before the transfer works — 1-3 business
// days. OmniPay's account is a receive-only Bridge/Lead Bank virtual address with no online
// banking to see those cents, so that verification can never complete — confirmed live,
// a real sender's transfer got stuck this way. Verified this is a US-ACH-specific banking
// UX quirk, not something that applies to SEPA/SPEI/PIX/Faster Payments/wires — those are
// all third-party push-payment flows with no "is this my own account?" step to confuse.
// US bank-app action names (Send Money, Pay a Person or Business, Link External Account,
// Wire, Bill Pay) stay in English — that's literally what the buttons say in Wells Fargo/
// Chase/BofA apps regardless of the app's own display language.
import { readFileSync, writeFileSync } from "fs";

const T = {
  es: "💡 Tip para tu banco en EE. UU.: usa \"Send Money\" / \"Pay a Person or Business\" o una transferencia Wire. ⚠️ No uses \"Link External Account\" ni \"Transfer to My Own Accounts\" — eso activa una verificación de depósitos de centavos que tarda días.",
  en: "💡 Tip for your US bank: use \"Send Money\" / \"Pay a Person or Business\" or a Wire transfer. ⚠️ Don't use \"Link External Account\" or \"Transfer to My Own Accounts\" — that triggers a cent-deposit verification that takes days.",
  de: "💡 Tipp für deine US-Bank: nutze \"Send Money\" / \"Pay a Person or Business\" oder eine Wire-Überweisung. ⚠️ Nutze NICHT \"Link External Account\" oder \"Transfer to My Own Accounts\" — das löst eine Cent-Betrag-Verifizierung aus, die Tage dauert.",
  fr: "💡 Astuce pour ta banque aux États-Unis : utilise \"Send Money\" / \"Pay a Person or Business\" ou un virement Wire. ⚠️ N'utilise PAS \"Link External Account\" ni \"Transfer to My Own Accounts\" — cela déclenche une vérification par petits dépôts qui prend plusieurs jours.",
  it: "💡 Suggerimento per la tua banca USA: usa \"Send Money\" / \"Pay a Person or Business\" o un bonifico Wire. ⚠️ NON usare \"Link External Account\" né \"Transfer to My Own Accounts\" — attiva una verifica con depositi di pochi centesimi che richiede giorni.",
  nl: "💡 Tip voor je Amerikaanse bank: gebruik \"Send Money\" / \"Pay a Person or Business\" of een Wire-overschrijving. ⚠️ Gebruik NIET \"Link External Account\" of \"Transfer to My Own Accounts\" — dat activeert een centenbedrag-verificatie die dagen duurt.",
  pt: "💡 Dica para seu banco nos EUA: use \"Send Money\" / \"Pay a Person or Business\" ou uma transferência Wire. ⚠️ NÃO use \"Link External Account\" nem \"Transfer to My Own Accounts\" — isso ativa uma verificação por depósitos de centavos que demora dias.",
  tr: "💡 ABD'deki bankan için ipucu: \"Send Money\" / \"Pay a Person or Business\" ya da Wire transferi kullan. ⚠️ \"Link External Account\" veya \"Transfer to My Own Accounts\" KULLANMA — bu, günler süren küçük tutarlı doğrulama işlemini tetikler.",
  ru: "💡 Совет для твоего банка в США: используй \"Send Money\" / \"Pay a Person or Business\" или перевод Wire. ⚠️ НЕ используй \"Link External Account\" или \"Transfer to My Own Accounts\" — это запускает проверку мелкими депозитами, которая занимает несколько дней.",
  vi: "💡 Mẹo cho ngân hàng của bạn ở Mỹ: dùng \"Send Money\" / \"Pay a Person or Business\" hoặc chuyển khoản Wire. ⚠️ ĐỪNG dùng \"Link External Account\" hay \"Transfer to My Own Accounts\" — việc đó sẽ kích hoạt xác minh bằng khoản tiền vài xu mất nhiều ngày.",
  id: "💡 Tips untuk bank AS Anda: gunakan \"Send Money\" / \"Pay a Person or Business\" atau transfer Wire. ⚠️ JANGAN gunakan \"Link External Account\" atau \"Transfer to My Own Accounts\" — itu memicu verifikasi setoran receh yang memakan waktu berhari-hari.",
  ja: "💡 米国の銀行アプリでのヒント：「Send Money」/「Pay a Person or Business」または電信送金（Wire）を使ってください。⚠️「Link External Account」や「Transfer to My Own Accounts」は使わないでください — 数日かかる少額入金確認が発生します。",
  ko: "💡 미국 은행 앱 팁: \"Send Money\" / \"Pay a Person or Business\" 또는 Wire 송금을 사용하세요. ⚠️ \"Link External Account\"나 \"Transfer to My Own Accounts\"는 사용하지 마세요 — 며칠이 걸리는 소액 입금 확인이 시작됩니다.",
  zh: "💡 美国银行小提示：请使用\"Send Money\"/\"Pay a Person or Business\"或Wire电汇。⚠️ 请勿使用\"Link External Account\"或\"Transfer to My Own Accounts\"——那会触发需要数天的小额存款验证。",
  hi: "💡 आपके US बैंक के लिए सुझाव: \"Send Money\" / \"Pay a Person or Business\" या Wire ट्रांसफर का उपयोग करें। ⚠️ \"Link External Account\" या \"Transfer to My Own Accounts\" का उपयोग न करें — इससे कुछ सेंट के जमा की पुष्टि शुरू हो जाती है जिसमें कई दिन लगते हैं।",
  ar: "💡 نصيحة لبنكك في الولايات المتحدة: استخدم \"Send Money\" / \"Pay a Person or Business\" أو تحويل Wire. ⚠️ لا تستخدم \"Link External Account\" أو \"Transfer to My Own Accounts\" — فذلك يفعّل تحققًا بإيداعات صغيرة يستغرق عدة أيام.",
  am: "💡 ለአሜሪካ ባንክዎ ምክር: \"Send Money\" / \"Pay a Person or Business\" ወይም የWire ዝውውር ይጠቀሙ። ⚠️ \"Link External Account\" ወይም \"Transfer to My Own Accounts\" አይጠቀሙ — ይህ ቀናት የሚወስድ የሳንቲም ተቀማጭ ማረጋገጫ ያስነሳል።",
  ha: "💡 Shawara don bankinka na Amurka: yi amfani da \"Send Money\" / \"Pay a Person or Business\" ko canja wurin Wire. ⚠️ KADA ka yi amfani da \"Link External Account\" ko \"Transfer to My Own Accounts\" — hakan yana kunna tabbatarwar ajiyar kudi kadan wanda yake ɗaukar kwanaki.",
  sw: "💡 Kidokezo kwa benki yako ya Marekani: tumia \"Send Money\" / \"Pay a Person or Business\" au uhamisho wa Wire. ⚠️ USITUMIE \"Link External Account\" au \"Transfer to My Own Accounts\" — hiyo huwasha uthibitisho wa amana ndogo unaochukua siku kadhaa.",
};

for (const [locale, tip] of Object.entries(T)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.whatsapp = { ...json.whatsapp, confirmed_deposit_ach_tip: tip };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${locale}.json`);
}
