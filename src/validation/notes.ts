import { z } from "zod";
import { uuidSchema } from "./common";

export const NOTE_MAX_LENGTH = 5000;

const noteContent = z
  .string({ error: "Scrivi il testo della nota." })
  .trim()
  .min(1, { error: "Scrivi il testo della nota." })
  .max(NOTE_MAX_LENGTH, { error: `La nota può avere al massimo ${NOTE_MAX_LENGTH} caratteri.` });

export const createNoteSchema = z.object({
  clientId: uuidSchema,
  content: noteContent,
});

export const updateNoteSchema = z.object({
  noteId: uuidSchema,
  content: noteContent,
});

export const deleteNoteSchema = z.object({
  noteId: uuidSchema,
});
