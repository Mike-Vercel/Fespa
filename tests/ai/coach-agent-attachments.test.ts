import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/server/errors";
import { ATTACHMENT_MAX_BYTES } from "@/validation/coach-ai";
import { fakeAuth } from "../support/fakes";

const repo = vi.hoisted(() => ({
  insertAttachment: vi.fn(),
  listAttachmentsByIds: vi.fn(),
  listUnsentAttachmentsBefore: vi.fn(),
  deleteAttachmentRows: vi.fn(),
  uploadAttachmentObject: vi.fn(),
  removeAttachmentObjects: vi.fn(),
  downloadAttachmentObject: vi.fn(),
}));

vi.mock("@/server/repositories/ai-attachments", () => repo);

const { loadAttachmentsForModel, removeUnsentAttachment, resolveUnsentAttachments, uploadAttachment } = await import(
  "@/server/ai/agent/attachments"
);

const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n");

beforeEach(() => {
  vi.clearAllMocks();
  repo.listUnsentAttachmentsBefore.mockResolvedValue([]);
  repo.removeAttachmentObjects.mockResolvedValue(undefined);
  repo.uploadAttachmentObject.mockResolvedValue(undefined);
  repo.insertAttachment.mockImplementation(async (_db: unknown, input: { fileName: string; mimeType: string; sizeBytes: number; storagePath: string }) => ({
    id: randomUUID(),
    conversationId: null,
    messageId: null,
    createdAt: new Date().toISOString(),
    ...input,
  }));
});

describe("caricamento degli allegati", () => {
  it("salva nella cartella dell'utente con un nome casuale: il nome del file non diventa mai un percorso", async () => {
    const auth = fakeAuth();
    const view = await uploadAttachment(auth, { name: "../../altro-utente/piano.pdf", bytes: PDF });
    const storagePath = repo.uploadAttachmentObject.mock.calls[0][1] as string;
    expect(storagePath).toMatch(new RegExp(`^${auth.coach.id}/[0-9a-f-]{36}\\.pdf$`));
    expect(view.fileName).toBe("piano.pdf");
    expect(view.kind).toBe("pdf");
  });

  it("rifiuta formati non ammessi, file vuoti, troppo grandi o falsificati", async () => {
    const auth = fakeAuth();
    await expect(uploadAttachment(auth, { name: "virus.exe", bytes: PDF })).rejects.toBeInstanceOf(ValidationError);
    await expect(uploadAttachment(auth, { name: "vuoto.pdf", bytes: new Uint8Array() })).rejects.toBeInstanceOf(ValidationError);
    await expect(uploadAttachment(auth, { name: "enorme.pdf", bytes: new Uint8Array(ATTACHMENT_MAX_BYTES + 1) })).rejects.toBeInstanceOf(ValidationError);
    const html = new TextEncoder().encode("<html><script>fetch('/api')</script>");
    await expect(uploadAttachment(auth, { name: "finto.pdf", bytes: html })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.uploadAttachmentObject).not.toHaveBeenCalled();
  });

  it("se il salvataggio dei metadati fallisce, il file caricato viene rimosso", async () => {
    repo.insertAttachment.mockRejectedValueOnce(new Error("db down"));
    await expect(uploadAttachment(fakeAuth(), { name: "piano.pdf", bytes: PDF })).rejects.toThrow("db down");
    expect(repo.removeAttachmentObjects).toHaveBeenCalledTimes(1);
  });

  it("limita gli allegati caricati e non ancora inviati", async () => {
    repo.listUnsentAttachmentsBefore.mockImplementation(async (_db: unknown, before: string) =>
      // La pulizia (file vecchi di un giorno) non trova nulla; il conteggio di quelli in attesa sì.
      new Date(before).getTime() > Date.now() - 60_000 ? Array.from({ length: 12 }, () => ({ id: randomUUID() })) : [],
    );
    await expect(uploadAttachment(fakeAuth(), { name: "piano.pdf", bytes: PDF })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("uso degli allegati", () => {
  it("un allegato non trovato (di un altro utente, invisibile per la RLS) o già inviato non si può riusare", async () => {
    const mine = { id: randomUUID(), messageId: null };
    repo.listAttachmentsByIds.mockResolvedValue([mine]);
    await expect(resolveUnsentAttachments({} as never, [mine.id, randomUUID()])).rejects.toBeInstanceOf(NotFoundError);
    repo.listAttachmentsByIds.mockResolvedValue([{ ...mine, messageId: randomUUID() }]);
    await expect(resolveUnsentAttachments({} as never, [mine.id])).rejects.toBeInstanceOf(NotFoundError);
    repo.listAttachmentsByIds.mockResolvedValue([mine]);
    await expect(resolveUnsentAttachments({} as never, [mine.id])).resolves.toHaveLength(1);
  });

  it("dal composer si rimuove solo un allegato non ancora inviato", async () => {
    repo.listAttachmentsByIds.mockResolvedValue([{ id: "a1", messageId: "m1", storagePath: "u/a1.pdf" }]);
    await expect(removeUnsentAttachment(fakeAuth(), "a1")).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.removeAttachmentObjects).not.toHaveBeenCalled();
  });

  it("i file vengono passati al modello come contenuto: PDF e immagini in base64, testo decodificato", async () => {
    repo.downloadAttachmentObject.mockImplementation(async (_db: unknown, path: string) =>
      path.endsWith(".csv") ? new TextEncoder().encode("nome;peso") : PDF,
    );
    const loaded = await loadAttachmentsForModel({} as never, [
      { id: "1", conversationId: null, messageId: null, fileName: "dati.csv", mimeType: "text/csv", sizeBytes: 9, storagePath: "u/1.csv", createdAt: "" },
      { id: "2", conversationId: null, messageId: null, fileName: "piano.pdf", mimeType: "application/pdf", sizeBytes: 17, storagePath: "u/2.pdf", createdAt: "" },
    ]);
    expect(loaded[0]).toEqual({ kind: "text", fileName: "dati.csv", text: "nome;peso" });
    expect(loaded[1]).toMatchObject({ kind: "pdf", fileName: "piano.pdf" });
  });
});
