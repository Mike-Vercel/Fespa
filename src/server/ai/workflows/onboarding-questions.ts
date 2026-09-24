import "server-only";
import { buildOnboardingQuestionsPrompt } from "@/server/ai/context/onboarding-questions";
import { runAIInteraction } from "@/server/ai/interaction";
import { buildSystemPrompt } from "@/server/ai/prompts";
import { getAIProvider } from "@/server/ai/providers";
import type { AIProvider } from "@/server/ai/providers/types";
import { onboardingQuestionsSchema } from "@/server/ai/schemas/onboarding-questions";
import { parseAIOutput } from "@/server/ai/schemas/parse-output";
import type { SessionContext } from "@/server/auth/session";
import { logger } from "@/server/logger";
import type { HealthQuestionsSource } from "@/types/domain";
import { STANDARD_INJURY_QUESTIONS } from "@/validation/onboarding";

const MAX_OUTPUT_TOKENS = 4_000;

export type InjuryQuestions = { questions: string[]; source: HealthQuestionsSource };

const STANDARD_QUESTIONS: InjuryQuestions = { questions: [...STANDARD_INJURY_QUESTIONS], source: "standard" };

/**
 * Domande di approfondimento su un infortunio dichiarato nel questionario di ingresso.
 * L'iscrizione non deve mai bloccarsi per l'AI: se non è configurata o non risponde
 * si usano domande standard (dichiarate come tali, non spacciate per generate dall'AI).
 */
export async function generateInjuryQuestions(session: SessionContext, description: string): Promise<InjuryQuestions> {
  let provider: AIProvider;
  try {
    provider = getAIProvider();
  } catch {
    return STANDARD_QUESTIONS;
  }

  try {
    return await runAIInteraction(
      { db: session.db, userId: session.user.id },
      { requestType: "onboarding_questions", clientId: null, provider: provider.info },
      async () => {
        const prompt = buildOnboardingQuestionsPrompt(description);
        const result = await provider.generateStructured({
          purpose: "onboarding_questions",
          context: prompt.context,
          system: buildSystemPrompt("onboarding_questions"),
          userContent: prompt.userContent,
          outputSchema: onboardingQuestionsSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        });
        const output = parseAIOutput(onboardingQuestionsSchema, result.output, "onboarding_questions");
        const source: HealthQuestionsSource = provider.info.isMock ? "mock" : "ai";
        return { value: { questions: output.questions, source }, usage: result.usage };
      },
    );
  } catch (error) {
    // L'errore è già registrato da runAIInteraction: qui si degrada in modo trasparente.
    logger.warn("ai.onboarding_questions_fallback", { reason: error instanceof Error ? error.name : "unknown" });
    return STANDARD_QUESTIONS;
  }
}
