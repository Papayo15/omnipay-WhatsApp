"use client";

// Módulo 3 — Sistema de Referidos, 100% stateless.
// El código de referido vive únicamente en localStorage del navegador — no hay tabla de
// referidos en ningún backend. Por diseño, el código ES directamente el waId (o su hash)
// del referidor, para que notificarlo al completarse el envío sea un lookup directo
// (ver app/api/bridge/webhook/route.ts) en vez de requerir una base de datos de referidos.

const STORAGE_KEY = "omnipay_referral";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000; // 30 días

export interface ReferralState {
  code:    string;
  savedAt: number;
}

export function saveReferralCode(code: string): void {
  if (!code) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, savedAt: Date.now() } satisfies ReferralState));
  } catch { /* localStorage unavailable */ }
}

export function getReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as ReferralState;
    if (Date.now() - state.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return state.code;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
