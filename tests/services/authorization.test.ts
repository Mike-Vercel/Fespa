import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import type { AIAnalysisItem } from "@/types/domain";
import { fakeAuth } from "../support/fakes";

vi.mock("@/server/repositories/clients", () => ({
  isClientAssignedTo: vi.fn(),
  clientExists: vi.fn(),
  listClientOptions: vi.fn(),
}));
vi.mock("@/server/repositories/notes", () => ({
  findNoteOwnership: vi.fn(),
  updateNoteContent: vi.fn(),
  deleteNote: vi.fn(),
  insertNote: vi.fn(),
}));
vi.mock("@/server/repositories/followups", () => ({
  insertFollowup: vi.fn(),
  findFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
  listFollowupsByStatus: vi.fn(),
}));
vi.mock("@/server/repositories/ai-analyses", () => ({
  findAnalysis: vi.fn(),
  recordFollowupDecision: vi.fn(),
}));
vi.mock("@/server/env", () => ({
  getServerEnv: () => ({ APP_TIMEZONE: "Europe/Rome" }),
}));

const clients = await import("@/server/repositories/clients");
const notes = await import("@/server/repositories/notes");
const followups = await import("@/server/repositories/followups");
const analyses = await import("@/server/repositories/ai-analyses");
const { assertClientAccess } = await import("@/server/services/access");
const { updateNote, removeNote } = await import("@/server/services/notes");
const { createFollowup } = await import("@/server/services/followups");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertClientAccess", () => {
  it("un ID non valido (es. manipolato nell'URL) è trattato come inesistente", async () => {
    await expect(assertClientAccess(fakeAuth(), "../../admin")).rejects.toBeInstanceOf(NotFoundError);
    expect(clients.isClientAssignedTo).not.toHaveBeenCalled();
  });

  it("una cliente non assegnata produce lo stesso 404 di una inesistente", async () => {
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(false);
    await expect(assertClientAccess(fakeAuth(), randomUUID())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("restituisce l'ID validato quando la cliente è assegnata alla coach", async () => {
    const clientId = randomUUID();
    const auth = fakeAuth();
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(true);

    await expect(assertClientAccess(auth, clientId)).resolves.toBe(clientId);
    expect(clients.isClientAssignedTo).toHaveBeenCalledWith(auth.db, auth.coach.id, clientId);
  });

  it("per un admin verifica solo l'esistenza della cliente", async () => {
    vi.mocked(clients.clientExists).mockResolvedValue(true);
    await expect(assertClientAccess(fakeAuth({ role: "admin" }), randomUUID())).resolves.toBeTypeOf("string");
    expect(clients.isClientAssignedTo).not.toHaveBeenCalled();
  });
});

describe("note: solo l'autrice può modificarle", () => {
  it("modificare la nota di una collega restituisce 403 senza toccare il database", async () => {
    const auth = fakeAuth();
    vi.mocked(notes.findNoteOwnership).mockResolvedValue({ clientId: randomUUID(), coachId: randomUUID() });
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(true);

    await expect(updateNote(auth, { noteId: randomUUID(), content: "modifica" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(removeNote(auth, randomUUID())).rejects.toBeInstanceOf(ForbiddenError);
    expect(notes.updateNoteContent).not.toHaveBeenCalled();
    expect(notes.deleteNote).not.toHaveBeenCalled();
  });

  it("una nota di una cliente non assegnata risulta inesistente", async () => {
    const auth = fakeAuth();
    vi.mocked(notes.findNoteOwnership).mockResolvedValue({ clientId: randomUUID(), coachId: auth.coach.id });
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(false);

    await expect(updateNote(auth, { noteId: randomUUID(), content: "x" })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("follow-up", () => {
  const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString().slice(0, 10);

  function pendingSuggestion(clientId: string): AIAnalysisItem {
    return {
      id: randomUUID(),
      clientId,
      checkinId: randomUUID(),
      summary: "Sintesi",
      topics: ["Sonno"],
      followUpNeeded: true,
      followupSuggestion: { title: "Chiamata", reason: "Motivo", dueInDays: 1 },
      followupDecision: "pending",
      suggestedQuestions: [],
      confidence: "medium",
      sensitiveContentNote: null,
      provider: "mock",
      model: "mock",
      isMock: true,
      createdAt: new Date().toISOString(),
    };
  }

  it("non accetta date nel passato", async () => {
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(true);
    await expect(
      createFollowup(fakeAuth(), { clientId: randomUUID(), title: "Chiamata", description: null, dueOn: "2020-01-01", aiAnalysisId: null }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(followups.insertFollowup).not.toHaveBeenCalled();
  });

  it("non collega una proposta AI di un'altra cliente", async () => {
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(true);
    vi.mocked(analyses.findAnalysis).mockResolvedValue(pendingSuggestion(randomUUID()));

    await expect(
      createFollowup(fakeAuth(), { clientId: randomUUID(), title: "Chiamata", description: null, dueOn: tomorrow, aiAnalysisId: randomUUID() }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(followups.insertFollowup).not.toHaveBeenCalled();
  });

  it("confermando una proposta AI registra la decisione della coach", async () => {
    const clientId = randomUUID();
    const suggestion = pendingSuggestion(clientId);
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(true);
    vi.mocked(analyses.findAnalysis).mockResolvedValue(suggestion);
    vi.mocked(followups.insertFollowup).mockResolvedValue(randomUUID());

    await createFollowup(fakeAuth(), { clientId, title: "Chiamata", description: null, dueOn: tomorrow, aiAnalysisId: suggestion.id });

    expect(followups.insertFollowup).toHaveBeenCalledOnce();
    expect(analyses.recordFollowupDecision).toHaveBeenCalledWith(expect.anything(), suggestion.id, "accepted");
  });

  it("una proposta già gestita non può essere confermata di nuovo", async () => {
    const clientId = randomUUID();
    vi.mocked(clients.isClientAssignedTo).mockResolvedValue(true);
    vi.mocked(analyses.findAnalysis).mockResolvedValue({ ...pendingSuggestion(clientId), followupDecision: "dismissed" });

    await expect(
      createFollowup(fakeAuth(), { clientId, title: "Chiamata", description: null, dueOn: tomorrow, aiAnalysisId: randomUUID() }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
