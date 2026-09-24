import { z } from "zod";
import { emailField, existingPasswordField, newPasswordField } from "./auth";

export const PROFILE_NAME_MAX_LENGTH = 120;

export const updateProfileSchema = z.object({
  fullName: z
    .string({ error: "Inserisci il tuo nome." })
    .trim()
    .min(2, { error: "Il nome deve avere almeno 2 caratteri." })
    .max(PROFILE_NAME_MAX_LENGTH, { error: `Massimo ${PROFILE_NAME_MAX_LENGTH} caratteri.` }),
});

export const changeEmailSchema = z.object({ email: emailField });

/** Cambio password dal profilo: serve quella attuale, e la nuova va scritta due volte. */
export const changePasswordSchema = z
  .object({
    currentPassword: existingPasswordField,
    password: newPasswordField,
    confirmPassword: z.string({ error: "Ripeti la nuova password." }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "Le due password non coincidono.",
  })
  .refine((value) => value.password !== value.currentPassword, {
    path: ["password"],
    error: "La nuova password deve essere diversa da quella attuale.",
  });
