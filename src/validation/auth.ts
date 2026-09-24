import { z } from "zod";

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 72;
export const MIN_NEW_PASSWORD_LENGTH = 10;

export const emailField = z
  .string({ error: "Inserisci la tua email." })
  .trim()
  .toLowerCase()
  .min(1, { error: "Inserisci la tua email." })
  .max(MAX_EMAIL_LENGTH, { error: "Email troppo lunga." })
  .pipe(z.email({ error: "Inserisci un indirizzo email valido." }));

const newPasswordField = z
  .string({ error: "Scegli una password." })
  .min(MIN_NEW_PASSWORD_LENGTH, { error: `La password deve avere almeno ${MIN_NEW_PASSWORD_LENGTH} caratteri.` })
  .max(MAX_PASSWORD_LENGTH, { error: "Password troppo lunga." });

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "Inserisci la password." })
    .min(1, { error: "Inserisci la password." })
    .max(MAX_PASSWORD_LENGTH, { error: "Password troppo lunga." }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const emailOnlySchema = z.object({ email: emailField });

export const signUpSchema = z.object({
  fullName: z
    .string({ error: "Inserisci nome e cognome." })
    .trim()
    .min(2, { error: "Inserisci nome e cognome." })
    .max(120, { error: "Massimo 120 caratteri." }),
  email: emailField,
  password: newPasswordField,
});

export const newPasswordSchema = z
  .object({ password: newPasswordField, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "Le due password non coincidono.",
  });
