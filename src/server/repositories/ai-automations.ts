import "server-only";
import type { DbEnum, TableRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";

/*
 * Regole di automazione e i loro eventi. Gli eventi li scrive SOLO il trigger del database
 * sui nuovi check-in; qui si leggono ed elaborano con il client dell'utente (RLS: solo i propri).
 */

export type AutomationRecord = {
  id: string;
  trigger: DbEnum<"ai_automation_trigger">;
  action: DbEnum<"ai_automation_action">;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: DbEnum<"ai_automation_run_status"> | null;
  createdAt: string;
};

export type AutomationEventRecord = {
  id: string;
  automationId: string;
  trigger: DbEnum<"ai_automation_trigger">;
  clientId: string | null;
  checkinId: string | null;
  status: DbEnum<"ai_automation_event_status">;
  attempts: number;
  createdAt: string;
};

const AUTOMATION_COLUMNS = "id, trigger, action, enabled, last_run_at, last_status, created_at";
const EVENT_COLUMNS = "id, automation_id, trigger, client_id, checkin_id, status, attempts, created_at";

type AutomationRow = Pick<
  TableRow<"ai_automations">,
  "id" | "trigger" | "action" | "enabled" | "last_run_at" | "last_status" | "created_at"
>;
type EventRow = Pick<
  TableRow<"ai_automation_events">,
  "id" | "automation_id" | "trigger" | "client_id" | "checkin_id" | "status" | "attempts" | "created_at"
>;

function toAutomation(row: AutomationRow): AutomationRecord {
  return {
    id: row.id,
    trigger: row.trigger,
    action: row.action,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    lastStatus: row.last_status,
    createdAt: row.created_at,
  };
}

function toEvent(row: EventRow): AutomationEventRecord {
  return {
    id: row.id,
    automationId: row.automation_id,
    trigger: row.trigger,
    clientId: row.client_id,
    checkinId: row.checkin_id,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at,
  };
}

const UNIQUE_VIOLATION = "23505";

export async function listAutomations(db: AppSupabaseClient): Promise<AutomationRecord[]> {
  const { data, error } = await db.from("ai_automations").select(AUTOMATION_COLUMNS).order("created_at");
  if (error) {
    throw new DataAccessError("aiAutomations.list", error);
  }
  return data.map(toAutomation);
}

export async function findAutomation(db: AppSupabaseClient, automationId: string): Promise<AutomationRecord | null> {
  const { data, error } = await db.from("ai_automations").select(AUTOMATION_COLUMNS).eq("id", automationId).maybeSingle();
  if (error) {
    throw new DataAccessError("aiAutomations.find", error);
  }
  return data ? toAutomation(data) : null;
}

/**
 * Crea la regola, o la riattiva se esiste già (una sola regola per coppia trigger/azione).
 * send_message e requires_confirmation non sono impostabili: il database li fissa a "non inviare" e "conferma umana".
 */
export async function upsertAutomation(
  db: AppSupabaseClient,
  input: { ownerId: string; trigger: DbEnum<"ai_automation_trigger">; action: DbEnum<"ai_automation_action"> },
): Promise<{ record: AutomationRecord; created: boolean }> {
  const { data, error } = await db
    .from("ai_automations")
    .insert({ owner_id: input.ownerId, trigger: input.trigger, action: input.action, enabled: true })
    .select(AUTOMATION_COLUMNS)
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    const { data: existing, error: updateError } = await db
      .from("ai_automations")
      .update({ enabled: true })
      .eq("owner_id", input.ownerId)
      .eq("trigger", input.trigger)
      .eq("action", input.action)
      .select(AUTOMATION_COLUMNS)
      .single();
    if (updateError) {
      throw new DataAccessError("aiAutomations.reenable", updateError);
    }
    return { record: toAutomation(existing), created: false };
  }
  if (error) {
    throw new DataAccessError("aiAutomations.insert", error);
  }
  return { record: toAutomation(data), created: true };
}

export async function setAutomationEnabled(db: AppSupabaseClient, automationId: string, enabled: boolean): Promise<boolean> {
  const { data, error } = await db.from("ai_automations").update({ enabled }).eq("id", automationId).select("id");
  if (error) {
    throw new DataAccessError("aiAutomations.setEnabled", error);
  }
  return data.length > 0;
}

export async function recordAutomationRun(
  db: AppSupabaseClient,
  automationId: string,
  run: { status: DbEnum<"ai_automation_run_status">; errorCode: string | null },
): Promise<void> {
  const { error } = await db
    .from("ai_automations")
    .update({ last_run_at: new Date().toISOString(), last_status: run.status, last_error: run.errorCode })
    .eq("id", automationId);
  if (error) {
    throw new DataAccessError("aiAutomations.recordRun", error);
  }
}

// --- Eventi --------------------------------------------------------------------------

export async function listPendingAutomationEvents(db: AppSupabaseClient, limit: number): Promise<AutomationEventRecord[]> {
  const { data, error } = await db
    .from("ai_automation_events")
    .select(EVENT_COLUMNS)
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);
  if (error) {
    throw new DataAccessError("aiAutomationEvents.listPending", error);
  }
  return data.map(toEvent);
}

export async function countPendingAutomationEvents(db: AppSupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("ai_automation_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    throw new DataAccessError("aiAutomationEvents.countPending", error);
  }
  return count ?? 0;
}

/** Prende in carico un evento in modo atomico: due elaborazioni parallele non generano due bozze. */
export async function claimAutomationEvent(db: AppSupabaseClient, event: AutomationEventRecord): Promise<boolean> {
  const { data, error } = await db
    .from("ai_automation_events")
    .update({ status: "processing", attempts: event.attempts + 1 })
    .eq("id", event.id)
    .eq("status", "pending")
    .select("id");
  if (error) {
    throw new DataAccessError("aiAutomationEvents.claim", error);
  }
  return data.length > 0;
}

export async function finishAutomationEvent(
  db: AppSupabaseClient,
  eventId: string,
  outcome: {
    status: Extract<DbEnum<"ai_automation_event_status">, "done" | "failed" | "skipped" | "pending">;
    actionRequestId?: string | null;
    errorCode?: string | null;
  },
): Promise<void> {
  const { error } = await db
    .from("ai_automation_events")
    .update({
      status: outcome.status,
      action_request_id: outcome.actionRequestId ?? null,
      error_code: outcome.errorCode ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) {
    throw new DataAccessError("aiAutomationEvents.finish", error);
  }
}
