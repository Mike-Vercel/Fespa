import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

/*
 * Identità anonima della Prova FESPA.
 * - Il token (32 byte casuali) vive solo nel cookie HttpOnly del visitatore.
 * - Nel database finisce solo il suo SHA-256: chi leggesse la tabella non potrebbe riusarlo.
 * - L'IP serve solo al rate limit, come segnale secondario (più persone possono condividerlo):
 *   se ne usa un HMAC con un segreto del server, mai l'indirizzo in chiaro, e non va all'AI.
 */

export const TRIAL_COOKIE_NAME = "fespa_trial";
export const TRIAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateTrialToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Token nel formato atteso, altrimenti null (cookie manomesso o di un'altra versione). */
export function parseTrialToken(value: string | undefined): string | null {
  return value && TOKEN_PATTERN.test(value) ? value : null;
}

export function hashTrialToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Chiave opaca per il rate limit per IP: non reversibile senza il segreto del server. */
export function ipBucketKey(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(`fespa-trial-ip:${ip}`).digest("hex").slice(0, 32);
}

/** Primo indirizzo di x-forwarded-for (impostato dalla piattaforma), o "unknown". */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || realIp?.trim() || "unknown";
}
