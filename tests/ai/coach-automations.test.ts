import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, RateLimitError } from "@/server/errors";
import { fakeAuth, fakeCheckin } from "../support/fakes";

/*
 * Motore delle automazioni: NEW_CHECKIN → GENERATE_REPLY_DRAFT.
 * La garanzia principale: la bozza viene salvata come "draft" e NON viene mai inviata.
 */

const fakes = vi.hoisted(() => ({
  listPending: vi.fn(),
  claim: vi.fn(),
  finish: vi.fn(),
  findAutomation: vi.fn(),
  recordRun: vi.fn(),
  draftReply: vi.fn(),
  getAccessibleCheckin: vi.fn(),
  reviewCheckin: vi.fn(),
  createActionRequest: vi.fn(),
  prepare: vi.fn(),
  commit: vi.fn(),
  aiKind: { value: "anthropic" as "anthropic" | "mock" | "none" },
}));

vi.mock("@/server/repositories/ai-automations", () => ({
  listPendingAutomationEvents: fakes.listPending,
  claimAutomationEvent: fakes.claim,
  finishAutomationEvent: fakes.finish,
  findAutomation: fakes.findAutomation,
  recordAutomationRun: fakes.recordRun,
}));
vi.mock("@/server/ai/workflows/reply-draft", () => ({ draftReply: fakes.draftReply }));
vi.mock("@/server/services/checkins", () => ({ getAccessibleCheckin: fakes.getAccessibleCheckin, reviewCheckin: fakes.reviewCheckin }));
vi.mock("@/server/ai/agent/actions", () => ({ createActionRequest: fakes.createActionRequest }));
vi.mock("@/server/ai/agent/tools/checkins", async () => {
  const { z } = await import("zod");
  const { defineActionTool } = await import("@/server/ai/agent/tools/define");
  return {
    sendCheckinReplyTool: defineActionTool({
      name: "send_checkin_reply",
      description: "Invio finto della risposta a un check-in (test).",
      inputSchema: z.object({ checkinId: z.string(), text: z.string().min(20) }).strict(),
      risk: "write",
      allowedRoles: ["coach", "admin", "super_admin"],
      auditTarget: "checkin",
      runningLabel: () => "…",
      prepare: fakes.prepare,
      commit: fakes.commit,
      auditSummary: ({ checkinId }) => ({ checkinId }),
    }),
  };
});
vi.mock("@/server/ai/config", () => ({ resolveAIConfig: () => ({ kind: fakes.aiKind.value }) }));
vi.mock("@/server/env", () => ({ getServerEnv: () => ({ APP_TIMEZONE: "Europe/Rome" }) }));

const { runPendingAutomations } = await import("@/server/ai/automations/engine");

const DRAFT_TEXT = "Ciao Sara, grazie per il check-in: che bella settimana di allenamenti!";

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    automationId: "auto-1",
    trigger: "new_checkin",
    clientId: randomUUID(),
    checkinId: randomUUID(),
    status: "pending",
    attempts: 0,
    createdAt: "2026-09-25T08:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  fakes.aiKind.value = "anthropic";
  fakes.claim.mockResolvedValue(true);
  fakes.findAutomation.mockResolvedValue({ id: "auto-1", enabled: true });
  fakes.getAccessibleCheckin.mockResolvedValue(fakeCheckin());
  fakes.draftReply.mockResolvedValue({ draft: DRAFT_TEXT, notesForCoach: [], meta: { isMock: false } });
  fakes.prepare.mockResolvedValue({ title: "Risposta pronta per Sara", fields: [], warnings: [], confirmLabel: "Conferma e invia", target: null, summaryForModel: "" });
  fakes.createActionRequest.mockResolvedValue({ id: "draft-1" });
  fakes.recordRun.mockResolvedValue(undefined);
});

