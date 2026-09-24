import "server-only";
import { sanitizeUntrustedText, untrustedBlock } from "@/server/ai/untrusted";
import { INJURY_DESCRIPTION_MAX_LENGTH } from "@/validation/onboarding";

export type OnboardingQuestionsContext = {
  description: string;
};

/**
 * Al modello arriva SOLO la descrizione scritta dalla persona: nessun nome, email o altro dato.
 * Il testo è trattato come dato non affidabile.
 */
export function buildOnboardingQuestionsPrompt(description: string): {
  context: OnboardingQuestionsContext;
  userContent: string;
} {
  const context = { description: sanitizeUntrustedText(description, INJURY_DESCRIPTION_MAX_LENGTH) };
  const userContent = [
    "<contesto_applicativo>",
    "Richiesta: domande di approfondimento per il questionario di ingresso di una nuova cliente.",
    "</contesto_applicativo>",
    "",
    "Cosa ha scritto la persona su infortuni, traumi o condizioni fisiche:",
    untrustedBlock("infortuni e traumi", description, INJURY_DESCRIPTION_MAX_LENGTH),
    "",
    "Genera le domande seguendo le regole di sistema e rispondi solo con il JSON richiesto.",
  ].join("\n");
  return { context, userContent };
}
