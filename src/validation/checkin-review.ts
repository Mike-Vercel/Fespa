import { z } from "zod";
import { uuidSchema } from "./common";

export const COACH_REPLY_MAX_LENGTH = 4000;

export const reviewCheckinSchema = z.object({
  checkinId: uuidSchema,
  reply: z
    .string()
    .trim()
    .min(1, { error: "La risposta non può essere vuota." })
    .max(COACH_REPLY_MAX_LENGTH, { error: `La risposta può avere al massimo ${COACH_REPLY_MAX_LENGTH} caratteri.` })
    .optional(),
});
