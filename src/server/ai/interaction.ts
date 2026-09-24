import "server-only";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { AppError, RateLimitError } from "@/server/errors";
import { logger } from "@/server/logger";
import { createDatabaseRateLimiter } from "@/server/rate-limit/ai-rate-limit";
import { finishInteraction, startInteraction, type AIRequestType } from "@/server/repositories/ai-interactions";
import type { AIProviderInfo, AIUsage } from "./providers/types";

/** Chi fa la richiesta: una coach (area staff) o una cliente (area personale), con il suo client soggetto a RLS. */
export type AIRequester = {
  db: AppSupabaseClient;
  userId: string;
};

type InteractionMeta = {
  requestType: AIRequestType;
  /** null quando la richiesta non riguarda una scheda cliente (es. questionario di ingresso). */
  clientId: string | null;
  provider: AIProviderInfo;
};

/**
 * Involucro comune a tutte le richieste AI:
 *  1. registra la richiesta (audit: solo metadati, nessun contenuto);
 *  2. applica il rate limit per utente;
 *  3. esegue l'operazione misurando latenza e token;
 *  4. registra l'esito (anche in caso di errore) e lo logga.
 */
export async function runAIInteraction<TValue>(
  requester: AIRequester,
  meta: InteractionMeta,
  operation: () => Promise<{ value: TValue; usage: AIUsage }>,
): Promise<TValue> {
  const { db, userId } = requester;
  const startedAt = Date.now();
  const logFields = { requestType: meta.requestType, provider: meta.provider.provider, model: meta.provider.model };

  const interactionId = await startInteraction(db, {
    coachId: userId,
    clientId: meta.clientId,
    requestType: meta.requestType,
    provider: meta.provider.provider,
    model: meta.provider.model,
    isMock: meta.provider.isMock,
  });

  const decision = await createDatabaseRateLimiter(db).check(userId, new Date());
  if (!decision.allowed) {
    await finishInteraction(db, interactionId, { status: "rate_limited", errorCode: "RATE_LIMITED" });
    logger.warn("ai.rate_limited", { ...logFields, userId });
    throw new RateLimitError(decision.retryAfterSeconds);
  }

  try {
    const { value, usage } = await operation();
    const latencyMs = Date.now() - startedAt;
    await finishInteraction(db, interactionId, {
      status: "succeeded",
      latencyMs,
      inputTokens: usage.inputTokens ?? undefined,
      outputTokens: usage.outputTokens ?? undefined,
    });
    logger.info("ai.request_succeeded", { ...logFields, latencyMs, ...usage });
    return value;
  } catch (error) {
    const errorCode = error instanceof AppError ? error.code : "UNEXPECTED";
    try {
      await finishInteraction(db, interactionId, { status: "failed", latencyMs: Date.now() - startedAt, errorCode });
    } catch (auditError) {
      // L'errore originale resta quello da mostrare: il fallimento dell'audit finisce solo nei log.
      logger.error("ai.audit_failed", { ...logFields, error: auditError });
    }
    logger.error("ai.request_failed", { ...logFields, errorCode, error });
    throw error;
  }
}
