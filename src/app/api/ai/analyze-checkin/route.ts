import { analyzeCheckin } from "@/server/ai/workflows/analyze-checkin";
import { jsonRoute } from "@/server/http/json-route";
import { analyzeCheckinRequestSchema } from "@/validation/ai";

// Una richiesta AI può richiedere decine di secondi: limite esplicito per le funzioni serverless.
export const maxDuration = 60;

export const POST = jsonRoute({
  operation: "ai.analyzeCheckin",
  schema: analyzeCheckinRequestSchema,
  handler: async ({ checkinId }, auth) => ({ analysis: await analyzeCheckin(auth, checkinId) }),
});
