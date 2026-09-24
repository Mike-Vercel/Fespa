import "server-only";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { countInteractionsSince } from "@/server/repositories/ai-interactions";

/**
 * Rate limit delle richieste AI, compatibile con il serverless.
 *
 * Le funzioni serverless non condividono memoria, quindi un contatore in RAM non funziona.
 * Qui lo stato condiviso è il database: ogni richiesta viene prima registrata in ai_interactions
 * e poi si contano le richieste nella finestra (inclusa quella corrente). Con richieste in raffica
 * il limite scatta al massimo "troppo presto", mai troppo tardi.
 *
 * Per volumi elevati basta fornire un'altra implementazione di AIRateLimiter
 * (es. Upstash Redis): il resto del codice non cambia. Vedi README.
 */

export type RateLimitWindow = { durationMs: number; maxRequests: number; description: string };

const MINUTE_MS = 60 * 1000;

/** Protegge da raffiche (click ripetuti, script). */
export const AI_SHORT_TERM_LIMIT: RateLimitWindow = { durationMs: 10 * MINUTE_MS, maxRequests: 20, description: "10 minuti" };
/** Tetto giornaliero per coach: contiene i costi anche in caso di abuso prolungato. */
export const AI_DAILY_LIMIT: RateLimitWindow = { durationMs: 24 * 60 * MINUTE_MS, maxRequests: 200, description: "24 ore" };

export const AI_RATE_LIMIT_WINDOWS: readonly RateLimitWindow[] = [AI_SHORT_TERM_LIMIT, AI_DAILY_LIMIT];

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Conta le richieste registrate a partire da un istante (ISO). */
export type RequestCounter = (sinceIso: string) => Promise<number>;

/** Logica pura del limite: nessun I/O diretto, testabile con un contatore finto. */
export async function evaluateRateLimit(
  countSince: RequestCounter,
  now: Date,
  windows: readonly RateLimitWindow[] = AI_RATE_LIMIT_WINDOWS,
): Promise<RateLimitDecision> {
  for (const window of windows) {
    const since = new Date(now.getTime() - window.durationMs).toISOString();
    const requestsInWindow = await countSince(since);
    if (requestsInWindow > window.maxRequests) {
      // Stima prudente: al più tardi, a fine finestra la richiesta più vecchia sarà uscita dal conteggio.
      return { allowed: false, retryAfterSeconds: Math.ceil(window.durationMs / 1000) };
    }
  }
  return { allowed: true };
}

export interface AIRateLimiter {
  /** Da chiamare DOPO aver registrato la richiesta corrente. */
  check(coachId: string, now: Date): Promise<RateLimitDecision>;
}

export function createDatabaseRateLimiter(db: AppSupabaseClient): AIRateLimiter {
  return {
    check: (coachId, now) => evaluateRateLimit((since) => countInteractionsSince(db, coachId, since), now),
  };
}
