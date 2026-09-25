import { describe, expect, it } from "vitest";
import { scoreTone } from "@/features/checkins/score-meter";

describe("scoreTone (colore delle barre nei check-in)", () => {
  it("energia, sonno e alimentazione: più alto è meglio", () => {
    expect(scoreTone("energy", 5)).toBe("good");
    expect(scoreTone("sleepQuality", 4)).toBe("good");
    expect(scoreTone("nutritionAdherence", 3)).toBe("fair");
    expect(scoreTone("energy", 2)).toBe("concerning");
    expect(scoreTone("sleepQuality", 1)).toBe("concerning");
  });

  it("stress: più alto è peggio (5/5 non è un buon segno)", () => {
    expect(scoreTone("stress", 5)).toBe("concerning");
    expect(scoreTone("stress", 4)).toBe("concerning");
    expect(scoreTone("stress", 3)).toBe("fair");
    expect(scoreTone("stress", 2)).toBe("good");
    expect(scoreTone("stress", 1)).toBe("good");
  });
});
