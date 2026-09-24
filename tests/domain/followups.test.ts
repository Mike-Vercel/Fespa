import { describe, expect, it } from "vitest";
import { cappedCountLabel, dueBucketOf, groupPendingFollowups } from "@/domain/followups";
import type { FollowupItem } from "@/types/domain";

const TODAY = "2026-09-24";

function followup(overrides: Partial<FollowupItem>): FollowupItem {
  return {
    id: "f",
    clientId: "c",
    clientName: "Sara Bellini",
    title: "Richiamare",
    description: null,
    dueOn: TODAY,
    status: "pending",
    completedAt: null,
    source: "manual",
    aiAnalysisId: null,
    ...overrides,
  };
}

describe("dueBucketOf", () => {
  it("classifica scaduti, oggi e prossimi", () => {
    expect(dueBucketOf("2026-09-23", TODAY)).toBe("overdue");
    expect(dueBucketOf("2026-09-24", TODAY)).toBe("today");
    expect(dueBucketOf("2026-09-25", TODAY)).toBe("upcoming");
  });
});

describe("groupPendingFollowups", () => {
  it("considera solo i follow-up in attesa e li ordina per scadenza", () => {
    const groups = groupPendingFollowups(
      [
        followup({ id: "later", dueOn: "2026-10-02" }),
        followup({ id: "sooner", dueOn: "2026-09-26" }),
        followup({ id: "old", dueOn: "2026-09-10" }),
        followup({ id: "today", dueOn: TODAY }),
        followup({ id: "done", dueOn: "2026-09-01", status: "completed" }),
        followup({ id: "cancelled", dueOn: TODAY, status: "cancelled" }),
      ],
      TODAY,
    );

    expect(groups.overdue.map((item) => item.id)).toEqual(["old"]);
    expect(groups.today.map((item) => item.id)).toEqual(["today"]);
    expect(groups.upcoming.map((item) => item.id)).toEqual(["sooner", "later"]);
  });
});

describe("cappedCountLabel (conteggio dei gruppi in dashboard)", () => {
  it("mostra il numero esatto fino al massimo, poi \"3+\"", () => {
    expect(cappedCountLabel(1, 3)).toBe("1");
    expect(cappedCountLabel(3, 3)).toBe("3");
    expect(cappedCountLabel(4, 3)).toBe("3+");
    expect(cappedCountLabel(12, 3)).toBe("3+");
  });
});
