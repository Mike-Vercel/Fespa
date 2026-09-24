import "server-only";
import { z } from "zod";

/**
 * Output strutturato dell'analisi di un check-in.
 * È il contratto con il modello: qualunque provider deve restituire esattamente questo,
 * e l'output viene validato qui prima di essere salvato o mostrato.
 */

export const MAX_FOLLOWUP_SUGGESTION_DAYS = 30;

export const followupSuggestionSchema = z
  .object({
    title: z.string().trim().min(3).max(120).describe("Titolo breve e operativo del follow-up, es. 'Chiamata sul sonno'"),
    reason: z.string().trim().min(3).max(400).describe("Perché potrebbe essere utile, citando i dati del check-in"),
    dueInDays: z
      .number()
      .int()
      .min(0)
      .max(MAX_FOLLOWUP_SUGGESTION_DAYS)
      .describe("Tra quanti giorni proporlo (0 = oggi)"),
  })
  .strict();

export const checkinAnalysisSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(20)
      .max(1200)
      .describe("Sintesi fattuale del check-in in 2-4 frasi, confrontata con lo storico fornito"),
    topics: z
      .array(z.string().trim().min(2).max(60))
      .min(1)
      .max(6)
      .describe("Temi presenti nei dati, come etichette brevi (es. 'Sonno', 'Costanza negli allenamenti')"),
    followUpNeeded: z.boolean().describe("true se c'è qualcosa che la coach potrebbe voler approfondire a breve"),
    followUpSuggestion: followupSuggestionSchema
      .nullable()
      .describe("Proposta di follow-up (da confermare dalla coach), obbligatoria se followUpNeeded è true, altrimenti null"),
    suggestedQuestions: z
      .array(z.string().trim().min(5).max(300))
      .max(5)
      .describe("Domande aperte che la coach potrebbe porre alla cliente"),
    confidence: z
      .enum(["low", "medium", "high"])
      .describe("Quanto i dati disponibili sono sufficienti per questa sintesi"),
    sensitiveContentNote: z
      .string()
      .trim()
      .min(5)
      .max(500)
      .nullable()
      .describe(
        "Se emergono temi potenzialmente sensibili (salute, alimentazione disordinata, benessere psicologico): nota neutra che invita la coach a una verifica professionale appropriata. Altrimenti null.",
      ),
  })
  .strict()
  .superRefine((analysis, context) => {
    if (analysis.followUpNeeded && !analysis.followUpSuggestion) {
      context.addIssue({
        code: "custom",
        path: ["followUpSuggestion"],
        message: "followUpSuggestion è obbligatorio quando followUpNeeded è true",
      });
    }
    if (!analysis.followUpNeeded && analysis.followUpSuggestion) {
      context.addIssue({
        code: "custom",
        path: ["followUpSuggestion"],
        message: "followUpSuggestion deve essere null quando followUpNeeded è false",
      });
    }
  });

export type CheckinAnalysisOutput = z.infer<typeof checkinAnalysisSchema>;
