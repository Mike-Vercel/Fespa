import "server-only";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";
import type { NoteItem } from "@/types/domain";

const MAX_NOTES_PER_CLIENT = 100;

const NOTE_COLUMNS =
  "id, client_id, coach_id, content, created_at, updated_at, author:profiles!coach_notes_coach_id_fkey(full_name)";

type NoteRow = {
  id: string;
  client_id: string;
  coach_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: { full_name: string } | null;
};

function toNoteItem(row: NoteRow, currentCoachId: string): NoteItem {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author?.full_name ?? "Una collega",
    isOwn: row.coach_id === currentCoachId,
  };
}

export async function listNotesForClient(
  db: AppSupabaseClient,
  clientId: string,
  currentCoachId: string,
  limit = MAX_NOTES_PER_CLIENT,
): Promise<NoteItem[]> {
  const { data, error } = await db
    .from("coach_notes")
    .select(NOTE_COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new DataAccessError("notes.listForClient", error);
  }
  return data.map((row) => toNoteItem(row, currentCoachId));
}

export async function findNoteOwnership(
  db: AppSupabaseClient,
  noteId: string,
): Promise<{ clientId: string; coachId: string } | null> {
  const { data, error } = await db.from("coach_notes").select("client_id, coach_id").eq("id", noteId).maybeSingle();
  if (error) {
    throw new DataAccessError("notes.findOwnership", error);
  }
  return data ? { clientId: data.client_id, coachId: data.coach_id } : null;
}

export async function insertNote(
  db: AppSupabaseClient,
  input: { clientId: string; coachId: string; content: string },
): Promise<string> {
  const { data, error } = await db
    .from("coach_notes")
    .insert({ client_id: input.clientId, coach_id: input.coachId, content: input.content })
    .select("id")
    .single();
  if (error) {
    throw new DataAccessError("notes.insert", error);
  }
  return data.id;
}

export async function updateNoteContent(db: AppSupabaseClient, noteId: string, content: string): Promise<boolean> {
  const { data, error } = await db.from("coach_notes").update({ content }).eq("id", noteId).select("id");
  if (error) {
    throw new DataAccessError("notes.update", error);
  }
  return data.length > 0;
}

export async function deleteNote(db: AppSupabaseClient, noteId: string): Promise<boolean> {
  const { data, error } = await db.from("coach_notes").delete().eq("id", noteId).select("id");
  if (error) {
    throw new DataAccessError("notes.delete", error);
  }
  return data.length > 0;
}
