import { z } from "zod";

export const PROFILE_NAME_MAX_LENGTH = 120;

export const updateProfileSchema = z.object({
  fullName: z
    .string({ error: "Inserisci il tuo nome." })
    .trim()
    .min(2, { error: "Il nome deve avere almeno 2 caratteri." })
    .max(PROFILE_NAME_MAX_LENGTH, { error: `Massimo ${PROFILE_NAME_MAX_LENGTH} caratteri.` }),
});
