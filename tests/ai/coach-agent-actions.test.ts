import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { fakeAuth } from "../support/fakes";

/*
 * Ciclo di vita delle richieste di azione (server/ai/agent/actions.ts) con tool finti:
 * si verifica l'orchestrazione (policy, idempotenza, audit), non i service reali.
 */

const fakes = vi.hoisted(() => ({
  commit: vi.fn(),
  prepare: vi.fn(),
}));

const store = await vi.hoisted(async () => {
  const { createActionStore } = await import("../support/coach-ai-store");
  return createActionStore();
});

vi.mock("@/server/repositories/ai-action-requests", () => ({
  insertActionRequest: store.insertActionRequest,
  findActionRequest: store.findActionRequest,
  listActionRequestsByIds: store.listActionRequestsByIds,
  transitionActionRequest: store.transitionActionRequest,
  updateActionRequestPayload: store.updateActionRequestPayload,
}));
vi.mock("@/server/repositories/ai-action-logs", () => ({ insertActionLog: store.insertActionLog }));

vi.mock("@/server/ai/agent/tools/registry", async () => {
  const { z } = await import("zod");
  const { defineActionTool } = await import("@/server/ai/agent/tools/define");
  const input = z.object({ targetId: z.string(), text: z.string().min(1) }).strict();
  const base = {
    description: "Tool finto usato solo nei test dell'orchestrazione.",
    inputSchema: input,
    auditTarget: "test",
    runningLabel: () => "…",
    prepare: fakes.prepare,
    commit: fakes.commit,
    editableKeys: ["text"],
    auditSummary: ({ targetId }: { targetId: string }) => ({ targetId }),
  };
  const tools = {
    fake_write: defineActionTool({ ...base, name: "fake_write", risk: "write", allowedRoles: ["coach", "admin", "super_admin"] }),
    fake_high: defineActionTool({ ...base, name: "fake_high", risk: "high_risk", allowedRoles: ["admin", "super_admin"] }),
    fake_destructive: defineActionTool({ ...base, name: "fake_destructive", risk: "destructive", allowedRoles: ["admin", "super_admin"] }),
  };
  return { findActionTool: (name: string) => tools[name as keyof typeof tools] };
});

const { cancelAction, confirmAction, createActionRequest, editAction } = await import("@/server/ai/agent/actions");
const { findActionTool } = await import("@/server/ai/agent/tools/registry");

function agentContext(role: "coach" | "admin" | "super_admin" = "admin", coachId = randomUUID()) {
  const auth = fakeAuth({ role: role === "super_admin" ? "admin" : role, coachId });
  if (role === "super_admin") (auth.coach as { role: string }).role = "super_admin";
  return { auth, timezone: "Europe/Rome", today: "2026-09-25", now: new Date("2026-09-25T10:00:00Z") };
}

const prepared = (typedConfirmation?: string) => ({
  title: "Anteprima",
  fields: [{ label: "Campo", value: "Valore" }],
  warnings: [],
  confirmLabel: "Conferma",
  typedConfirmation,
  editable: [{ key: "text", label: "Testo", kind: "textarea" as const, value: "ciao" }],
  target: { type: "test", id: randomUUID(), label: "Bersaglio" },
  summaryForModel: "Preparata.",
});

async function propose(toolName: "fake_write" | "fake_high" | "fake_destructive", context = agentContext(), typed?: string) {
  const tool = findActionTool(toolName);
  if (!tool) throw new Error(toolName);
  const rawInput = { targetId: "t1", text: "ciao" };
  return createActionRequest(context, {
    tool,
    rawInput,
    validInput: rawInput,
    prepared: prepared(typed),
    status: "pending",
    conversationId: randomUUID(),
    messageId: randomUUID(),
    automationId: null,
    idempotencyScope: randomUUID(),
  });
}

beforeEach(() => {
  store.reset();
  vi.clearAllMocks();
  fakes.commit.mockResolvedValue({ message: "Fatto.", link: null });
  fakes.prepare.mockResolvedValue(prepared());
});

describe("proposta di un'azione", () => {
  it("crea una richiesta in attesa, registra 'proposed' e NON esegue nulla", async () => {
    const view = await propose("fake_write");
    expect(view.status).toBe("pending");
    expect(view.confirmation).toBe("standard");
    expect(fakes.commit).not.toHaveBeenCalled();
    expect(store.logs.map((log) => log.event)).toEqual(["proposed"]);
  });

  it("la stessa proposta nello stesso turno non viene duplicata (chiave di idempotenza)", async () => {
    const tool = findActionTool("fake_write")!;
    const context = agentContext();
    const args = {
      tool,
      rawInput: { text: "ciao", targetId: "t1" },
      validInput: { targetId: "t1", text: "ciao" },
      prepared: prepared(),
      status: "pending" as const,
      conversationId: null,
      messageId: null,
      automationId: null,
      idempotencyScope: "turno-1",
    };
    const first = await createActionRequest(context, args);
    // Stesso input con le chiavi in un altro ordine: stessa impronta.
    const second = await createActionRequest(context, { ...args, rawInput: { targetId: "t1", text: "ciao" } });
    expect(second.id).toBe(first.id);
    expect(store.rows.size).toBe(1);
  });

  it("un tool distruttivo senza testo di conferma non può nemmeno essere proposto", async () => {
    await expect(propose("fake_destructive")).rejects.toThrow();
    expect(store.rows.size).toBe(0);
  });
});

