import "server-only";
import { randomUUID } from "node:crypto";
import {
  ACCEPTED_TYPES_LABEL,
  ATTACHMENT_TYPES,
  bytesMatchMimeType,
  isAllowedMimeType,
  mimeTypeFromFileName,
  sanitizeFileName,
} from "@/domain/coach-ai-attachments";
import { formatFileSize } from "@/domain/coach-ai";
import type { AuthenticatedContext } from "@/server/auth/session";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  deleteAttachmentRows,
  downloadAttachmentObject,
  insertAttachment,
  listAttachmentsByIds,
  listUnsentAttachmentsBefore,
  removeAttachmentObjects,
  uploadAttachmentObject,
  type AttachmentRecord,
} from "@/server/repositories/ai-attachments";
import type { AttachmentView } from "@/types/coach-ai";
import { ATTACHMENT_MAX_BYTES } from "@/validation/coach-ai";
import type { LoadedAttachment } from "./context";
import { toAttachmentView } from "./messages";

/*
 * Allegati di Coach AI.
 *  - Tipi ammessi decisi dall'estensione E verificati sui byte reali (magic bytes / UTF-8 valido):
 *    il MIME dichiarato dal browser non conta.
 *  - Limite di dimensione, nome file ripulito, percorso nello storage generato dal server
 *    (cartella = id utente, nome casuale): il nome scelto dall'utente non diventa mai un percorso.
 *  - Il contenuto viene passato al modello come DATO non affidabile (context.ts), mai come istruzione.
 */

/** Allegati caricati ma non inviati: dopo un giorno vengono rimossi alla prima occasione. */
const UNSENT_TTL_MS = 24 * 60 * 60 * 1000;
/** Tetto agli allegati caricati e non ancora inviati (abuso dello storage). */
const MAX_UNSENT_ATTACHMENTS = 12;

export async function uploadAttachment(
  context: AuthenticatedContext,
  file: { name: string; bytes: Uint8Array },
): Promise<AttachmentView> {
  const fileName = sanitizeFileName(file.name);
  if (file.bytes.byteLength === 0) {
    throw new ValidationError({ file: ["Il file è vuoto."] });
  }
  if (file.bytes.byteLength > ATTACHMENT_MAX_BYTES) {
    throw new ValidationError({ file: [`Il file supera il limite di ${formatFileSize(ATTACHMENT_MAX_BYTES)}.`] });
  }
  const mimeType = mimeTypeFromFileName(fileName);
  if (!mimeType) {
    throw new ValidationError({ file: [`Formato non supportato. Puoi allegare file ${ACCEPTED_TYPES_LABEL}.`] });
  }
  if (!bytesMatchMimeType(file.bytes, mimeType)) {
    throw new ValidationError({ file: [`Il contenuto non corrisponde a un file ${ATTACHMENT_TYPES[mimeType].label} valido.`] });
  }

  await removeStaleUnsentAttachments(context.db);
  const waiting = await listUnsentAttachmentsBefore(context.db, new Date().toISOString());
  if (waiting.length >= MAX_UNSENT_ATTACHMENTS) {
    throw new ValidationError({ file: ["Hai già troppi allegati in attesa: invia il messaggio o rimuovine qualcuno."] });
  }

  const extension = ATTACHMENT_TYPES[mimeType].extensions[0];
  const storagePath = `${context.coach.id}/${randomUUID()}.${extension}`;
  await uploadAttachmentObject(context.db, storagePath, file.bytes, mimeType);
  try {
    const record = await insertAttachment(context.db, {
      ownerId: context.coach.id,
      fileName,
      mimeType,
      sizeBytes: file.bytes.byteLength,
      storagePath,
    });
    logger.info("coachAi.attachment_uploaded", { attachmentId: record.id, mimeType, sizeBytes: record.sizeBytes });
    return toAttachmentView(record);
  } catch (error) {
    // Nessun file orfano nello storage se il salvataggio dei metadati fallisce.
    await removeAttachmentObjects(context.db, [storagePath]).catch(() => undefined);
    throw error;
  }
}

/** Rimozione dal composer, prima dell'invio. Gli allegati inviati restano con la conversazione. */
export async function removeUnsentAttachment(context: AuthenticatedContext, attachmentId: string): Promise<void> {
  const [record] = await listAttachmentsByIds(context.db, [attachmentId]);
  if (!record || record.messageId !== null) {
    throw new NotFoundError("Allegato non trovato o già inviato.");
  }
  await removeAttachmentObjects(context.db, [record.storagePath]);
  await deleteAttachmentRows(context.db, [record.id]);
}

async function removeStaleUnsentAttachments(db: AppSupabaseClient): Promise<void> {
  try {
    const stale = await listUnsentAttachmentsBefore(db, new Date(Date.now() - UNSENT_TTL_MS).toISOString());
    if (stale.length === 0) return;
    await removeAttachmentObjects(db, stale.map((record) => record.storagePath));
    await deleteAttachmentRows(db, stale.map((record) => record.id));
  } catch (error) {
    // Pulizia "best effort": non deve impedire il nuovo caricamento.
    logger.warn("coachAi.attachment_cleanup_failed", { error });
  }
}

/** Allegati per l'invio: devono essere dell'utente (RLS) e non ancora usati in un altro messaggio. */
export async function resolveUnsentAttachments(db: AppSupabaseClient, attachmentIds: string[]): Promise<AttachmentRecord[]> {
  if (attachmentIds.length === 0) return [];
  const records = await listAttachmentsByIds(db, attachmentIds);
  if (records.length !== attachmentIds.length || records.some((record) => record.messageId !== null)) {
    throw new NotFoundError("Uno degli allegati non è più disponibile: caricalo di nuovo.");
  }
  return records;
}

/** Scarica i file (con la sessione dell'utente) e li prepara per il modello. */
export async function loadAttachmentsForModel(db: AppSupabaseClient, records: AttachmentRecord[]): Promise<LoadedAttachment[]> {
  return Promise.all(
    records.map(async (record): Promise<LoadedAttachment> => {
      const bytes = await downloadAttachmentObject(db, record.storagePath);
      const mimeType = isAllowedMimeType(record.mimeType) ? record.mimeType : "text/plain";
      switch (mimeType) {
        case "application/pdf":
          return { kind: "pdf", fileName: record.fileName, base64: Buffer.from(bytes).toString("base64") };
        case "image/png":
        case "image/jpeg":
        case "image/webp":
          return { kind: "image", fileName: record.fileName, mediaType: mimeType, base64: Buffer.from(bytes).toString("base64") };
        case "text/plain":
        case "text/csv":
          return { kind: "text", fileName: record.fileName, text: new TextDecoder("utf-8").decode(bytes) };
      }
    }),
  );
}

export async function removeConversationFiles(db: AppSupabaseClient, records: AttachmentRecord[]): Promise<void> {
  if (records.length === 0) return;
  await removeAttachmentObjects(db, records.map((record) => record.storagePath));
}
