import { z } from "zod";

/*
 * Validazione della Prova FESPA (chat pubblica della home).
 * Il client la usa per un riscontro immediato, ma fa fede solo quella del server.
 */

export const TRIAL_MAX_MESSAGES = 3;
export const TRIAL_MESSAGE_MAX_LENGTH = 800;
export const TRIAL_NAME_MAX_LENGTH = 80;

export const trialMessageSchema = z.object({
  // Generato dal browser per ogni invio: lo stesso invio ripetuto non conta due volte.
  clientMessageId: z.uuid({ error: "Invio non valido. Riprova." }),
  text: z
    .string({ error: "Scrivi un messaggio." })
    .trim()
    .min(1, { error: "Scrivi un messaggio." })
    .max(TRIAL_MESSAGE_MAX_LENGTH, { error: `Massimo ${TRIAL_MESSAGE_MAX_LENGTH} caratteri.` }),
});

export const trialLeadSchema = z.object({
  name: z
    .string({ error: "Scrivi il tuo nome." })
    .trim()
    .min(1, { error: "Scrivi il tuo nome." })
    .max(TRIAL_NAME_MAX_LENGTH, { error: `Massimo ${TRIAL_NAME_MAX_LENGTH} caratteri.` }),
  email: z
    .string({ error: "Scrivi la tua email." })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Controlla l'indirizzo email." }).max(254, { error: "Indirizzo email troppo lungo." })),
  // Serve per trattare nome ed email e inviare il riepilogo. Non è un consenso marketing.
  privacyConsent: z.literal(true, { error: "Per inviarti il riepilogo serve il consenso al trattamento dei dati." }),
});

export type TrialMessageInput = z.infer<typeof trialMessageSchema>;
export type TrialLeadInput = z.infer<typeof trialLeadSchema>;
