import { z } from "zod";

/**
 * Struttura delle risposte di un check-in (versione 1).
 * Il database salva `answers` come jsonb: questo schema viene applicato anche
 * in LETTURA, perché un dato salvato non è automaticamente un dato valido.
 */

export const CHECKIN_SCALE_MIN = 1;
export const CHECKIN_SCALE_MAX = 5;
export const MAX_WEEKLY_SESSIONS = 14;
export const MAX_CHECKIN_TEXT_LENGTH = 1500;

const scaleScore = z.number().int().min(CHECKIN_SCALE_MIN).max(CHECKIN_SCALE_MAX);
const sessionCount = z.number().int().min(0).max(MAX_WEEKLY_SESSIONS);
const clientText = z.string().trim().max(MAX_CHECKIN_TEXT_LENGTH);

export const checkinAnswersSchema = z
  .object({
    version: z.literal(1),
    energy: scaleScore,
    sleepQuality: scaleScore,
    stress: scaleScore,
    nutritionAdherence: scaleScore,
    trainingSessionsDone: sessionCount,
    trainingSessionsPlanned: sessionCount,
    wins: clientText,
    challenges: clientText,
    questionsForCoach: clientText.nullable(),
  })
  .strict();

export type CheckinAnswers = z.infer<typeof checkinAnswersSchema>;

/** Check-in compilato dalla cliente: la versione dello schema la aggiunge il server. */
export const clientCheckinInputSchema = checkinAnswersSchema
  .omit({ version: true })
  .extend({
    wins: z.string().trim().min(1, { error: "Racconta almeno una cosa andata bene." }).max(MAX_CHECKIN_TEXT_LENGTH),
    challenges: z.string().trim().max(MAX_CHECKIN_TEXT_LENGTH),
    questionsForCoach: z
      .string()
      .trim()
      .max(MAX_CHECKIN_TEXT_LENGTH)
      .nullable()
      .transform((value) => (value ? value : null)),
  });

export type ClientCheckinInput = z.input<typeof clientCheckinInputSchema>;

/**
 * Scale 1–5 del check-in, con etichette per UI e contesto AI.
 * `higherIsBetter` serve perché per lo stress un valore alto è un segnale negativo.
 */
export const CHECKIN_SCALES = [
  { key: "energy", label: "Energia", description: "Energia percepita", higherIsBetter: true },
  { key: "sleepQuality", label: "Sonno", description: "Qualità del sonno", higherIsBetter: true },
  { key: "stress", label: "Stress", description: "Livello di stress", higherIsBetter: false },
  {
    key: "nutritionAdherence",
    label: "Alimentazione",
    description: "Aderenza al piano alimentare concordato",
    higherIsBetter: true,
  },
] as const satisfies ReadonlyArray<{
  key: keyof CheckinAnswers;
  label: string;
  description: string;
  higherIsBetter: boolean;
}>;

export type CheckinScaleKey = (typeof CHECKIN_SCALES)[number]["key"];
