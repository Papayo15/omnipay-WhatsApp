// Server-side i18n for the WhatsApp bot (app/api/whatsapp/webhook/route.ts).
// The webhook is a plain API route (not a React tree), so it can't use next-intl's
// useTranslations. This loads the same messages/<locale>.json files i18n/request.ts
// uses for the rest of the app, and resolves the "whatsapp" namespace.
//
// WhatsApp Cloud API does not expose the user's locale — we infer it from the calling
// code of their phone number (waId, E.164 digits without "+"), falling back to "en".

export const SUPPORTED_WA_LOCALES = ["am","ar","de","en","es","fr","ha","hi","id","it","ja","ko","nl","pt","ru","sw","tr","vi","zh"] as const;
export type WaLocale = (typeof SUPPORTED_WA_LOCALES)[number];

// Longest-prefix match — ordered longest calling code first so e.g. "52" (MX) is checked
// before a hypothetical shorter overlapping prefix.
const CALLING_CODE_TO_LOCALE: Array<[string, WaLocale]> = [
  ["962", "ar"], ["961", "ar"], ["971", "ar"], ["966", "ar"], ["968", "ar"], ["965", "ar"], ["973", "ar"],
  ["251", "am"], ["255", "sw"], ["234", "en"], ["254", "en"],
  ["598", "es"], ["595", "es"], ["593", "es"], ["591", "es"], ["506", "es"], ["507", "es"],
  ["502", "es"], ["503", "es"], ["504", "es"], ["505", "es"],
  ["351", "pt"], ["852", "zh"], ["886", "zh"],
  ["225", "fr"], ["221", "fr"],
  ["1",   "en"],  // NANP default — US/CA (dominant), MX uses its own "52"
  ["7",   "ru"],
  ["20",  "ar"], ["27", "en"], ["30", "en"], ["31", "nl"], ["32", "nl"], ["33", "fr"],
  ["34",  "es"], ["39", "it"], ["41", "de"], ["43", "de"], ["44", "en"], ["49", "de"],
  ["52",  "es"], ["54", "es"], ["55", "pt"], ["56", "es"], ["57", "es"], ["58", "es"],
  ["61",  "en"], ["62", "id"], ["64", "en"], ["81", "ja"], ["82", "ko"], ["84", "vi"],
  ["86",  "zh"], ["90", "tr"], ["91", "hi"],
];

export function localeFromPhone(waId: string): WaLocale {
  const digits = waId.replace(/\D/g, "");
  for (const [code, locale] of CALLING_CODE_TO_LOCALE) {
    if (digits.startsWith(code)) return locale;
  }
  return "en";
}

async function loadMessages(locale: WaLocale): Promise<Record<string, unknown>> {
  switch (locale) {
    case "am": return (await import("../messages/am.json")).default;
    case "ar": return (await import("../messages/ar.json")).default;
    case "de": return (await import("../messages/de.json")).default;
    case "es": return (await import("../messages/es.json")).default;
    case "fr": return (await import("../messages/fr.json")).default;
    case "ha": return (await import("../messages/ha.json")).default;
    case "hi": return (await import("../messages/hi.json")).default;
    case "id": return (await import("../messages/id.json")).default;
    case "it": return (await import("../messages/it.json")).default;
    case "ja": return (await import("../messages/ja.json")).default;
    case "ko": return (await import("../messages/ko.json")).default;
    case "nl": return (await import("../messages/nl.json")).default;
    case "pt": return (await import("../messages/pt.json")).default;
    case "ru": return (await import("../messages/ru.json")).default;
    case "sw": return (await import("../messages/sw.json")).default;
    case "tr": return (await import("../messages/tr.json")).default;
    case "vi": return (await import("../messages/vi.json")).default;
    case "zh": return (await import("../messages/zh.json")).default;
    default:   return (await import("../messages/en.json")).default;
  }
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`);
}

// Loads the "whatsapp" namespace for a locale and returns a translator bound to it.
// Falls back to English (then to the raw key) if a key is missing in the target locale —
// same graceful-degradation behavior as the rest of the app.
export async function getWaTranslator(locale: WaLocale) {
  const [messages, fallback] = await Promise.all([
    loadMessages(locale),
    locale === "en" ? Promise.resolve(null) : loadMessages("en"),
  ]);
  const ns = (messages.whatsapp ?? {}) as Record<string, string>;
  const nsFallback = (fallback?.whatsapp ?? {}) as Record<string, string>;

  return function t(key: string, params?: Record<string, string | number>): string {
    const raw = ns[key] ?? nsFallback[key] ?? key;
    return interpolate(raw, params);
  };
}
