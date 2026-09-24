import "server-only";
import type { AuthenticatedContext } from "@/server/auth/session";
import { AI_DAILY_LIMIT, AI_SHORT_TERM_LIMIT, type RateLimitWindow } from "@/server/rate-limit/ai-rate-limit";
import { countInteractionsSince } from "@/server/repositories/ai-interactions";

export type AIUsageSummary = {
  requestsInDailyWindow: number;
  dailyLimit: RateLimitWindow;
  shortTermLimit: RateLimitWindow;
};

/** Utilizzo AI della coach corrente, mostrato nelle impostazioni. */
export async function getAIUsageSummary(context: AuthenticatedContext, now = new Date()): Promise<AIUsageSummary> {
  const since = new Date(now.getTime() - AI_DAILY_LIMIT.durationMs).toISOString();
  const requestsInDailyWindow = await countInteractionsSince(context.db, context.coach.id, since);
  return { requestsInDailyWindow, dailyLimit: AI_DAILY_LIMIT, shortTermLimit: AI_SHORT_TERM_LIMIT };
}
