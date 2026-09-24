import { z } from "zod";
import { FOLLOWUP_STATUSES } from "@/types/domain";
import { uuidSchema } from "./common";

export const FOLLOWUP_TITLE_MAX_LENGTH = 160;
export const FOLLOWUP_DESCRIPTION_MAX_LENGTH = 2000;
/** Un follow-up si pianifica al massimo un anno avanti. */
export const FOLLOWUP_MAX_DAYS_AHEAD = 365;

export const createFollowupSchema = z.object({
  clientId: uuidSchema,
  title: z
    .string({ error: "Inserisci un titolo." })
    .trim()
    .min(3, { error: "Il titolo deve avere almeno 3 caratteri." })
    .max(FOLLOWUP_TITLE_MAX_LENGTH, { error: `Massimo ${FOLLOWUP_TITLE_MAX_LENGTH} caratteri.` }),
  description: z
    .string()
    .trim()
    .max(FOLLOWUP_DESCRIPTION_MAX_LENGTH, { error: `Massimo ${FOLLOWUP_DESCRIPTION_MAX_LENGTH} caratteri.` })
    .optional()
    .transform((value) => (value ? value : null)),
  dueOn: z.iso.date({ error: "Inserisci una data valida." }),
  // Presente solo quando il follow-up nasce da una proposta AI confermata dalla coach.
  aiAnalysisId: z
    .union([uuidSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
});

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;

export const followupStatusChangeSchema = z.object({
  followupId: uuidSchema,
  status: z.enum(FOLLOWUP_STATUSES),
});
