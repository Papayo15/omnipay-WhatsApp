// Módulo 4 — Pago Directo de Servicios en México (CFE, Telmex, Izzi…)
//
// NOTA DE REVISIÓN: módulo aislado y condicional. El payout SPEI hacia las cuentas
// concentradoras de las empresas de servicios requiere validación de Compliance con
// Bridge antes de activarse en producción — ver SERVICES_MODULE_ENABLED en
// app/api/services/quote/route.ts y app/api/services/pay/route.ts.

export type ServiceProvider = "CFE" | "TELMEX" | "IZZI";

export interface ServiceQuoteRequest {
  provider:  ServiceProvider;
  reference: string;   // número de referencia / recibo del servicio
  amountMxn: number;
}

export interface ServiceQuoteResponse {
  provider:          ServiceProvider;
  reference:         string;
  amount_mxn:        number;
  amount_usd:        number;
  fx_rate:            number;   // 1 USD = X MXN al momento de la cotización
  quote_id:           string;   // referencia estable para /api/services/pay
  virtual_account: {
    currency:            string;
    bank_name?:          string;
    routing_number?:     string;
    account_number?:     string;
    beneficiary_name?:   string;
    instructions:        string;
  };
  expires_at: number; // epoch ms — la cotización FX es válida por tiempo limitado
}

export interface ServicePayRequest {
  quote_id:  string;
  provider:  ServiceProvider;
  reference: string;
  payer_email: string;
}

export type ServicePaymentStatus = "PENDING_DEPOSIT" | "PROCESSING" | "COMPLETED" | "FAILED";

// Estado 100% en localStorage (Módulo 4) — se resuelve solo cuando el webhook de Bridge
// confirma la dispersión SPEI. No hay tabla de pagos de servicios en ningún backend.
export interface ServicePaymentState {
  quote_id:  string;
  provider:  ServiceProvider;
  reference: string;
  amount_mxn: number;
  status:    ServicePaymentStatus;
  savedAt:   number;
}
