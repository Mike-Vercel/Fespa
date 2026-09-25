import "server-only";
import type { DbEnum, Json } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";

/*
 * Registro delle azioni di Coach AI: CHI ha chiesto COSA e QUALE azione è stata eseguita.
 * Append-only (nessun privilegio di update o delete nel database).
 * `inputSummary` contiene solo identificativi e campi strutturati: mai testi liberi o dati sanitari.
 */

export type ActionLogEvent =
  | "proposed"
  | "draft_created"
  | "confirmed"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "denied"
  | "expired";

export async function insertActionLog(
  db: AppSupabaseClient,
  entry: {
    actorId: string;
    conversationId: string | null;
    actionRequestId: string | null;
    automationId?: string | null;
    toolName: string;
    riskLevel: DbEnum<"ai_risk_level">;
    event: ActionLogEvent;
    targetType?: string | null;
    targetId?: string | null;
    inputSummary?: Json;
    errorCode?: string | null;
  },
): Promise<void> {
  const { error } = await db.from("ai_action_logs").insert({
    actor_id: entry.actorId,
    conversation_id: entry.conversationId,
    action_request_id: entry.actionRequestId,
    automation_id: entry.automationId ?? null,
    tool_name: entry.toolName,
    risk_level: entry.riskLevel,
    event: entry.event,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    input_summary: entry.inputSummary ?? {},
    error_code: entry.errorCode ?? null,
  });
  if (error) {
    throw new DataAccessError("aiActionLogs.insert", error);
  }
}
