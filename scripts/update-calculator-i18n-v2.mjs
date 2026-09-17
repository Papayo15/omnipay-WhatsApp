// Actualiza namespace "calculator": competitor_spread_label con {fee}, + annual_savings_note,
// + p2p_only_label (aclara que el badge es solo para envíos personales, no B2B)
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const MSG   = join(__dir, "../messages");

const UPDATES = {
  en: {
    competitor_spread_label: "Hidden spread (3.2%) + shipping fee ({fee})",
    annual_savings_note: "You save ~{amount} USD a year sending once a month",
    p2p_only_label: "For personal transfers",
  },
  es: {
    competitor_spread_label: "Spread oculto (3.2%) + tarifa de envío ({fee})",
    annual_savings_note: "Ahorras ~{amount} USD al año enviando 1 vez al mes",
    p2p_only_label: "Para envíos personales",
  },
  pt: {
    competitor_spread_label: "Spread oculto (3,2%) + taxa de envio ({fee})",
    annual_savings_note: "Você economiza ~{amount} USD por ano enviando 1 vez por mês",
    p2p_only_label: "Para envios pessoais",
  },
  fr: {
    competitor_spread_label: "Marge cachée (3,2 %) + frais d'envoi ({fee})",
    annual_savings_note: "Vous économisez ~{amount} USD par an en envoyant 1 fois par mois",
    p2p_only_label: "Pour les envois personnels",
  },
  de: {
    competitor_spread_label: "Versteckte Marge (3,2 %) + Versandgebühr ({fee})",
    annual_savings_note: "Sie sparen ~{amount} USD pro Jahr bei monatlicher Sendung",
    p2p_only_label: "Für persönliche Überweisungen",
  },
  it: {
    competitor_spread_label: "Spread nascosto (3,2%) + commissione di invio ({fee})",
    annual_savings_note: "Risparmi ~{amount} USD all'anno inviando 1 volta al mese",
    p2p_only_label: "Per invii personali",
  },
  nl: {
    competitor_spread_label: "Verborgen marge (3,2%) + verzendkosten ({fee})",
    annual_savings_note: "Je bespaart ~{amount} USD per jaar bij 1x per maand versturen",
    p2p_only_label: "Voor persoonlijke overboekingen",
  },
  ja: {
    competitor_spread_label: "隠れたスプレッド（3.2%）+ 送金手数料（{fee}）",
    annual_savings_note: "月1回送金で年間約{amount} USDの節約",
    p2p_only_label: "個人送金向け",
  },
  ko: {
    competitor_spread_label: "숨겨진 스프레드(3.2%) + 배송 수수료({fee})",
    annual_savings_note: "월 1회 송금 시 연간 약 {amount} USD 절약",
    p2p_only_label: "개인 송금용",
  },
  zh: {
    competitor_spread_label: "隐藏点差（3.2%）+ 汇款手续费（{fee}）",
    annual_savings_note: "每月汇款一次，每年可节省约{amount}美元",
    p2p_only_label: "适用于个人汇款",
  },
  hi: {
    competitor_spread_label: "छिपा हुआ स्प्रेड (3.2%) + शिपिंग शुल्क ({fee})",
    annual_savings_note: "महीने में एक बार भेजने पर आप सालाना ~{amount} USD बचाते हैं",
    p2p_only_label: "व्यक्तिगत ट्रांसफर के लिए",
  },
  ar: {
    competitor_spread_label: "هامش خفي (3.2%) + رسوم الإرسال ({fee})",
    annual_savings_note: "توفر ~{amount} دولار سنوياً بإرسال مرة واحدة شهرياً",
    p2p_only_label: "للتحويلات الشخصية",
  },
  tr: {
    competitor_spread_label: "Gizli marj (%3,2) + gönderim ücreti ({fee})",
    annual_savings_note: "Ayda bir gönderiyle yılda ~{amount} USD tasarruf edersiniz",
    p2p_only_label: "Kişisel transferler için",
  },
  ru: {
    competitor_spread_label: "Скрытая наценка (3,2%) + плата за отправку ({fee})",
    annual_savings_note: "Вы экономите ~{amount} USD в год при ежемесячной отправке",
    p2p_only_label: "Для личных переводов",
  },
  vi: {
    competitor_spread_label: "Chênh lệch ẩn (3,2%) + phí gửi ({fee})",
    annual_savings_note: "Bạn tiết kiệm ~{amount} USD mỗi năm khi gửi 1 lần/tháng",
    p2p_only_label: "Dành cho chuyển tiền cá nhân",
  },
  id: {
    competitor_spread_label: "Selisih tersembunyi (3,2%) + biaya pengiriman ({fee})",
    annual_savings_note: "Anda hemat ~{amount} USD per tahun dengan kirim 1x sebulan",
    p2p_only_label: "Untuk transfer pribadi",
  },
  am: {
    competitor_spread_label: "የተደበቀ ልዩነት (3.2%) + የመላኪያ ክፍያ ({fee})",
    annual_savings_note: "በወር አንድ ጊዜ በመላክ በዓመት ~{amount} USD ይቆጥባሉ",
    p2p_only_label: "ለግል ዝውውሮች",
  },
  ha: {
    competitor_spread_label: "Ɓoyayyen bambanci (3.2%) + kuɗin turawa ({fee})",
    annual_savings_note: "Kana ajiyar ~{amount} USD a shekara ta hanyar aikawa sau ɗaya a wata",
    p2p_only_label: "Don canja wurin kai tsaye",
  },
  sw: {
    competitor_spread_label: "Tofauti iliyofichika (3.2%) + ada ya kutuma ({fee})",
    annual_savings_note: "Unaokoa ~{amount} USD kwa mwaka ukituma mara moja kwa mwezi",
    p2p_only_label: "Kwa uhamisho wa kibinafsi",
  },
};

for (const [lang, keys] of Object.entries(UPDATES)) {
  const path = join(MSG, `${lang}.json`);
  const json = JSON.parse(readFileSync(path, "utf8"));
  Object.assign(json.calculator, keys);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`✓ ${lang}.json`);
}
