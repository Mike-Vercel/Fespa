import "server-only";
import { calendarDateIn } from "@/domain/dates";
import {
  ANALYSIS_PREVIOUS_CHECKINS,
  ANALYSIS_RECENT_NOTES,
  buildCheckinAnalysisPrompt,
} from "@/server/ai/context/checkin-analysis";
import { runAIInteraction } from "@/server/ai/interaction";
import { buildSystemPrompt, PROMPT_VERSIONS } from "@/server/ai/prompts";
import { getAIProvider } from "@/server/ai/providers";
import { checkinAnalysisSchema } from "@/server/ai/schemas/checkin-analysis";
import { parseAIOutput } from "@/server/ai/schemas/parse-output";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { NotFoundError, ValidationError } from "@/server/errors";
import { insertAnalysis } from "@/server/repositories/ai-analyses";
import { listCheckinsBefore } from "@/server/repositories/checkins";
import { findClientOverview } from "@/server/repositories/clients";
import { listNotesForClient } from "@/server/repositories/notes";
import { getAccessibleCheckin } from "@/server/services/checkins";
import type { AIAnalysisItem } from "@/types/domain";

/** Include il budget del ragionamento del modello: un tetto basso troncherebbe l'output. */
const MAX_OUTPUT_TOKENS = 16_000;

/**
 * "Analizza con AI":
 *  1. coach autenticata (contesto) → 2. accesso alla cliente del check-in → 3. check-in validato
 *  4. storico minimo (check-in precedenti, note recenti) → 5. contesto esplicito
 *  6. chiamata al provider → 7. validazione dell'output → 8. salvataggio + audit.
 */
export async function analyzeCheckin(auth: AuthenticatedContext, checkinId: string): Promise<AIAnalysisItem> {
  const provider = getAIProvider();
  const checkin = await getAccessibleCheckin(auth, checkinId);
  if (!checkin.answers) {
    throw new ValidationError({}, "Questo check-in ha un formato non riconosciuto e non può essere analizzato.");
  }
  const { APP_TIMEZONE: timezone } = getServerEnv();

  return runAIInteraction({ db: auth.db, userId: auth.coach.id }, { requestType: "checkin_analysis", clientId: checkin.clientId, provider: provider.info }, async () => {
    const [client, previousCheckins, notes] = await Promise.all([
      findClientOverview(auth.db, checkin.clientId),
      listCheckinsBefore(auth.db, checkin.clientId, checkin.submittedAt, ANALYSIS_PREVIOUS_CHECKINS),
      listNotesForClient(auth.db, checkin.clientId, auth.coach.id, ANALYSIS_RECENT_NOTES),
    ]);
    if (!client) {
      throw new NotFoundError();
    }

    const prompt = buildCheckinAnalysisPrompt({
      today: calendarDateIn(timezone),
      timezone,
      client: { status: client.status, startedOn: client.startedOn, goal: client.goal },
      checkin,
      previousCheckins,
      notes,
    });

    const result = await provider.generateStructured({
      purpose: "checkin_analysis",
      context: prompt.context,
      system: buildSystemPrompt("checkin_analysis"),
      userContent: prompt.userContent,
      outputSchema: checkinAnalysisSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    const output = parseAIOutput(checkinAnalysisSchema, result.output, "checkin_analysis");

    const analysis = await insertAnalysis(auth.db, {
      clientId: checkin.clientId,
      checkinId: checkin.id,
      coachId: auth.coach.id,
      output,
      provider: provider.info.provider,
      model: provider.info.model,
      promptVersion: PROMPT_VERSIONS.checkin_analysis,
      isMock: provider.info.isMock,
    });
    return { value: analysis, usage: result.usage };
  });
}
