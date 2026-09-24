import "server-only";
import { z } from "zod";

export const onboardingQuestionsSchema = z
  .object({
    questions: z
      .array(z.string().trim().min(10).max(200))
      .min(2)
      .max(3)
      .describe("2 o 3 domande di approfondimento, brevi e non cliniche, rivolte direttamente alla persona"),
  })
  .strict();

export type OnboardingQuestionsOutput = z.infer<typeof onboardingQuestionsSchema>;
