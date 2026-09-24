/**
 * DTO delle funzioni AI condivisi tra server e client.
 * Contengono solo output validati e metadati utili alla coach per verificare.
 */

import type { FollowupSuggestion } from "./domain";

export type AISourceKind = "checkin" | "note" | "followup";

/** Fonte citata dall'AI: la UI la mostra come link al dato originale. */
export type AISourceLink = {
  ref: string;
  kind: AISourceKind;
  id: string;
  label: string;
};

export type AIGenerationMeta = {
  provider: string;
  model: string;
  isMock: boolean;
  generatedAt: string;
};

/** Proposta di follow-up emersa durante una conversazione con il Copilot: da confermare. */
export type FollowupProposal = FollowupSuggestion;

export type CopilotAnswer = {
  answer: string;
  sources: AISourceLink[];
  dataLimitations: string | null;
  proposals: FollowupProposal[];
  meta: AIGenerationMeta;
};

export type ReplyDraft = {
  draft: string;
  notesForCoach: string[];
  meta: AIGenerationMeta;
};
