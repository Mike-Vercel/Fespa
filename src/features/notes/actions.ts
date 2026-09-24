"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { createNote, removeNote, updateNote } from "@/server/services/notes";
import type { ActionResult } from "@/types/results";
import { fieldErrorsOf } from "@/validation/field-errors";
import { createNoteSchema, deleteNoteSchema, updateNoteSchema } from "@/validation/notes";

export async function createNoteAction(clientId: string, content: string): Promise<ActionResult<null>> {
  return runAction("notes.create", async () => {
    const context = await requireCoachOrThrow();
    const parsed = createNoteSchema.safeParse({ clientId, content });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await createNote(context, parsed.data);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function updateNoteAction(noteId: string, content: string): Promise<ActionResult<null>> {
  return runAction("notes.update", async () => {
    const context = await requireCoachOrThrow();
    const parsed = updateNoteSchema.safeParse({ noteId, content });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await updateNote(context, parsed.data);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult<null>> {
  return runAction("notes.delete", async () => {
    const context = await requireCoachOrThrow();
    const parsed = deleteNoteSchema.safeParse({ noteId });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await removeNote(context, parsed.data.noteId);
    revalidatePath("/", "layout");
    return null;
  });
}
