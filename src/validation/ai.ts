import { z } from "zod";
import { uuidSchema } from "./common";

export const COPILOT_QUESTION_MIN_LENGTH = 3;
export const COPILOT_QUESTION_MAX_LENGTH = 500;
export const REPLY_INSTRUCTIONS_MAX_LENGTH = 300;

/** Body delle Route Handler AI: tutto ciò che arriva dal browser è validato qui. */

export const analyzeCheckinRequestSchema = z.object({ checkinId: uuidSchema }).strict();

export const copilotRequestSchema = z
  .object({
    clientId: uuidSchema,
    question: z
      .string({ error: "Scrivi una domanda." })
      .trim()
      .min(COPILOT_QUESTION_MIN_LENGTH, { error: "La domanda è troppo breve." })
      .max(COPILOT_QUESTION_MAX_LENGTH, { error: `Massimo ${COPILOT_QUESTION_MAX_LENGTH} caratteri.` }),
  })
  .strict();

export const replyDraftRequestSchema = z
  .object({
    checkinId: uuidSchema,
    instructions: z
      .string()
      .trim()
      .max(REPLY_INSTRUCTIONS_MAX_LENGTH, { error: `Massimo ${REPLY_INSTRUCTIONS_MAX_LENGTH} caratteri.` })
      .nullable()
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .strict();

export const dismissSuggestionSchema = z.object({ analysisId: uuidSchema }).strict();
