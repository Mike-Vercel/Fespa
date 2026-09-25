import "server-only";
import { z } from "zod";
import { ATTACHMENT_TYPES, isAllowedMimeType } from "@/domain/coach-ai-attachments";
import type { AppSupabaseClient } from "@/server/db/supabase";
import type { Json } from "@/server/db/database.types";
import { listActionRequestsByIds } from "@/server/repositories/ai-action-requests";
import { listAttachmentsForMessages, type AttachmentRecord } from "@/server/repositories/ai-attachments";
import type { ConversationRecord, MessageRecord } from "@/server/repositories/ai-conversations";
import type { AttachmentView, ChatMessageView, Clarification, ConversationSummary, ToolActivity } from "@/types/coach-ai";
import type { ErrorCode } from "@/types/results";
import { toActionView } from "./actions";

/*
 * Metadati dei messaggi: SOLO ciò che serve a ridisegnare la risposta (attività dei tool,
 * riferimenti alle azioni, domanda di chiarimento, errore). Mai prompt, input grezzi dei tool
 * o ragionamenti del modello. Riletti con Zod: il JSON salvato non è tipizzato.
 */

const activitySchema = z.object({
  id: z.string().max(100),
  tool: z.string().max(60),
  status: z.enum(["running", "success", "failed", "requires_confirmation", "denied"]),
  label: z.string().max(300),
  links: z.array(z.object({ label: z.string().max(120), href: z.string().startsWith("/").max(300) })).max(5),
});

const clarificationSchema = z.object({
  question: z.string(),
  options: z.array(z.object({ label: z.string(), description: z.string().nullable(), reply: z.string() })),
});

const metadataSchema = z.object({
  activities: z.array(activitySchema).default([]),
  actionIds: z.array(z.string()).default([]),
  attachmentIds: z.array(z.string()).default([]),
  clarification: clarificationSchema.nullable().default(null),
  error: z.object({ code: z.string(), message: z.string() }).nullable().default(null),
});

export type MessageMetadata = z.infer<typeof metadataSchema>;

const EMPTY_METADATA: MessageMetadata = { activities: [], actionIds: [], attachmentIds: [], clarification: null, error: null };

export function parseMetadata(value: Json): MessageMetadata {
  const parsed = metadataSchema.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_METADATA;
}

export function serializeMetadata(metadata: {
  activities: ToolActivity[];
  actionIds: string[];
  attachmentIds?: string[];
  clarification: Clarification | null;
  error: { code: ErrorCode; message: string } | null;
}): Json {
  // Un'attività rimasta "in corso" (risposta interrotta) viene salvata come non completata.
  const activities = metadata.activities.map((activity) =>
    activity.status === "running" ? { ...activity, status: "failed" as const, label: `${activity.label.replace(/…$/, "")} (interrotto)` } : activity,
  );
  return {
    activities,
    actionIds: [...new Set(metadata.actionIds)],
    attachmentIds: metadata.attachmentIds ?? [],
    clarification: metadata.clarification,
    error: metadata.error,
  } as Json;
}

export function toConversationSummary(record: ConversationRecord): ConversationSummary {
  return {
    id: record.id,
    title: record.title,
    preview: record.preview,
    updatedAt: record.updatedAt,
    archived: record.archivedAt !== null,
  };
}

export function toAttachmentView(record: AttachmentRecord): AttachmentView {
  return {
    id: record.id,
    fileName: record.fileName,
    mimeType: record.mimeType,
    kind: isAllowedMimeType(record.mimeType) ? ATTACHMENT_TYPES[record.mimeType].kind : "text",
    sizeBytes: record.sizeBytes,
  };
}

const KNOWN_ERROR_CODES = new Set<string>([
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "AI_NOT_CONFIGURED",
  "AI_UNAVAILABLE",
  "AI_PROVIDER_REJECTED",
  "AI_TIMEOUT",
  "AI_INVALID_OUTPUT",
  "AI_REFUSED",
  "AI_DEMO_UNSUPPORTED",
  "INTERNAL_ERROR",
]);

function toErrorCode(code: string): ErrorCode {
  return KNOWN_ERROR_CODES.has(code) ? (code as ErrorCode) : "INTERNAL_ERROR";
}

/** Messaggi salvati → viste per l'interfaccia, con azioni e allegati caricati in due sole query. */
export async function toMessageViews(db: AppSupabaseClient, records: MessageRecord[]): Promise<ChatMessageView[]> {
  const metadataById = new Map(records.map((record) => [record.id, parseMetadata(record.metadata)]));
  const actionIds = [...new Set([...metadataById.values()].flatMap((metadata) => metadata.actionIds))];
  const [actions, attachments] = await Promise.all([
    listActionRequestsByIds(db, actionIds),
    listAttachmentsForMessages(
      db,
      records.filter((record) => record.role === "user").map((record) => record.id),
    ),
  ]);
  const now = new Date();
  const actionViews = new Map(actions.map((action) => [action.id, toActionView(action, now)]));

  return records.map((record) => {
    const metadata = metadataById.get(record.id) ?? EMPTY_METADATA;
    return {
      id: record.id,
      role: record.role,
      content: record.content,
      status: record.status,
      createdAt: record.createdAt,
      activities: metadata.activities,
      actions: metadata.actionIds.flatMap((id) => {
        const view = actionViews.get(id);
        return view ? [view] : [];
      }),
      clarification: metadata.clarification,
      attachments: attachments.filter((attachment) => attachment.messageId === record.id).map(toAttachmentView),
      error: metadata.error ? { code: toErrorCode(metadata.error.code), message: metadata.error.message } : null,
    };
  });
}
