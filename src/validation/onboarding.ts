import { z } from "zod";
import { CONTACT_CHANNELS, EXPERIENCE_LEVELS } from "@/types/domain";

/*
 * Questionario di ingresso della cliente. Stesso schema lato client (UX) e lato server (sicurezza).
 */

export const MIN_CLIENT_AGE_YEARS = 14;
export const NOTES_FOR_COACH_MAX_LENGTH = 1500;
export const INJURY_DESCRIPTION_MAX_LENGTH = 1500;
export const FOLLOWUP_ANSWER_MAX_LENGTH = 800;

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, { error: message })
    .optional()
    .transform((value) => (value ? value : null));

/** La data di nascita deve essere reale e compatibile con l'età minima. */
function isPlausibleBirthDate(value: string): boolean {
  const birth = new Date(`${value}T00:00:00Z`);
  const latestAllowed = new Date();
  latestAllowed.setUTCFullYear(latestAllowed.getUTCFullYear() - MIN_CLIENT_AGE_YEARS);
  return birth.getUTCFullYear() >= 1900 && birth <= latestAllowed;
}

export const onboardingProfileSchema = z.object({
  fullName: z.string({ error: "Inserisci nome e cognome." }).trim().min(2, { error: "Inserisci nome e cognome." }).max(120),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(
      z
        .string()
        .regex(/^\+?[0-9 ()-]{6,30}$/, { error: "Inserisci un numero di telefono valido." })
        .nullable(),
    ),
  birthDate: z.iso
    .date({ error: "Inserisci una data valida." })
    .refine(isPlausibleBirthDate, {
      error: `Serve un'età di almeno ${MIN_CLIENT_AGE_YEARS} anni.`,
      // Solo su date valide: una data inesistente ha già il suo messaggio di formato.
      when: (payload) => payload.issues.length === 0,
    }),
  goal: z
    .string({ error: "Raccontaci il tuo obiettivo." })
    .trim()
    .min(3, { error: "Raccontaci il tuo obiettivo." })
    .max(500, { error: "Massimo 500 caratteri." }),
  experienceLevel: z.enum(EXPERIENCE_LEVELS, { error: "Scegli un livello." }),
  weeklyAvailability: z.coerce
    .number({ error: "Indica quanti giorni." })
    .int()
    .min(1, { error: "Almeno 1 giorno." })
    .max(7, { error: "Al massimo 7 giorni." }),
  preferredContact: z.enum(CONTACT_CHANNELS, { error: "Scegli come preferisci essere contattata o contattato." }),
  notesForCoach: optionalText(NOTES_FOR_COACH_MAX_LENGTH, `Massimo ${NOTES_FOR_COACH_MAX_LENGTH} caratteri.`),
  privacyConsent: z
    .boolean()
    .refine((consent) => consent, { error: "Per proseguire serve il consenso al trattamento dei dati." })
    .transform((): true => true),
});

export type OnboardingProfileInput = z.input<typeof onboardingProfileSchema>;
export type OnboardingProfile = z.output<typeof onboardingProfileSchema>;

/**
 * Domande di approfondimento predefinite, usate quando l'AI non è configurata o non risponde.
 * Non sono presentate come generate dall'AI (questionsSource = "standard").
 */
export const STANDARD_INJURY_QUESTIONS = [
  "Questo infortunio o trauma ti limita oggi in qualche movimento o attività quotidiana? In quali?",
  "Sei seguita o seguito da un medico o da un fisioterapista? Ti hanno dato indicazioni da rispettare negli allenamenti?",
  "C'è altro su questo tema che vorresti far sapere alla tua coach?",
] as const;

export const injuryDescriptionSchema = z
  .string({ error: "Descrivi brevemente l'infortunio o il trauma." })
  .trim()
  .min(3, { error: "Descrivi brevemente l'infortunio o il trauma." })
  .max(INJURY_DESCRIPTION_MAX_LENGTH, { error: `Massimo ${INJURY_DESCRIPTION_MAX_LENGTH} caratteri.` });

/**
 * Sezione facoltativa su infortuni e traumi fisici: richiede un consenso esplicito separato
 * (dati relativi alla salute). Senza consenso non si salva nulla.
 */
export const onboardingHealthSchema = z
  .object({
    hasInjuries: z.boolean(),
    description: optionalText(INJURY_DESCRIPTION_MAX_LENGTH, `Massimo ${INJURY_DESCRIPTION_MAX_LENGTH} caratteri.`),
    followup: z
      .array(
        z.object({
          question: z.string().trim().min(1).max(300),
          answer: z.string().trim().max(FOLLOWUP_ANSWER_MAX_LENGTH, { error: `Massimo ${FOLLOWUP_ANSWER_MAX_LENGTH} caratteri.` }),
        }),
      )
      .max(3),
    questionsSource: z.enum(["ai", "mock", "standard"]).nullable(),
  })
  .refine((health) => !health.hasInjuries || (health.description?.length ?? 0) >= 3, {
    path: ["description"],
    error: "Descrivi brevemente l'infortunio o il trauma.",
  });

export const onboardingSubmissionSchema = z.object({
  profile: onboardingProfileSchema,
  /** null = nessun consenso ai dati sanitari. */
  health: onboardingHealthSchema.nullable(),
});

export type OnboardingSubmission = z.input<typeof onboardingSubmissionSchema>;
