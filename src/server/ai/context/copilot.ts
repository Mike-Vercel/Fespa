import "server-only";
import { firstNameOf } from "@/domain/greeting";
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
import { untrustedBlock } from "@/server/ai/untrusted";
import type { ClientListItem, ClientStatus } from "@/types/domain";
import { COPILOT_QUESTION_MAX_LENGTH } from "@/validation/ai";

export type CopilotContext = {
  today: string;
  question: string;
  client: { firstName: string; status: ClientStatus; startedOn: string };
};

/**
 * Il Copilot parte con il contesto MINIMO (chi è la cliente, a che punto è il percorso)
 * e recupera il resto con i tool, solo se la domanda lo richiede.
 */
export function buildCopilotPrompt(input: { today: string; question: string; client: ClientListItem }): {
  context: CopilotContext;
  userContent: string;
} {
  const context: CopilotContext = {
    today: input.today,
    question: input.question,
    client: {
      firstName: firstNameOf(input.client.fullName),
      status: input.client.status,
      startedOn: input.client.startedOn,
    },
  };

  const userContent = [
    "<contesto_applicativo>",
    `Data di oggi: ${context.today}`,
    `Cliente selezionata: ${context.client.firstName}`,
    `Stato del percorso: ${CLIENT_STATUS_LABELS[context.client.status]}, iniziato il ${context.client.startedOn}`,
    `Check-in ricevuti: ${input.client.lastCheckinAt ? "sì" : "nessuno"} · follow-up aperti: ${input.client.pendingFollowupCount}`,
    "Per i dettagli usa i tool disponibili: accedono solo ai dati di questa cliente.",
    "</contesto_applicativo>",
    "",
    "Domanda della coach:",
    untrustedBlock("domanda", context.question, COPILOT_QUESTION_MAX_LENGTH),
  ].join("\n");

  return { context, userContent };
}
