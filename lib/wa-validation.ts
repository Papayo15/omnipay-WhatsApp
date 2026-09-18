// Motor de validación de cuentas bancarias por riel — Módulo 2/3 WhatsApp.
// Corre ANTES de pedir confirmación y ANTES de generar cualquier ficha de depósito real,
// para atrapar typos matemáticamente detectables sin depender de que el usuario los note
// a simple vista en una pantalla de chat (a diferencia del formulario web, que valida en
// vivo con inputs dedicados por campo).
//
// Cobertura actual = corredores ya en vivo por Bridge (ver providers/bridge/liquidation.ts
// → NATIVE_RAILS): MX (SPEI/CLABE), US (ACH/routing+account), GB (Faster Payments/sort code),
// zona SEPA (IBAN+BIC — Bridge lo exige), BR (PIX — sin checksum público), CO (Bre-B —
// sin formato único documentado por Bridge, teléfono/cédula/email/cuenta).
//
// Conduit (verificado contra su documentación real en docs.conduit.financial, no solo el
// código local en lib/conduit/, que va a medias): sus rieles reales de payout son
// crypto/fedwire/rtp/fednow/ach/swift/sepa/faster_payments/chaps — para ach/sepa/fps los
// campos son los mismos que Bridge (routingNumber+accountNumber, iban+bic, sortCode+
// accountNumber), así que los validadores de abajo sirven tal cual, sin código aparte.
// El riel "swift" SÍ es real (transferencia internacional genérica) — cubre el resto de
// los ~80 países que Conduit ya soporta en KYB (LatAm, África, Europa, según
// docs.conduit.financial/kyb/map) y que se habilitan a partir del 15 de octubre. La rama
// genérica de abajo (SWIFT/BIC + cuenta) corresponde exactamente a ese riel "swift" —
// no es un placeholder inventado. Aun así, Conduit expone un endpoint dinámico
// (GET /payouts/requirements?purpose=X&rail=Y&recipientType=individual, con validadores
// "aba" e "iban" ya confirmados ahí) para el listado EXACTO de campos por país — cuando
// se integre Conduit de verdad, ese endpoint debe ser la fuente de verdad final, no esta
// validación local. Conduit no lista Bre-B/Colombia como riel propio; ese corredor seguiría
// dependiendo de Bridge.

export interface AccountDetails {
  recipient_name?: string;
  clabe?:          string;
  iban?:           string;
  bic?:            string;
  routing_number?: string;
  account_number?: string;
  sort_code?:      string;
  pix_key?:        string;
  bank_code?:      string;
}

export interface ValidationResult {
  isValid:   boolean;
  errorKey?: string; // clave en whatsapp.validation.* (messages/*.json)
}

function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

// ── México: CLABE — 18 dígitos, dígito verificador módulo 10 con pesos 3-7-1 ──────
export function validateClabe(clabe: string): ValidationResult {
  const c = onlyDigits(clabe);
  if (c.length !== 18) return { isValid: false, errorKey: "clabe_length" };
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (parseInt(c[i], 10) * weights[i % 3]) % 10;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(c[17], 10)) return { isValid: false, errorKey: "clabe_checksum" };
  return { isValid: true };
}

