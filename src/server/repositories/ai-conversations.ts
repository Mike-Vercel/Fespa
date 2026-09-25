import "server-only";
import type { DbEnum, Json, TableRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";

/*
 * Conversazioni e messaggi di Coach AI. Tutte le query usano il client dell'utente:
 * la RLS restituisce e modifica solo le righe di sua proprietà.
 */

const MAX_CONVERSATIONS = 100;
const MAX_SEARCH_MATCHES = 50;

export type ConversationRecord = {
  id: string;
  title: string;
  titleIsCustom: boolean;
  preview: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  role: DbEnum<"ai_message_role">;
  content: string;
  status: DbEnum<"ai_message_status">;
  metadata: Json;
  clientMessageId: string | null;
  createdAt: string;
};

const CONVERSATION_COLUMNS = "id, title, title_is_custom, preview, archived_at, created_at, updated_at";
const MESSAGE_COLUMNS = "id, conversation_id, role, content, status, metadata, client_message_id, created_at";

type ConversationRow = Pick<
  TableRow<"ai_conversations">,
  "id" | "title" | "title_is_custom" | "preview" | "archived_at" | "created_at" | "updated_at"
>;
type MessageRow = Pick<
  TableRow<"ai_messages">,
  "id" | "conversation_id" | "role" | "content" | "status" | "metadata" | "client_message_id" | "created_at"
>;

function toConversation(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    titleIsCustom: row.title_is_custom,
    preview: row.preview,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    status: row.status,
    metadata: row.metadata,
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
  };
}

/** Come in clients.ts: la ricerca è sempre "contiene questo testo", mai un pattern scelto dall'utente. */
function toContainsPattern(search: string): string {
  return `%${search.replace(/[%_*\\,()"]/g, " ").trim()}%`;
}

// --- Conversazioni -------------------------------------------------------------------

export async function listConversations(
  db: AppSupabaseClient,
  options: { archived: boolean; search?: string },
): Promise<ConversationRecord[]> {
  let query = db.from("ai_conversations").select(CONVERSATION_COLUMNS);
  query = options.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const search = options.search?.trim() ?? "";
  if (search !== "") {
    const pattern = toContainsPattern(search);
    // Si cerca anche nel testo dei messaggi, non solo nel titolo.
    const { data: messageMatches, error: messageError } = await db
      .from("ai_messages")
      .select("conversation_id")
      .ilike("content", pattern)
      .limit(MAX_SEARCH_MATCHES);
    if (messageError) {
      throw new DataAccessError("aiConversations.searchMessages", messageError);
    }
    const ids = [...new Set(messageMatches.map((row) => row.conversation_id))];
    query = ids.length > 0 ? query.or(`title.ilike.${pattern},id.in.(${ids.join(",")})`) : query.ilike("title", pattern);
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(MAX_CONVERSATIONS);
  if (error) {
    throw new DataAccessError("aiConversations.list", error);
  }
  return data.map(toConversation);
}

export async function findConversation(db: AppSupabaseClient, conversationId: string): Promise<ConversationRecord | null> {
  const { data, error } = await db.from("ai_conversations").select(CONVERSATION_COLUMNS).eq("id", conversationId).maybeSingle();
  if (error) {
    throw new DataAccessError("aiConversations.find", error);
  }
  return data ? toConversation(data) : null;
}

export async function insertConversation(
  db: AppSupabaseClient,
  input: { ownerId: string; title: string; preview: string | null },
): Promise<ConversationRecord> {
  const { data, error } = await db
    .from("ai_conversations")
    .insert({ owner_id: input.ownerId, title: input.title, preview: input.preview })
    .select(CONVERSATION_COLUMNS)
    .single();
  if (error) {
    throw new DataAccessError("aiConversations.insert", error);
  }
  return toConversation(data);
}

export async function updateConversation(
  db: AppSupabaseClient,
  conversationId: string,
  changes: { title?: string; titleIsCustom?: boolean; preview?: string | null; archivedAt?: string | null },
): Promise<ConversationRecord | null> {
  const { data, error } = await db
    .from("ai_conversations")
    .update({
      ...(changes.title !== undefined ? { title: changes.title } : {}),
      ...(changes.titleIsCustom !== undefined ? { title_is_custom: changes.titleIsCustom } : {}),
      ...(changes.preview !== undefined ? { preview: changes.preview } : {}),
      ...(changes.archivedAt !== undefined ? { archived_at: changes.archivedAt } : {}),
    })
    .eq("id", conversationId)
    .select(CONVERSATION_COLUMNS)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("aiConversations.update", error);
  }
  return data ? toConversation(data) : null;
}

export async function deleteConversation(db: AppSupabaseClient, conversationId: string): Promise<boolean> {
  const { data, error } = await db.from("ai_conversations").delete().eq("id", conversationId).select("id");
  if (error) {
    throw new DataAccessError("aiConversations.delete", error);
  }
  return data.length > 0;
}

// --- Messaggi -----------------------------------------------------------------------

/** Pagina di messaggi dal più recente (prima di `before`, se indicato), restituita in ordine cronologico. */
export async function listMessages(
  db: AppSupabaseClient,
  conversationId: string,
  options: { limit: number; before?: string },
): Promise<MessageRecord[]> {
  let query = db.from("ai_messages").select(MESSAGE_COLUMNS).eq("conversation_id", conversationId);
  if (options.before) {
    query = query.lt("created_at", options.before);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(options.limit);
  if (error) {
    throw new DataAccessError("aiMessages.list", error);
  }
  return data.map(toMessage).reverse();
}

export async function findMessageByClientId(
  db: AppSupabaseClient,
  conversationId: string,
  clientMessageId: string,
): Promise<MessageRecord | null> {
  const { data, error } = await db
    .from("ai_messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .eq("client_message_id", clientMessageId)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("aiMessages.findByClientId", error);
  }
  return data ? toMessage(data) : null;
}

export async function insertMessage(
  db: AppSupabaseClient,
  input: {
    conversationId: string;
    ownerId: string;
    role: DbEnum<"ai_message_role">;
    content: string;
    status: DbEnum<"ai_message_status">;
    metadata?: Json;
    clientMessageId?: string;
    provider?: string;
    model?: string;
    promptVersion?: string;
  },
): Promise<MessageRecord> {
  const { data, error } = await db
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      owner_id: input.ownerId,
      role: input.role,
      content: input.content,
      status: input.status,
      metadata: input.metadata ?? {},
      client_message_id: input.clientMessageId ?? null,
      provider: input.provider ?? null,
      model: input.model ?? null,
      prompt_version: input.promptVersion ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    throw new DataAccessError("aiMessages.insert", error);
  }
  return toMessage(data);
}

export async function updateMessage(
  db: AppSupabaseClient,
  messageId: string,
  changes: { content: string; status: DbEnum<"ai_message_status">; metadata: Json },
): Promise<void> {
  const { error } = await db
    .from("ai_messages")
    .update({ content: changes.content, status: changes.status, metadata: changes.metadata })
    .eq("id", messageId);
  if (error) {
    throw new DataAccessError("aiMessages.update", error);
  }
}
