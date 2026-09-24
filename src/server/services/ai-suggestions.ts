import "server-only";
import type { AuthenticatedContext } from "@/server/auth/session";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { findAnalysis, recordFollowupDecision } from "@/server/repositories/ai-analyses";
import { assertClientAccess } from "./access";

/**
 * La coach ignora una proposta di follow-up dell'AI: la decisione viene registrata
 * (tracciabilità) e la proposta non viene più mostrata come in attesa.
 * L'accettazione passa invece dalla creazione del follow-up (services/followups.ts).
 */
export async function dismissFollowupSuggestion(auth: AuthenticatedContext, analysisId: string): Promise<void> {
  const analysis = await findAnalysis(auth.db, analysisId);
  if (!analysis) {
    throw new NotFoundError("Proposta non trovata o non accessibile.");
  }
  await assertClientAccess(auth, analysis.clientId);
  if (analysis.followupDecision !== "pending") {
    throw new ValidationError({}, "Questa proposta è già stata gestita.");
  }

  const updated = await recordFollowupDecision(auth.db, analysisId, "dismissed");
  if (!updated) {
    throw new ValidationError({}, "Questa proposta è già stata gestita.");
  }
  logger.info("ai.suggestion_dismissed", { analysisId, clientId: analysis.clientId });
}