// ── SEPA / Europa: IBAN — ISO 13616, módulo 97 ────────────────────────────────────
export function validateIban(iban: string): ValidationResult {
  const clean = (iban ?? "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(clean)) return { isValid: false, errorKey: "iban_format" };
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  // Módulo 97 sobre un número potencialmente enorme — usa BigInt (no literales, por target de TS).
  const big = BigInt(numeric);
  const remainder = big % BigInt(97);
  if (remainder !== BigInt(1)) return { isValid: false, errorKey: "iban_checksum" };
  return { isValid: true };
}

// ── EE.UU.: ABA routing number — 9 dígitos, checksum módulo 10 (pesos 3-7-1) ──────
export function validateAbaRouting(routing: string): ValidationResult {
  const r = onlyDigits(routing);
  if (r.length !== 9) return { isValid: false, errorKey: "routing_length" };
  const d = r.split("").map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  if (sum % 10 !== 0) return { isValid: false, errorKey: "routing_checksum" };
  return { isValid: true };
}

// ── Reino Unido: Sort code (6 dígitos) + Account number (8 dígitos) — solo formato,
// no existe un checksum público estandarizado como CLABE/IBAN/ABA. ───────────────
export function validateUkAccount(sortCode: string, accountNumber: string): ValidationResult {
  if (onlyDigits(sortCode).length !== 6) return { isValid: false, errorKey: "sort_code_format" };
  if (onlyDigits(accountNumber).length !== 8) return { isValid: false, errorKey: "uk_account_format" };
  return { isValid: true };
}

// ── BIC/SWIFT — formato (8 u 11 caracteres). Sin checksum matemático disponible. ──
export function validateBic(bic: string): ValidationResult {
  const clean = (bic ?? "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean)) return { isValid: false, errorKey: "bic_format" };
  return { isValid: true };
}

// ── Genérico — resto de corredores (preparado para Conduit): SWIFT/BIC + número de
// cuenta no vacío. ─────────────────────────────────────────────────────────────
export function validateGenericSwift(bic: string, accountNumber: string): ValidationResult {
  const r = validateBic(bic);
  if (!r.isValid) return r;
  if (!accountNumber || accountNumber.trim().length < 4) return { isValid: false, errorKey: "account_format" };
  return { isValid: true };
}

// ── Dispatcher por país — el único punto de entrada que usa el bot ────────────────
export function validateAccountDetails(country: string, details: AccountDetails): ValidationResult {
  const cc = country.toUpperCase();
  const SEPA = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR","SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI"]);

  if (cc === "MX") return validateClabe(details.clabe ?? "");
  if (cc === "US") {
    if (!details.routing_number || !details.account_number) return { isValid: false, errorKey: "missing_fields" };
    const r = validateAbaRouting(details.routing_number);
    if (!r.isValid) return r;
    if (onlyDigits(details.account_number).length < 4) return { isValid: false, errorKey: "account_format" };
    return { isValid: true };
  }
  if (cc === "GB") return validateUkAccount(details.sort_code ?? "", details.account_number ?? "");
  if (SEPA.has(cc)) {
    // Bridge exige BIC para SEPA (providers/bridge/liquidation.ts: "iban.bic: required by
    // Bridge API") — a diferencia de la regla general europea (IBAN solo desde 2016), aquí
    // sí es obligatorio o el depósito real fallaría en Bridge más adelante.
    if (!details.iban || !details.bic) return { isValid: false, errorKey: "missing_fields" };
    const ibanResult = validateIban(details.iban);
    if (!ibanResult.isValid) return ibanResult;
    return validateBic(details.bic);
  }
  if (cc === "BR") {
    // PIX key: CPF/CNPJ/email/teléfono/clave aleatoria — sin checksum único posible, solo no-vacío.
    if (!details.pix_key || details.pix_key.trim().length < 5) return { isValid: false, errorKey: "pix_format" };
    return { isValid: true };
  }
  if (cc === "CO") {
    // Bridge usa el sistema Bre-B de Colombia (account_type: "bre_b", campo bre_b_key) —
    // Bridge no documenta un formato único: puede ser teléfono, cédula, email o clave
    // aleatoria (mismo patrón que PIX en Brasil). Solo validamos que no esté vacío.
    if (!details.account_number || details.account_number.trim().length < 5) return { isValid: false, errorKey: "account_format" };
    return { isValid: true };
  }
  // Resto del mundo (Conduit, próximamente) — validador genérico SWIFT/BIC.
  return validateGenericSwift(details.bic ?? "", details.account_number ?? "");
}

// Un solo dato por mensaje (no "los dos separados por un espacio") — más natural en un
// chat. Países de un solo dato (MX/CO/BR/SEPA/genérico): un mensaje. Países de dos datos
// (US: routing→account · GB: sort code→account): dos mensajes, uno a la vez — ver
// TWO_FIELD_COUNTRIES en el webhook y parseAccountField()/mergeAccountField() aquí.
const SEPA_SET = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR","SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI"]);

// Primer (y a veces único) dato que se pide para un país.
export function parseAccountField(country: string, text: string): AccountDetails {
  const cc = country.toUpperCase();
  const value = text.trim();

  if (cc === "MX") return { clabe: value };
  if (cc === "US") return { routing_number: value };
  if (cc === "GB") return { sort_code: value };
  if (SEPA_SET.has(cc)) return { iban: value };
  if (cc === "BR") return { pix_key: value };
  if (cc === "CO") return { account_number: value };
  return { bic: value };
}

// Segundo dato — se combina con lo que ya se guardó en la sesión. Para SEPA el segundo
// dato es el BIC (obligatorio para Bridge); para todo lo demás (US/GB/genérico) es el
// número de cuenta.
export function mergeSecondAccountField(country: string, existing: AccountDetails, text: string): AccountDetails {
  const cc = country.toUpperCase();
  if (SEPA_SET.has(cc)) return { ...existing, bic: text.trim() };
  return { ...existing, account_number: text.trim() };
}

// Clave de traducción para pedir el SEGUNDO dato — depende del país (BIC para SEPA,
// "Account Number" para el resto).
export function secondAccountPromptKey(country: string): string {
  const cc = country.toUpperCase();
  if (SEPA_SET.has(cc)) return "ask_bic";
  return "ask_account_number";
}

// Compatibilidad hacia atrás — ya no se usa para pedir, pero validateAccountDetails()
// sigue esperando el objeto AccountDetails completo con todos los campos ya juntados.
export function parseAccountInput(country: string, text: string): AccountDetails {
  return parseAccountField(country, text);
}

// Qué le pedimos al usuario según el país — usado para elegir la clave de traducción correcta.
// Para países de dos datos, esto es SOLO el primer campo (el segundo usa "ask_account_number").
export function accountPromptKey(country: string): string {
  const cc = country.toUpperCase();
  const SEPA = SEPA_SET;
  if (cc === "MX") return "ask_account_mx";
  if (cc === "US") return "ask_routing_number";
  if (cc === "GB") return "ask_sort_code";
  if (SEPA.has(cc)) return "ask_account_sepa";
  if (cc === "BR") return "ask_account_br";
  if (cc === "CO") return "ask_account_co";
  return "ask_account_generic";
}

// Vista enmascarada para el resumen de confirmación — muestra el campo relevante según el país.
export function maskedAccountSummary(country: string, details: AccountDetails): string {
  const cc = country.toUpperCase();
  const SEPA = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR","SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI"]);
  if (cc === "MX") return `CLABE ${maskAccount(details.clabe ?? "")}`;
  if (cc === "US") return `Routing ${details.routing_number ?? ""} · Cuenta ${maskAccount(details.account_number ?? "")}`;
  if (cc === "GB") return `Sort code ${details.sort_code ?? ""} · Cuenta ${maskAccount(details.account_number ?? "")}`;
  if (SEPA.has(cc)) return `IBAN ${maskAccount(details.iban ?? "")} · BIC ${details.bic ?? ""}`;
  if (cc === "BR") return `PIX ${maskAccount(details.pix_key ?? "")}`;
  if (cc === "CO") return `Cuenta ${maskAccount(details.account_number ?? "")}`;
  return `${details.bic ?? ""} · Cuenta ${maskAccount(details.account_number ?? "")}`;
}

// Enmascara una cuenta para mostrarla en el resumen de confirmación — nunca el número completo.
export function maskAccount(value: string): string {
  const clean = (value ?? "").replace(/\s/g, "");
  if (clean.length <= 4) return "••••";
  return `${"•".repeat(Math.max(clean.length - 4, 4))}${clean.slice(-4)}`;
}
