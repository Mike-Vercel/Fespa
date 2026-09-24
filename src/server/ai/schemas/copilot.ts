import "server-only";
import { z } from "zod";

const MAX_SOURCES = 12;

export const copilotAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(2000).describe("Risposta alla domanda della coach, basata solo sui dati recuperati"),
    sources: z
      .array(z.string().trim().regex(/^[CNF]\d{1,3}$/))
      .max(MAX_SOURCES)
      .describe("Riferimenti ai dati usati per rispondere, es. [\"C1\", \"N2\"]. Lista vuota se non hai usato dati."),
    dataLimitations: z
      .string()
      .trim()
      .min(3)
      .max(400)
      .nullable()
      .describe("Cosa manca nei dati per rispondere con sicurezza, oppure null"),
  })
  .strict();

export type CopilotAnswerOutput = z.infer<typeof copilotAnswerSchema>;
