import "server-only";
import type { DbEnum, Json, TableRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";

/*
 * Richieste di azione di Coach AI: ogni modifica proposta dall'AI vive qui finché la coach
 * non la conferma. Proprietà verificata dalla RLS (owner_id = utente corrente).
 */

export type ActionRequestStatus = DbEnum<"ai_action_status">;

export type ActionRequestRecord = {
  id: string;
  conversationId: string | null;
  messageId: string | null;
  automationId: string | null;
  toolName: string;
  riskLevel: DbEnum<"ai_risk_level">;
  status: ActionRequestStatus;
  input: Json;
  preview: Json;
  targetType: string | null;
  targetId: string | null;
  result: Json | null;
  errorCode: string | null;
  errorMessage: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  executedAt: string | null;
  createdAt: string;
};

const COLUMNS =
  "id, conversation_id, message_id, automation_id, tool_name, risk_level, status, input, preview, target_type, target_id, result, error_code, error_message, expires_at, confirmed_at, executed_at, created_at";

type Row = Pick<
  TableRow<"ai_action_requests">,
  | "id"
  | "conversation_id"
  | "message_id"
  | "automation_id"
  | "tool_name"
  | "risk_level"
  | "status"
  | "input"
  | "preview"
  | "target_type"
  | "target_id"
  | "result"
  | "error_code"
  | "error_message"
  | "expires_at"
  | "confirmed_at"
  | "executed_at"
  | "created_at"
>;

function toRecord(row: Row): ActionRequestRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    automationId: row.automation_id,
    toolName: row.tool_name,
    riskLevel: row.risk_level,
    status: row.status,
    input: row.input,
    preview: row.preview,
    targetType: row.target_type,
    targetId: row.target_id,
    result: row.result,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    expiresAt: row.expires_at,
    confirmedAt: row.confirmed_at,
    executedAt: row.executed_at,
    createdAt: row.created_at,
  };
}

const UNIQUE_VIOLATION = "23505";

export async function findActionRequestByKey(
  db: AppSupabaseClient,
  ownerId: string,
  idempotencyKey: string,
): Promise<ActionRequestRecord | null> {
  const { data, error } = await db
    .from("ai_action_requests")
    .select(COLUMNS)
    .eq("owner_id", ownerId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("aiActionRequests.findByKey", error);
  }
  return data ? toRecord(data) : null;
}

/**
 * Crea la richiesta. Con la stessa chiave di idempotenza (stesso tool, stesso input, stesso turno)
 * restituisce quella esistente invece di duplicarla.
 */
export async function insertActionRequest(
  db: AppSupabaseClient,
  input: {
    ownerId: string;
    conversationId: string | null;
    messageId: string | null;
    automationId: string | null;
    toolName: string;
    riskLevel: DbEnum<"ai_risk_level">;
    status: Extract<ActionRequestStatus, "draft" | "pending">;
    input: Json;
    preview: Json;
    targetType: string | null;
    targetId: string | null;
    idempotencyKey: string;
    expiresAt: string | null;
  },
): Promise<{ record: ActionRequestRecord; created: boolean }> {
  const { data, error } = await db
    .from("ai_action_requests")
    .insert({
      owner_id: input.ownerId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      automation_id: input.automationId,
      tool_name: input.toolName,
      risk_level: input.riskLevel,
      status: input.status,
      input: input.input,
      preview: input.preview,
      target_type: input.targetType,
      target_id: input.targetId,
      idempotency_key: input.idempotencyKey,
      expires_at: input.expiresAt,
    })
    .select(COLUMNS)
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    const existing = await findActionRequestByKey(db, input.ownerId, input.idempotencyKey);
    if (existing) return { record: existing, created: false };
  }
  if (error) {
    throw new DataAccessError("aiActionRequests.insert", error);
  }
  return { record: toRecord(data), created: true };
}

