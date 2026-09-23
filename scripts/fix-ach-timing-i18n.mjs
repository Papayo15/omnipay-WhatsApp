// One-shot: corrects "1-3 días hábiles" → "1-2 días hábiles" (and equivalents) in
// confirmed_deposit_ach_tip/_auto across all 19 locales.
//
// Root cause of the correction: Bridge's own real cutoff table (apidocs.bridge.xyz) shows
// standard ("Next Day") ACH settling by 8:30 AM the next business day when submitted before
// the 4:45 PM cutoff — not "1-3 days" as commonly assumed. "1-3 días" was an overly
// conservative popular-belief figure, not what Bridge's own documented settlement window
// says. Using "1-2" as a safe, still-honest range (accounts for weekend/cutoff-miss cases
// without repeating the inflated "3 days" figure).
import { readFileSync, writeFileSync } from "fs";

const REPLACEMENTS = [
  ["1-3 días hábiles", "1-2 días hábiles"],
  ["1-3 business days", "1-2 business days"],
  ["1-3 Werktagen", "1-2 Werktagen"],
  ["1-3 jours ouvrés", "1-2 jours ouvrés"],
  ["1-3 giorni lavorativi", "1-2 giorni lavorativi"],
  ["1-3 werkdagen", "1-2 werkdagen"],
  ["1-3 dias úteis", "1-2 dias úteis"], // pt fallback without accent
  ["1-3 dias úteis", "1-2 dias úteis"],
  ["1-3 gün", "1-2 gün"],
  ["1-3 iş günü", "1-2 iş günü"],
  ["1-3 рабочих дня", "1-2 рабочих дня"],
  ["1-3 ngày làm việc", "1-2 ngày làm việc"],
  ["1-3 hari kerja", "1-2 hari kerja"],
  ["1〜3営業日", "1〜2営業日"],
  ["1-3영업일", "1-2영업일"],
  ["1-3个工作日", "1-2个工作日"],
  ["1-3 कार्यदिवसों", "1-2 कार्यदिवसों"],
  ["1-3 أيام عمل", "1-2 أيام عمل"],
  ["1-3 የስራ ቀናት", "1-2 የስራ ቀናት"],
  ["kwanaki 1-3", "kwanaki 1-2"],
  ["siku 1-3", "siku 1-2"],
];

let totalChanges = 0;
for (const locale of [
  "es","en","de","fr","it","nl","pt","tr","ru","vi","id","ja","ko","zh","hi","ar","am","ha","sw",
]) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  let changed = 0;
  for (const key of ["confirmed_deposit_ach_tip", "confirmed_deposit_ach_tip_auto"]) {
    let text = json.whatsapp[key];
    for (const [from, to] of REPLACEMENTS) {
      if (text.includes(from)) { text = text.split(from).join(to); changed++; }
    }
    json.whatsapp[key] = text;
  }
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  totalChanges += changed;
  console.log(`✓ ${locale}.json (${changed} key(s) updated)`);
}
console.log(`Total: ${totalChanges} key updates`);
