import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceRegistry } from "@/server/ai/sources";
import { COPILOT_TOOLS, executeTool } from "@/server/ai/tools/registry";
import type { ToolContext } from "@/server/ai/tools/types";
import { fakeAuth, fakeCheckin } from "../support/fakes";

vi.mock("@/server/repositories/checkins", () => ({ listCheckinsForClient: vi.fn() }));
vi.mock("@/server/repositories/clients", () => ({ findClientOverview: vi.fn() }));
vi.mock("@/server/repositories/notes", () => ({ listNotesForClient: vi.fn() }));
vi.mock("@/server/repositories/followups", () => ({ listFollowupsForClient: vi.fn() }));

const { listCheckinsForClient } = await import("@/server/repositories/checkins");
const listCheckinsMock = vi.mocked(listCheckinsForClient);

function toolContext(): ToolContext {
  return {
    auth: fakeAuth(),
    clientId: randomUUID(),
    timezone: "Europe/Rome",
    sources: new SourceRegistry(),
    proposals: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tool di lettura", () => {
  it("leggono sempre la cliente fissata dal server", async () => {
    const context = toolContext();
    listCheckinsMock.mockResolvedValue([fakeCheckin({ clientId: context.clientId }), fakeCheckin({ clientId: context.clientId })]);

    const result = await executeTool("get_previous_checkins", { limit: 1 }, context);

    expect(result.isError).toBe(false);
    expect(listCheckinsMock).toHaveBeenCalledWith(context.auth.db, context.clientId, 2);
  });

  it("rifiutano un clientId passato dal modello (schema strict): il repository non viene chiamato", async () => {
    const result = await executeTool("get_previous_checkins", { limit: 2, clientId: randomUUID() }, toolContext());

    expect(result.isError).toBe(true);
    expect(listCheckinsMock).not.toHaveBeenCalled();
  });

  it("applicano i limiti sugli input (minimizzazione dei dati)", async () => {
    const result = await executeTool("get_previous_checkins", { limit: 50 }, toolContext());
    expect(result.isError).toBe(true);
    expect(listCheckinsMock).not.toHaveBeenCalled();
  });

  it("restituiscono riferimenti brevi e nessun ID interno", async () => {
    const context = toolContext();
    const checkin = fakeCheckin({ clientId: context.clientId });
    listCheckinsMock.mockResolvedValue([checkin]);

    const result = await executeTool("get_latest_checkin", {}, context);

    expect(result.isError).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('"ref":"C1"');
    expect(serialized).not.toContain(checkin.id);
    expect(serialized).not.toContain(context.clientId);
  });

  it("un errore del repository diventa un risultato is_error, senza eccezioni", async () => {
    listCheckinsMock.mockRejectedValue(new Error("connessione persa"));
    const result = await executeTool("get_latest_checkin", {}, toolContext());

    expect(result).toEqual({ isError: true, message: expect.stringContaining("Errore interno") });
  });

  it("un tool sconosciuto non viene eseguito", async () => {
    const result = await executeTool("delete_all_clients", {}, toolContext());
    expect(result.isError).toBe(true);
  });
});

describe("tool di proposta (human in the loop)", () => {
  it("registrano una proposta senza accedere al database", async () => {
    // fakeAuth usa un database che lancia a ogni accesso: se il tool scrivesse, il test fallirebbe.
    const context = toolContext();
    const result = await executeTool(
      "propose_followup",
      { title: "Chiamata sul sonno", reason: "Sonno basso da due settimane.", dueInDays: 2 },
      context,
    );

    expect(result.isError).toBe(false);
    expect(context.proposals).toEqual([{ title: "Chiamata sul sonno", reason: "Sonno basso da due settimane.", dueInDays: 2 }]);
  });

  it("accettano al massimo una proposta per richiesta", async () => {
    const context = toolContext();
    const proposal = { title: "Chiamata", reason: "Motivo valido.", dueInDays: 1 };
    await executeTool("propose_followup", proposal, context);
    const second = await executeTool("propose_followup", proposal, context);

    expect(context.proposals).toHaveLength(1);
    expect(second).toMatchObject({ isError: false, payload: { recorded: false } });
  });

  it("nel registry nessun tool ha il permesso di scrivere: solo letture e proposte", () => {
    expect(COPILOT_TOOLS.every((tool) => tool.kind === "read" || tool.kind === "proposal")).toBe(true);
    expect(COPILOT_TOOLS.filter((tool) => tool.kind === "proposal").map((tool) => tool.name)).toEqual(["propose_followup"]);
  });
});

describe("SourceRegistry", () => {
  it("assegna riferimenti stabili e scarta quelli inventati dal modello", () => {
    const sources = new SourceRegistry();
    const first = sources.register("checkin", "id-1", "Check-in del 2026-09-20");
    const again = sources.register("checkin", "id-1", "Check-in del 2026-09-20");
    const note = sources.register("note", "id-2", "Nota del 2026-09-01");

    expect(first).toBe("C1");
    expect(again).toBe("C1");
    expect(note).toBe("N1");
    expect(sources.resolve(["C1", "c1", "N1", "C9", "X1"]).map((link) => link.ref)).toEqual(["C1", "N1"]);
  });
});