export async function findActionRequest(db: AppSupabaseClient, actionId: string): Promise<ActionRequestRecord | null> {
  const { data, error } = await db.from("ai_action_requests").select(COLUMNS).eq("id", actionId).maybeSingle();
  if (error) {
    throw new DataAccessError("aiActionRequests.find", error);
  }
  return data ? toRecord(data) : null;
}

export async function listActionRequestsByIds(db: AppSupabaseClient, actionIds: string[]): Promise<ActionRequestRecord[]> {
  if (actionIds.length === 0) return [];
  const { data, error } = await db.from("ai_action_requests").select(COLUMNS).in("id", actionIds);
  if (error) {
    throw new DataAccessError("aiActionRequests.listByIds", error);
  }
  return data.map(toRecord);
}

/** Azioni ancora aperte (bozze e in attesa di conferma) di una conversazione, dalla più recente. */
export async function listOpenActionRequests(
  db: AppSupabaseClient,
  conversationId: string,
  limit: number,
): Promise<ActionRequestRecord[]> {
  const { data, error } = await db
    .from("ai_action_requests")
    .select(COLUMNS)
    .eq("conversation_id", conversationId)
    .in("status", ["draft", "pending"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new DataAccessError("aiActionRequests.listOpen", error);
  }
  return data.map(toRecord);
}

/** Bozze preparate dalle automazioni, in attesa della revisione umana. */
export async function listAutomationDrafts(db: AppSupabaseClient, limit: number): Promise<ActionRequestRecord[]> {
  const { data, error } = await db
    .from("ai_action_requests")
    .select(COLUMNS)
    .not("automation_id", "is", null)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new DataAccessError("aiActionRequests.listAutomationDrafts", error);
  }
  return data.map(toRecord);
}

export async function countAutomationDrafts(db: AppSupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("ai_action_requests")
    .select("id", { count: "exact", head: true })
    .not("automation_id", "is", null)
    .eq("status", "draft");
  if (error) {
    throw new DataAccessError("aiActionRequests.countAutomationDrafts", error);
  }
  return count ?? 0;
}

/**
 * Transizione di stato ATOMICA: aggiorna solo se lo stato attuale è tra `from`.
 * È la base dell'idempotenza: con due clic su "Conferma", solo il primo passa a "executing";
 * il secondo trova lo stato già cambiato e riceve null.
 */
export async function transitionActionRequest(
  db: AppSupabaseClient,
  actionId: string,
  from: readonly ActionRequestStatus[],
  changes: {
    status: ActionRequestStatus;
    result?: Json | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    confirmedAt?: string;
    executedAt?: string;
    messageId?: string;
  },
): Promise<ActionRequestRecord | null> {
  const { data, error } = await db
    .from("ai_action_requests")
    .update({
      status: changes.status,
      ...(changes.result !== undefined ? { result: changes.result } : {}),
      ...(changes.errorCode !== undefined ? { error_code: changes.errorCode } : {}),
      ...(changes.errorMessage !== undefined ? { error_message: changes.errorMessage } : {}),
      ...(changes.confirmedAt !== undefined ? { confirmed_at: changes.confirmedAt } : {}),
      ...(changes.executedAt !== undefined ? { executed_at: changes.executedAt } : {}),
      ...(changes.messageId !== undefined ? { message_id: changes.messageId } : {}),
    })
    .eq("id", actionId)
    .in("status", [...from])
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("aiActionRequests.transition", error);
  }
  return data ? toRecord(data) : null;
}

/** "Modifica": nuovo input e nuova anteprima, solo finché l'azione non è stata confermata. */
export async function updateActionRequestPayload(
  db: AppSupabaseClient,
  actionId: string,
  payload: { input: Json; preview: Json },
): Promise<ActionRequestRecord | null> {
  const { data, error } = await db
    .from("ai_action_requests")
    .update({ input: payload.input, preview: payload.preview })
    .eq("id", actionId)
    .in("status", ["draft", "pending"])
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("aiActionRequests.updatePayload", error);
  }
  return data ? toRecord(data) : null;
}
