import { describe, expect, it } from "vitest";
import { attentionReasonsFor, attentionWaitingDays, buildAttentionList, describeAttentionReason } from "@/domain/attention";
import type { ClientListItem } from "@/types/domain";

const TIMEZONE = "Europe/Rome";
// Giovedì 24 settembre 2026, ore 10:00 a Roma.
const NOW = new Date("2026-09-24T08:00:00Z");
const context = { now: NOW, timezone: TIMEZONE };

function client(overrides: Partial<ClientListItem> = {}): ClientListItem {
  return {
    id: "client-1",
    fullName: "Sara Bellini",
    status: "active",
    goal: null,
    startedOn: "2026-06-01",
    lastCheckinAt: "2026-09-21T18:00:00Z",
    pendingReviewCount: 0,
    oldestPendingReviewAt: null,
    nextFollowupOn: null,
    pendingFollowupCount: 0,
    pendingAiSuggestionCount: 0,
    approvalStatus: "approved",
    email: null,
    hasAccount: false,
    onboardingCompletedAt: null,
    coachCount: 1,
    ...overrides,
  };
}

describe("attentionReasonsFor", () => {
  it("una cliente in regola non richiede attenzione", () => {
    expect(attentionReasonsFor(client(), context)).toEqual([]);
  });

  it("segnala un follow-up scaduto con i giorni di ritardo", () => {
    const reasons = attentionReasonsFor(client({ nextFollowupOn: "2026-09-21" }), context);
    expect(reasons).toContainEqual({ kind: "followup_overdue", daysOverdue: 3 });
  });

  it("distingue un follow-up di oggi da uno scaduto", () => {
    const reasons = attentionReasonsFor(client({ nextFollowupOn: "2026-09-24" }), context);
    expect(reasons).toEqual([{ kind: "followup_today" }]);
  });

  it("considera in ritardo un check-in in attesa da più di 48 ore", () => {
    const late = attentionReasonsFor(
      client({ pendingReviewCount: 1, oldestPendingReviewAt: "2026-09-21T08:00:00Z" }),
      context,
    );
    const recent = attentionReasonsFor(
      client({ pendingReviewCount: 2, oldestPendingReviewAt: "2026-09-23T20:00:00Z" }),
      context,
    );
    expect(late).toContainEqual({ kind: "checkin_review_late", hoursWaiting: 72 });
    expect(recent).toContainEqual({ kind: "checkin_to_review", count: 2 });
  });

  it("segnala le clienti attive senza check-in da oltre 14 giorni", () => {
    const reasons = attentionReasonsFor(client({ lastCheckinAt: "2026-09-05T10:00:00Z" }), context);
    expect(reasons).toContainEqual({ kind: "no_recent_checkin", daysSinceLastCheckin: 19 });
  });

  it("non chiede check-in alle clienti in pausa o con percorso concluso", () => {
    for (const status of ["paused", "completed"] as const) {
      const reasons = attentionReasonsFor(client({ status, lastCheckinAt: "2026-07-01T10:00:00Z" }), context);
      expect(reasons).toEqual([]);
    }
  });

  it("dà tempo alle nuove clienti prima di segnalare l'assenza di check-in", () => {
    const newClient = client({ status: "onboarding", startedOn: "2026-09-20", lastCheckinAt: null });
    const silentClient = client({ status: "onboarding", startedOn: "2026-08-20", lastCheckinAt: null });
    expect(attentionReasonsFor(newClient, context)).toEqual([]);
    expect(attentionReasonsFor(silentClient, context)).toContainEqual({
      kind: "no_recent_checkin",
      daysSinceLastCheckin: null,
    });
  });
});

describe("buildAttentionList", () => {
  it("ordina per urgenza e, a parità, per numero di motivi", () => {
    const list = buildAttentionList(
      [
        client({ id: "today", fullName: "Anna", nextFollowupOn: "2026-09-24" }),
        client({ id: "overdue", fullName: "Bea", nextFollowupOn: "2026-09-20" }),
        client({
          id: "overdue-and-review",
          fullName: "Carla",
          nextFollowupOn: "2026-09-22",
          pendingReviewCount: 1,
          oldestPendingReviewAt: "2026-09-23T20:00:00Z",
        }),
        client({ id: "fine", fullName: "Dora" }),
      ],
      context,
    );

    expect(list.map((item) => item.clientId)).toEqual(["overdue-and-review", "overdue", "today"]);
    expect(list[0]?.priority).toBe("high");
    expect(list[2]?.priority).toBe("low");
  });
});

describe("describeAttentionReason", () => {
  it("produce testi brevi in italiano", () => {
    expect(describeAttentionReason({ kind: "followup_overdue", daysOverdue: 1 })).toBe("Follow-up scaduto ieri");
    expect(describeAttentionReason({ kind: "checkin_review_late", hoursWaiting: 73 })).toBe(
      "Check-in in attesa da 3 giorni",
    );
    expect(describeAttentionReason({ kind: "no_recent_checkin", daysSinceLastCheckin: 16 })).toBe(
      "Nessun check-in da 16 giorni",
    );
  });
});

describe("attentionWaitingDays (badge \"N giorni\" in dashboard)", () => {
  it("prende l'attesa più lunga tra i motivi", () => {
    expect(
      attentionWaitingDays({
        reasons: [
          { kind: "followup_overdue", daysOverdue: 1 },
          { kind: "checkin_review_late", hoursWaiting: 75 },
        ],
      }),
    ).toBe(3);
  });

  it("null se nessun motivo ha una durata", () => {
    expect(attentionWaitingDays({ reasons: [{ kind: "followup_today" }, { kind: "checkin_to_review", count: 1 }] })).toBeNull();
    expect(attentionWaitingDays({ reasons: [{ kind: "no_recent_checkin", daysSinceLastCheckin: null }] })).toBeNull();
  });
});
