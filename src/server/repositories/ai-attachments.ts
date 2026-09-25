import "server-only";
import type { TableRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";

/*
 * Allegati di Coach AI: metadati nella tabella, file nel bucket privato.
 * Entrambi con il client dell'utente: RLS sulla tabella e policy sullo storage
 * (cartella = id utente) impediscono di leggere o cancellare file altrui.
 */

export const ATTACHMENTS_BUCKET = "coach-ai-attachments";

export type AttachmentRecord = {
  id: string;
  conversationId: string | null;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
};

const COLUMNS = "id, conversation_id, message_id, file_name, mime_type, size_bytes, storage_path, created_at";

type Row = Pick<
  TableRow<"ai_attachments">,
  "id" | "conversation_id" | "message_id" | "file_name" | "mime_type" | "size_bytes" | "storage_path" | "created_at"
>;

function toRecord(row: Row): AttachmentRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

export async function insertAttachment(
  db: AppSupabaseClient,
  input: { ownerId: string; fileName: string; mimeType: string; sizeBytes: number; storagePath: string },
): Promise<AttachmentRecord> {
  const { data, error } = await db
    .from("ai_attachments")
    .insert({
      owner_id: input.ownerId,
      file_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      storage_path: input.storagePath,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    throw new DataAccessError("aiAttachments.insert", error);
  }
  return toRecord(data);
}

export async function listAttachmentsByIds(db: AppSupabaseClient, attachmentIds: string[]): Promise<AttachmentRecord[]> {
  if (attachmentIds.length === 0) return [];
  const { data, error } = await db.from("ai_attachments").select(COLUMNS).in("id", attachmentIds);
  if (error) {
    throw new DataAccessError("aiAttachments.listByIds", error);
  }
  return data.map(toRecord);
}

export async function listAttachmentsForMessages(db: AppSupabaseClient, messageIds: string[]): Promise<AttachmentRecord[]> {
  if (messageIds.length === 0) return [];
  const { data, error } = await db.from("ai_attachments").select(COLUMNS).in("message_id", messageIds).order("created_at");
  if (error) {
    throw new DataAccessError("aiAttachments.listForMessages", error);
  }
  return data.map(toRecord);
}

/** Collega gli allegati al messaggio che li ha inviati (solo quelli non ancora usati). */
export async function linkAttachments(
  db: AppSupabaseClient,
  attachmentIds: string[],
  link: { conversationId: string; messageId: string },
): Promise<number> {
  if (attachmentIds.length === 0) return 0;
  const { data, error } = await db
    .from("ai_attachments")
    .update({ conversation_id: link.conversationId, message_id: link.messageId })
    .in("id", attachmentIds)
    .is("message_id", null)
    .select("id");
  if (error) {
    throw new DataAccessError("aiAttachments.link", error);
  }
  return data.length;
}

/** Allegati caricati ma mai inviati, più vecchi dell'istante indicato (pulizia). */
export async function listUnsentAttachmentsBefore(db: AppSupabaseClient, before: string): Promise<AttachmentRecord[]> {
  const { data, error } = await db
    .from("ai_attachments")
    .select(COLUMNS)
    .is("message_id", null)
    .lt("created_at", before)
    .limit(50);
  if (error) {
    throw new DataAccessError("aiAttachments.listUnsent", error);
  }
  return data.map(toRecord);
}

export async function deleteAttachmentRows(db: AppSupabaseClient, attachmentIds: string[]): Promise<void> {
  if (attachmentIds.length === 0) return;
  const { error } = await db.from("ai_attachments").delete().in("id", attachmentIds);
  if (error) {
    throw new DataAccessError("aiAttachments.delete", error);
  }
}

// --- Storage --------------------------------------------------------------------------

export async function uploadAttachmentObject(
  db: AppSupabaseClient,
  storagePath: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<void> {
  const { error } = await db.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) {
    throw new DataAccessError("aiAttachments.upload", error);
  }
}

export async function downloadAttachmentObject(db: AppSupabaseClient, storagePath: string): Promise<Uint8Array> {
  const { data, error } = await db.storage.from(ATTACHMENTS_BUCKET).download(storagePath);
  if (error) {
    throw new DataAccessError("aiAttachments.download", error);
  }
  return new Uint8Array(await data.arrayBuffer());
}

export async function removeAttachmentObjects(db: AppSupabaseClient, storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const { error } = await db.storage.from(ATTACHMENTS_BUCKET).remove(storagePaths);
  if (error) {
    throw new DataAccessError("aiAttachments.remove", error);
  }
}

export async function listAttachmentsForConversation(db: AppSupabaseClient, conversationId: string): Promise<AttachmentRecord[]> {
  const { data, error } = await db.from("ai_attachments").select(COLUMNS).eq("conversation_id", conversationId);
  if (error) {
    throw new DataAccessError("aiAttachments.listForConversation", error);
  }
  return data.map(toRecord);
}
