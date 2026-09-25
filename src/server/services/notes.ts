import "server-only";
import type { AuthenticatedContext } from "@/server/auth/session";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";
import { deleteNote, findNote, findNoteOwnership, insertNote, updateNoteContent } from "@/server/repositories/notes";
import type { NoteItem } from "@/types/domain";
import { assertClientAccess } from "./access";

const NOTE_NOT_FOUND_MESSAGE = "Nota non trovata o non accessibile.";

export async function createNote(context: AuthenticatedContext, input: { clientId: string; content: string }) {
  const clientId = await assertClientAccess(context, input.clientId);
  const noteId = await insertNote(context.db, { clientId, coachId: context.coach.id, content: input.content });
  logger.info("notes.created", { noteId, clientId });
  return noteId;
}

/**
 * Le note sono visibili a chi segue la cliente, ma modificabili solo dall'autrice.
 * Controllo esplicito qui (403 comprensibile) oltre alla policy RLS equivalente.
 */
async function assertNoteOwnedByCoach(context: AuthenticatedContext, noteId: string): Promise<void> {
  const ownership = await findNoteOwnership(context.db, noteId);
  if (!ownership) {
    throw new NotFoundError(NOTE_NOT_FOUND_MESSAGE);
  }
  await assertClientAccess(context, ownership.clientId);
  if (ownership.coachId !== context.coach.id) {
    throw new ForbiddenError("Puoi modificare o eliminare solo le note scritte da te.");
  }
}

/** Nota letta con accesso verificato alla sua cliente (visibile a chi segue la cliente). */
export async function getAccessibleNote(context: AuthenticatedContext, noteId: string): Promise<NoteItem> {
  const note = await findNote(context.db, noteId, context.coach.id);
  if (!note) {
    throw new NotFoundError(NOTE_NOT_FOUND_MESSAGE);
  }
  await assertClientAccess(context, note.clientId);
  return note;
}

export async function updateNote(context: AuthenticatedContext, input: { noteId: string; content: string }) {
  await assertNoteOwnedByCoach(context, input.noteId);
  const updated = await updateNoteContent(context.db, input.noteId, input.content);
  if (!updated) {
    throw new NotFoundError(NOTE_NOT_FOUND_MESSAGE);
  }
  logger.info("notes.updated", { noteId: input.noteId });
}

export async function removeNote(context: AuthenticatedContext, noteId: string) {
  await assertNoteOwnedByCoach(context, noteId);
  const deleted = await deleteNote(context.db, noteId);
  if (!deleted) {
    throw new NotFoundError(NOTE_NOT_FOUND_MESSAGE);
  }
  logger.info("notes.deleted", { noteId });
}
