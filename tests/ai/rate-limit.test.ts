import { describe, expect, it } from "vitest";
import { AI_DAILY_LIMIT, AI_SHORT_TERM_LIMIT, evaluateRateLimit } from "@/server/rate-limit/ai-rate-limit";

const NOW = new Date("2026-09-24T10:00:00Z");

/** Contatore finto: restituisce un numero diverso per la finestra breve e per quella giornaliera. */
function counter(shortWindowCount: number, dailyCount: number) {
  const shortWindowStart = new Date(NOW.getTime() - AI_SHORT_TERM_LIMIT.durationMs).toISOString();
  return async (since: string) => (since === shortWindowStart ? shortWindowCount : dailyCount);
}

describe("evaluateRateLimit", () => {
  it("consente le richieste entro i limiti (la richiesta corrente è già conteggiata)", async () => {
    const decision = await evaluateRateLimit(counter(AI_SHORT_TERM_LIMIT.maxRequests, 50), NOW);
    expect(decision).toEqual({ allowed: true });
  });

  it("blocca le raffiche con la finestra breve", async () => {
    const decision = await evaluateRateLimit(counter(AI_SHORT_TERM_LIMIT.maxRequests + 1, 50), NOW);
    expect(decision).toEqual({ allowed: false, retryAfterSeconds: AI_SHORT_TERM_LIMIT.durationMs / 1000 });
  });

  it("applica il tetto giornaliero anche con poche richieste recenti", async () => {
    const decision = await evaluateRateLimit(counter(3, AI_DAILY_LIMIT.maxRequests + 1), NOW);
    expect(decision).toEqual({ allowed: false, retryAfterSeconds: AI_DAILY_LIMIT.durationMs / 1000 });
  });
});
