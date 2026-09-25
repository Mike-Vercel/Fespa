import "server-only";
import { z } from "zod";
import { ForbiddenError, ValidationError } from "@/server/errors";
import { findClientOverview } from "@/server/repositories/clients";
import { listNotesForClient } from "@/server/repositories/notes";
import { assertClientAccess } from "@/server/services/access";
import { createNote, getAccessibleNote, removeNote, updateNote } from "@/server/services/notes";
import { NOTE_MAX_LENGTH } from "@/validation/notes";
import { defineActionTool, defineReadTool, type AgentContext } from "./define";
import { ALL_STAFF, clientLink, countLabel, idSchema, noteForModel, safeName } from "./shared";

const content = z.string().trim().min(1).max(NOTE_MAX_LENGTH).describe("Testo completo della nota");

/** Testo che la coach deve digitare per eliminare una nota (azione distruttiva e definitiva). */
export const DELETE_NOTE_CONFIRMATION = "ELIMINA";

async function clientFor(context: AgentContext, clientId: string) {
  const validClientId = await assertClientAccess(context.auth, clientId);
  const client = await findClientOverview(context.auth.db, validClientId);
  if (!client) throw new ValidationError({}, "Cliente non trovata o non accessibile.");
  return client;
}

/** Solo l'autrice modifica o elimina una nota (lo ricontrolla anche il service). */
async function ownNote(context: AgentContext, noteId: string) {
  const note = await getAccessibleNote(context.auth, noteId);
  if (!note.isOwn) {
    throw new ForbiddenError("Puoi modificare o eliminare solo le note scritte da te.");
  }
  const client = await findClientOverview(context.auth.db, note.clientId);
  return { note, clientName: client?.fullName ?? "Cliente" };
}

export const getClientNotesTool = defineReadTool({
  name: "get_client_notes",
  description:
    "Le note più recenti delle coach su UNA cliente (osservazioni, accordi, preferenze), con noteId e se l'utente può modificarle.",
  inputSchema: z
    .object({
      clientId: idSchema("Id della cliente (da search_clients)"),
      limit: z.number().int().min(1).max(10).describe("Quante note (1-10)"),
    })
    .strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "note",
  runningLabel: () => "Sto leggendo le note…",
  run: async (context, { clientId, limit }) => {
    const client = await clientFor(context, clientId);
    const notes = await listNotesForClient(context.auth.db, client.id, context.auth.coach.id, limit);
    return {
      data: { clientId: client.id, clientName: safeName(client.fullName), notes: notes.map((note) => noteForModel(note, context.timezone)) },
      summary: `${countLabel(notes.length, "nota letta", "note lette")}`,
      links: [clientLink(client.id, client.fullName, "notes")],
    };
  },
});

export const createCoachNoteTool = defineActionTool({
  name: "create_coach_note",
  description: "Aggiunge una nota alla scheda di una cliente (visibile alle coach che la seguono). Richiede la conferma dell'utente.",
  inputSchema: z.object({ clientId: idSchema("Id della cliente (da search_clients)"), content }).strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "note",
  editableKeys: ["content"],
  runningLabel: () => "Sto preparando la nota…",
  prepare: async (context, input) => {
    const client = await clientFor(context, input.clientId);
    return {
      title: "Nuova nota",
      fields: [
        { label: "Cliente", value: client.fullName },
        { label: "Nota", value: input.content, multiline: true },
      ],
      warnings: ["La nota sarà visibile a tutte le coach che seguono la cliente."],
      confirmLabel: "Salva nota",
      editable: [{ key: "content", label: "Testo della nota", kind: "textarea", value: input.content, maxLength: NOTE_MAX_LENGTH }],
      target: { type: "client", id: client.id, label: client.fullName },
      summaryForModel: `Nota per ${safeName(client.fullName)} preparata: non è stata salvata, serve la conferma dell'utente.`,
    };
  },
  commit: async (context, input) => {
    await createNote(context.auth, input);
    return { message: "Nota salvata.", link: clientLink(input.clientId, "Apri le note", "notes") };
  },
  auditSummary: ({ clientId, content: text }) => ({ clientId, contentLength: text.length }),
});

export const updateCoachNoteTool = defineActionTool({
  name: "update_coach_note",
  description: "Sostituisce il testo di una nota scritta dall'utente (solo note proprie). Richiede la conferma dell'utente.",
  inputSchema: z.object({ noteId: idSchema("Id della nota (da get_client_notes)"), content }).strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "note",
  editableKeys: ["content"],
  runningLabel: () => "Sto preparando la modifica della nota…",
  prepare: async (context, input) => {
    const { note, clientName } = await ownNote(context, input.noteId);
    return {
      title: "Modifica nota",
      fields: [
        { label: "Cliente", value: clientName },
        { label: "Testo attuale", value: note.content, multiline: true },
        { label: "Nuovo testo", value: input.content, multiline: true },
      ],
      warnings: [],
      confirmLabel: "Salva modifica",
      editable: [{ key: "content", label: "Nuovo testo", kind: "textarea", value: input.content, maxLength: NOTE_MAX_LENGTH }],
      target: { type: "note", id: note.id, label: clientName },
      summaryForModel: "Modifica della nota preparata: serve la conferma dell'utente.",
    };
  },
  commit: async (context, input) => {
    const note = await getAccessibleNote(context.auth, input.noteId);
    await updateNote(context.auth, input);
    return { message: "Nota aggiornata.", link: clientLink(note.clientId, "Apri le note", "notes") };
  },
  auditSummary: ({ noteId, content: text }) => ({ noteId, contentLength: text.length }),
});

export const deleteCoachNoteTool = defineActionTool({
  name: "delete_coach_note",
  description:
    "Elimina DEFINITIVAMENTE una nota scritta dall'utente (solo note proprie). È un'azione distruttiva: richiede conferma rafforzata.",
  inputSchema: z.object({ noteId: idSchema("Id della nota (da get_client_notes)") }).strict(),
  risk: "destructive",
  allowedRoles: ALL_STAFF,
  auditTarget: "note",
  runningLabel: () => "Sto preparando l'eliminazione…",
  prepare: async (context, { noteId }) => {
    const { note, clientName } = await ownNote(context, noteId);
    return {
      title: "Eliminare questa nota?",
      fields: [
        { label: "Cliente", value: clientName },
        { label: "Nota", value: note.content, multiline: true },
      ],
      warnings: ["L'eliminazione è definitiva: la nota non si potrà recuperare."],
      confirmLabel: "Conferma eliminazione",
      typedConfirmation: DELETE_NOTE_CONFIRMATION,
      target: { type: "note", id: note.id, label: clientName },
      summaryForModel: "Eliminazione della nota preparata: serve la conferma rafforzata dell'utente.",
    };
  },
  commit: async (context, { noteId }) => {
    const note = await getAccessibleNote(context.auth, noteId);
    await removeNote(context.auth, noteId);
    return { message: "Nota eliminata.", link: clientLink(note.clientId, "Apri le note", "notes") };
  },
  auditSummary: ({ noteId }) => ({ noteId }),
});