describe("conferma", () => {
  it("esegue una sola volta: il secondo clic restituisce l'esito senza rieseguire", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    const first = await confirmAction(context, view.id, {});
    const second = await confirmAction(context, view.id, {});
    expect(first.status).toBe("succeeded");
    expect(second.status).toBe("succeeded");
    expect(fakes.commit).toHaveBeenCalledTimes(1);
    expect(store.logs.map((log) => log.event)).toEqual(["proposed", "confirmed", "succeeded"]);
  });

  it("due conferme contemporanee (doppio clic, due schede) eseguono una sola volta", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    let release: () => void = () => undefined;
    fakes.commit.mockImplementation(() => new Promise((resolve) => (release = () => resolve({ message: "Fatto.", link: null }))));
    const first = confirmAction(context, view.id, {});
    await vi.waitFor(() => expect(fakes.commit).toHaveBeenCalledTimes(1));
    await expect(confirmAction(context, view.id, {})).rejects.toBeInstanceOf(ValidationError);
    release();
    expect((await first).status).toBe("succeeded");
    expect(fakes.commit).toHaveBeenCalledTimes(1);
  });

  it("alto rischio: senza la spunta esplicita il server rifiuta e non esegue", async () => {
    const context = agentContext("admin");
    const view = await propose("fake_high", context);
    expect(view.confirmation).toBe("explicit");
    await expect(confirmAction(context, view.id, {})).rejects.toBeInstanceOf(ValidationError);
    expect(fakes.commit).not.toHaveBeenCalled();
    expect((await confirmAction(context, view.id, { acknowledged: true })).status).toBe("succeeded");
  });

  it("distruttiva: serve il testo digitato esatto", async () => {
    const context = agentContext("admin");
    const view = await propose("fake_destructive", context, "Mario Rossi");
    expect(view.confirmation).toBe("typed");
    await expect(confirmAction(context, view.id, { typedConfirmation: "Mario" })).rejects.toBeInstanceOf(ValidationError);
    await expect(confirmAction(context, view.id, { acknowledged: true })).rejects.toBeInstanceOf(ValidationError);
    expect(fakes.commit).not.toHaveBeenCalled();
    expect((await confirmAction(context, view.id, { typedConfirmation: "mario rossi" })).status).toBe("succeeded");
  });

  it("il ruolo si ricontrolla alla conferma: una coach non esegue un'azione dell'amministrazione", async () => {
    const coachId = randomUUID();
    const view = await propose("fake_high", agentContext("admin", coachId));
    // Stessa proprietaria, ma nel frattempo il suo ruolo è diventato "coach".
    await expect(confirmAction(agentContext("coach", coachId), view.id, { acknowledged: true })).rejects.toBeInstanceOf(ForbiddenError);
    expect(fakes.commit).not.toHaveBeenCalled();
    expect(store.logs.at(-1)?.event).toBe("denied");
  });

  it("una richiesta inesistente (o di un altro utente, invisibile per la RLS) è 'non trovata'", async () => {
    await expect(confirmAction(agentContext(), randomUUID(), {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("una richiesta scaduta non si conferma", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    const later = { ...context, now: new Date("2026-09-27T10:00:00Z") };
    await expect(confirmAction(later, view.id, {})).rejects.toBeInstanceOf(ValidationError);
    expect(store.rows.get(view.id)?.status).toBe("expired");
    expect(fakes.commit).not.toHaveBeenCalled();
  });

  it("un errore del service NON diventa un successo: stato 'failed', messaggio mostrato, riprova consentita", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    fakes.commit.mockRejectedValueOnce(new ValidationError({}, "Questo check-in ha già una risposta."));
    const failed = await confirmAction(context, view.id, {});
    expect(failed.status).toBe("failed");
    expect(failed.error).toEqual({ message: "Questo check-in ha già una risposta.", retryable: true });
    expect(failed.result).toBeNull();
    expect(store.logs.map((log) => log.event)).toContain("failed");

    const retried = await confirmAction(context, view.id, {});
    expect(retried.status).toBe("succeeded");
  });

  it("un errore imprevisto non è riprovabile (potrebbe aver già scritto)", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    fakes.commit.mockRejectedValueOnce(new Error("timeout del database"));
    const failed = await confirmAction(context, view.id, {});
    expect(failed.error?.retryable).toBe(false);
    await expect(confirmAction(context, view.id, {})).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("annulla e modifica", () => {
  it("annullare impedisce l'esecuzione successiva", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    expect((await cancelAction(context, view.id)).status).toBe("cancelled");
    await expect(confirmAction(context, view.id, {})).rejects.toBeInstanceOf(ValidationError);
    expect(fakes.commit).not.toHaveBeenCalled();
  });

  it("la modifica cambia solo i campi ammessi: gli identificativi restano quelli dell'anteprima", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    await editAction(context, view.id, { text: "testo corretto", targetId: "un-altro-bersaglio" });
    expect(store.rows.get(view.id)?.input).toEqual({ targetId: "t1", text: "testo corretto" });
    expect(fakes.prepare).toHaveBeenCalledWith(context, { targetId: "t1", text: "testo corretto" });
  });

  it("una modifica non valida viene rifiutata e non tocca la richiesta", async () => {
    const context = agentContext();
    const view = await propose("fake_write", context);
    await expect(editAction(context, view.id, { text: "" })).rejects.toBeInstanceOf(ValidationError);
    expect(store.rows.get(view.id)?.input).toEqual({ targetId: "t1", text: "ciao" });
  });
});
