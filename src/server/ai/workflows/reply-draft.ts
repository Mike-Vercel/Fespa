import "server-only";
import { calendarDateIn } from "@/domain/dates";
import { buildReplyDraftPrompt } from "@/server/ai/context/reply-draft";
import { runAIInteraction } from "@/server/ai/interaction";
import { buildSystemPrompt } from "@/server/ai/prompts";
import { getAIProvider } from "@/server/ai/providers";
import { parseAIOutput } from "@/server/ai/schemas/parse-output";
import { replyDraftSchema } from "@/server/ai/schemas/reply-draft";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { NotFoundError, ValidationError } from "@/server/errors";
import { findLatestAnalysisForCheckin } from "@/server/repositories/ai-analyses";
import { listCheckinsBefore } from "@/server/repositories/checkins";
import { findClientOverview } from "@/server/repositories/clients";
import { getAccessibleCheckin } from "@/server/services/checkins";
import type { ReplyDraft } from "@/types/ai";

const MAX_OUTPUT_TOKENS = 16_000;
/** Si cerca l'ultima risposta della coach tra i check-in precedenti, per mantenerne il tono. */
const CHECKINS_TO_SEARCH_FOR_PREVIOUS_REPLY = 3;

/**
 * "Prepara risposta": genera una BOZZA. Non viene salvata né inviata:
 * la coach la modifica e, se la approva, la salva lei come risposta al check-in.
 */
export async function draftReply(
  auth: AuthenticatedContext,
  input: { checkinId: string; instructions: string | null },
): Promise<ReplyDraft> {
  const provider = getAIProvider();
  const checkin = await getAccessibleCheckin(auth, input.checkinId);
  if (!checkin.answers) {
    throw new ValidationError({}, "Questo check-in ha un formato non riconosciuto: scrivi la risposta manualmente.");
  }
  const { APP_TIMEZONE: timezone } = getServerEnv();

  return runAIInteraction({ db: auth.db, userId: auth.coach.id }, { requestType: "reply_draft", clientId: checkin.clientId, provider: provider.info }, async () => {
    const [client, latestAnalysis, previousCheckins] = await Promise.all([
      findClientOverview(auth.db, checkin.clientId),
      findLatestAnalysisForCheckin(auth.db, checkin.id),
      listCheckinsBefore(auth.db, checkin.clientId, checkin.submittedAt, CHECKINS_TO_SEARCH_FOR_PREVIOUS_REPLY),
    ]);
    if (!client) {
      throw new NotFoundError();
    }

    const prompt = buildReplyDraftPrompt({
      today: calendarDateIn(timezone),
      timezone,
      clientFullName: client.fullName,
      checkin,
      latestAnalysis,
      previousReply: previousCheckins.find((previous) => previous.coachReply)?.coachReply ?? null,
      coachInstructions: input.instructions,
    });

    const result = await provider.generateStructured({
      purpose: "reply_draft",
      context: prompt.context,
      system: buildSystemPrompt("reply_draft"),
      userContent: prompt.userContent,
      outputSchema: replyDraftSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    const output = parseAIOutput(replyDraftSchema, result.output, "reply_draft");

    return {
      value: {
        draft: output.draft,
        notesForCoach: output.notesForCoach,
        meta: {
          provider: provider.info.provider,
          model: provider.info.model,
          isMock: provider.info.isMock,
          generatedAt: new Date().toISOString(),
        },
      },
      usage: result.usage,
    };
  });
}
