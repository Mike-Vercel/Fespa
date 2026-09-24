import { z } from "zod";
import { uuidSchema } from "./common";

/** Decisione dell'admin su un'auto-iscrizione. La coach è facoltativa in approvazione. */
export const registrationReviewSchema = z.discriminatedUnion("decision", [
  z.object({
    clientId: uuidSchema,
    decision: z.literal("approved"),
    coachId: z.union([uuidSchema, z.literal("")]).optional(),
  }),
  z.object({ clientId: uuidSchema, decision: z.literal("pending") }),
  z.object({ clientId: uuidSchema, decision: z.literal("rejected") }),
]);

export type RegistrationReview = z.infer<typeof registrationReviewSchema>;
