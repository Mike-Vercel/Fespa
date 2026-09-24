import "server-only";
import { firstNameOf } from "@/domain/greeting";
import { SourceRegistry } from "@/server/ai/sources";
import { sanitizeUntrustedText, untrustedBlock } from "@/server/ai/untrusted";
import type { AIAnalysisItem, CheckinItem } from "@/types/domain";
import { REPLY_INSTRUCTIONS_MAX_LENGTH } from "@/validation/ai";
import { renderCheckinForPrompt, summarizeCheckin, type CheckinSummary } from "./summaries";

const PREVIOUS_REPLY_MAX_LENGTH = 800;

export type ReplyDraftContext = {
  today: string;
  clientFirstName: string;
  checkin: CheckinSummary;
  analysisSummary: string | null;
  previousReply: string | null;
  coachInstructions: string | null;
};

type ReplyDraftInput = {
  today: string;
  timezone: string;
  clientFullName: string;
  checkin: CheckinItem;
  latestAnalysis: AIAnalysisItem | null;
  previousReply: string | null;
  coachInstructions: string | null;
};

/**
 * Per una bozza servono: il nome proprio (per il saluto), il check-in a cui rispondere,
 * l'eventuale analisi già fatta e l'ultima risposta della coach (per mantenere il tono).
 */
export function buildReplyDraftPrompt(input: ReplyDraftInput): { context: ReplyDraftContext; userContent: string } {
  const context: ReplyDraftContext = {
    today: input.today,
    clientFirstName: firstNameOf(input.clientFullName),
    checkin: summarizeCheckin(input.checkin, new SourceRegistry(), input.timezone),
    analysisSummary: input.latestAnalysis ? sanitizeUntrustedText(input.latestAnalysis.summary) : null,
    previousReply: input.previousReply ? sanitizeUntrustedText(input.previousReply, PREVIOUS_REPLY_MAX_LENGTH) : null,
    coachInstructions: input.coachInstructions
      ? sanitizeUntrustedText(input.coachInstructions, REPLY_INSTRUCTIONS_MAX_LENGTH)
      : null,
  };

  const userContent = [
    "<contesto_applicativo>",
    "Richiesta: bozza di risposta a un check-in, che la coach verificherà e modificherà prima dell'invio.",
    `Data di oggi: ${context.today}`,
    `Nome della cliente da usare nel saluto: ${context.clientFirstName}`,
    "</contesto_applicativo>",
    "",
    renderCheckinForPrompt(context.checkin, "check_in_a_cui_rispondere"),
    "",
    context.analysisSummary
      ? untrustedBlock("sintesi dell'analisi AI già revisionabile dalla coach", context.analysisSummary)
      : "Nessuna analisi precedente disponibile.",
    context.previousReply
      ? untrustedBlock("ultima risposta inviata dalla coach (riferimento per il tono)", context.previousReply)
      : "Nessuna risposta precedente disponibile.",
    "",
    context.coachInstructions
      ? `Indicazioni della coach per questa bozza:\n${untrustedBlock("indicazioni della coach", context.coachInstructions)}`
      : "Nessuna indicazione aggiuntiva dalla coach.",
    "",
    "Scrivi la bozza seguendo le regole di sistema e rispondi solo con il JSON richiesto.",
  ].join("\n");

  return { context, userContent };
}