describe("automazione: bozza di risposta ai nuovi check-in", () => {
  it("prepara la bozza come 'draft' e non la invia mai", async () => {
    fakes.listPending.mockResolvedValue([event()]);
    const summary = await runPendingAutomations(fakeAuth());

    expect(summary).toEqual({ processed: 1, drafts: 1, skipped: 0, failed: 0 });
    expect(fakes.createActionRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "draft", automationId: "auto-1", conversationId: null, rawInput: expect.objectContaining({ text: DRAFT_TEXT }) }),
    );
    // Nessun invio: né il commit del tool né il service che salva la risposta.
    expect(fakes.commit).not.toHaveBeenCalled();
    expect(fakes.reviewCheckin).not.toHaveBeenCalled();
    expect(fakes.finish).toHaveBeenCalledWith(expect.anything(), expect.any(String), { status: "done", actionRequestId: "draft-1" });
    expect(fakes.recordRun).toHaveBeenCalledWith(expect.anything(), "auto-1", { status: "success", errorCode: null });
  });

  it("le bozze dimostrative sono dichiarate come tali", async () => {
    fakes.listPending.mockResolvedValue([event()]);
    fakes.draftReply.mockResolvedValue({ draft: DRAFT_TEXT, notesForCoach: [], meta: { isMock: true } });
    await runPendingAutomations(fakeAuth());
    const prepared = fakes.createActionRequest.mock.calls[0][1].prepared as { warnings: string[] };
    expect(prepared.warnings.join(" ")).toContain("dimostrativa");
    expect(prepared.warnings[0]).toContain("non è stata inviata");
  });

  it("un evento già preso in carico da un'altra scheda non genera una seconda bozza", async () => {
    fakes.listPending.mockResolvedValue([event()]);
    fakes.claim.mockResolvedValue(false);
    const summary = await runPendingAutomations(fakeAuth());
    expect(summary.processed).toBe(0);
    expect(fakes.draftReply).not.toHaveBeenCalled();
  });

  it("salta i check-in a cui la coach ha già risposto e le regole disattivate", async () => {
    fakes.listPending.mockResolvedValue([event(), event({ automationId: "auto-off" })]);
    fakes.getAccessibleCheckin.mockResolvedValue(fakeCheckin({ coachReply: "Già risposto", reviewedAt: "2026-09-25T09:00:00Z" }));
    fakes.findAutomation.mockImplementation(async (_db: unknown, id: string) => ({ id, enabled: id !== "auto-off" }));
    const summary = await runPendingAutomations(fakeAuth());
    expect(summary).toEqual({ processed: 2, drafts: 0, skipped: 2, failed: 0 });
    expect(fakes.draftReply).not.toHaveBeenCalled();
  });

  it("un check-in non più accessibile (cliente riassegnata o archiviata) viene saltato", async () => {
    fakes.listPending.mockResolvedValue([event()]);
    fakes.getAccessibleCheckin.mockRejectedValue(new NotFoundError());
    const summary = await runPendingAutomations(fakeAuth());
    expect(summary.skipped).toBe(1);
    expect(fakes.finish).toHaveBeenCalledWith(expect.anything(), expect.any(String), { status: "skipped", errorCode: "NOT_ACCESSIBLE" });
  });

  it("con il limite AI raggiunto l'evento torna in coda e l'elaborazione si ferma", async () => {
    fakes.listPending.mockResolvedValue([event(), event()]);
    fakes.draftReply.mockRejectedValue(new RateLimitError(600));
    const summary = await runPendingAutomations(fakeAuth());
    expect(summary.processed).toBe(1);
    expect(fakes.finish).toHaveBeenCalledWith(expect.anything(), expect.any(String), { status: "pending", errorCode: "RATE_LIMITED" });
    expect(fakes.draftReply).toHaveBeenCalledTimes(1);
  });

  it("senza provider AI configurato non fa nulla (gli eventi restano in coda)", async () => {
    fakes.aiKind.value = "none";
    const summary = await runPendingAutomations(fakeAuth());
    expect(summary.processed).toBe(0);
    expect(fakes.listPending).not.toHaveBeenCalled();
  });
});
