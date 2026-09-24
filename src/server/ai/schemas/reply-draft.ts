import "server-only";
import { z } from "zod";

export const replyDraftSchema = z
  .object({
    draft: z.string().trim().min(20).max(2500).describe("Testo della bozza di risposta, rivolto alla cliente"),
    notesForCoach: z
      .array(z.string().trim().min(3).max(300))
      .max(3)
      .describe("Avvertenze per la coach prima dell'invio; lista vuota se non servono"),
  })
  .strict();

export type ReplyDraftOutput = z.infer<typeof replyDraftSchema>;
