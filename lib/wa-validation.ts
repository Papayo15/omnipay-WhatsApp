// Motor de validación de cuentas bancarias por riel — Módulo 2/3 WhatsApp.
// Corre ANTES de pedir confirmación y ANTES de generar cualquier ficha de depósito real,
// para atrapar typos matemáticamente detectables sin depender de que el usuario los note
// a simple vista en una pantalla de chat (a diferencia del formulario web, que valida en
// vivo con inputs dedicados por campo).
//
// Cobertura actual = corredores ya en vivo por Bridge (ver providers/bridge/liquidation.ts
// → NATIVE_RAILS): MX (SPEI/CLABE), US (ACH/routing+account), GB (Faster Payments/sort code),
// zona SEPA (IBAN), BR (PIX — sin checksum público, solo formato), CO (cuenta — solo formato).
// Todo lo demás (resto de los 41 corredores) usa el validador genérico SWIFT/BIC + formato de
// cuenta, listo para cuando Conduit habilite esos rieles (mediados de octubre).

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

// ── Genérico — resto de corredores (preparado para Conduit): formato SWIFT/BIC
// (8 u 11 caracteres) + número de cuenta no vacío. Sin checksum matemático disponible. ──
export function validateGenericSwift(bic: string, accountNumber: string): ValidationResult {
  const clean = (bic ?? "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean)) return { isValid: false, errorKey: "bic_format" };
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
  if (SEPA.has(cc)) return validateIban(details.iban ?? "");
  if (cc === "BR") {
    // PIX key: CPF/CNPJ/email/teléfono/clave aleatoria — sin checksum único posible, solo no-vacío.
    if (!details.pix_key || details.pix_key.trim().length < 5) return { isValid: false, errorKey: "pix_format" };
    return { isValid: true };
  }
  if (cc === "CO") {
    if (!details.account_number || onlyDigits(details.account_number).length < 6) return { isValid: false, errorKey: "account_format" };
    return { isValid: true };
  }
  // Resto del mundo (Conduit, próximamente) — validador genérico SWIFT/BIC.
  return validateGenericSwift(details.bic ?? "", details.account_number ?? "");
}

// Parsea lo que el usuario escribió en un solo mensaje de WhatsApp (separado por espacios)
// según el formato esperado por el país destino. No valida — solo estructura los campos
// para que validateAccountDetails() los revise después.
export function parseAccountInput(country: string, text: string): AccountDetails {
  const cc = country.toUpperCase();
  const tokens = text.trim().split(/\s+/);
  const SEPA = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR","SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI"]);

  if (cc === "MX") return { clabe: tokens[0] ?? "" };
  if (cc === "US") return { routing_number: tokens[0] ?? "", account_number: tokens[1] ?? "" };
  if (cc === "GB") return { sort_code: tokens[0] ?? "", account_number: tokens[1] ?? "" };
  if (SEPA.has(cc)) return { iban: tokens[0] ?? "", bic: tokens[1] };
  if (cc === "BR") return { pix_key: text.trim() };
  if (cc === "CO") return { account_number: tokens[0] ?? "" };
  return { bic: tokens[0] ?? "", account_number: tokens[1] ?? "" };
}

// Qué le pedimos al usuario según el país — usado para elegir la clave de traducción correcta.
export function accountPromptKey(country: string): string {
  const cc = country.toUpperCase();
  const SEPA = new Set(["DE","FR","ES","IT","NL","PT","BE","AT","IE","FI","GR","CY","EE","LV","LT","LU","MT","SK","SI","HR","SE","DK","NO","PL","CZ","HU","RO","BG","CH","IS","LI"]);
  if (cc === "MX") return "ask_account_mx";
  if (cc === "US") return "ask_account_us";
  if (cc === "GB") return "ask_account_gb";
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
  if (SEPA.has(cc)) return `IBAN ${maskAccount(details.iban ?? "")}`;
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
