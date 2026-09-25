import "server-only";
import { z } from "zod";

/** Risposta di FESPA AI in un turno della prova: solo testo, breve. */
export const publicTrialReplySchema = z.object({
  reply: z.string().trim().min(1).max(700),
});

/** Riepilogo finale della prova: mostrato a schermo (insights) e inviato via email. */
export const publicTrialSummarySchema = z.object({
  summary: z.string().trim().min(1).max(600),
  mainChallenge: z.string().trim().min(1).max(240),
  goal: z.string().trim().min(1).max(240),
  relevantContext: z.array(z.string().trim().min(1).max(200)).max(4),
  suggestedNextStep: z.string().trim().min(1).max(300),
  emailIntro: z.string().trim().min(1).max(500),
  insights: z.array(z.string().trim().min(1).max(220)).min(1).max(3),
});

export type PublicTrialReplyOutput = z.infer<typeof publicTrialReplySchema>;
export type PublicTrialSummaryOutput = z.infer<typeof publicTrialSummarySchema>;
