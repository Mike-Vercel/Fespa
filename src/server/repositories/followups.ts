import "server-only";
import type { DbEnum } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";
import type { FollowupItem, FollowupStatus } from "@/types/domain";

// La pagina operativa non deve trasferire tutto lo storico in una sola richiesta.
const MAX_FOLLOWUPS = 100;

const FOLLOWUP_COLUMNS =
  "id, client_id, title, description, due_on, status, completed_at, source, ai_analysis_id, client:clients!followups_client_id_fkey(full_name)";

type FollowupRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_on: string;
  status: DbEnum<"followup_status">;
  completed_at: string | null;
  source: DbEnum<"followup_source">;
  ai_analysis_id: string | null;
  client: { full_name: string } | null;
};

function toFollowupItem(row: FollowupRow): FollowupItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client?.full_name ?? "Cliente",
    title: row.title,
    description: row.description,
    dueOn: row.due_on,
    status: row.status,
    completedAt: row.completed_at,
    source: row.source,
    aiAnalysisId: row.ai_analysis_id,
  };
}

export async function listFollowupsForClient(db: AppSupabaseClient, clientId: string): Promise<FollowupItem[]> {
  const { data, error } = await db
    .from("followups")
    .select(FOLLOWUP_COLUMNS)
    .eq("client_id", clientId)
    .order("due_on", { ascending: true })
    .limit(MAX_FOLLOWUPS);
  if (error) {
    throw new DataAccessError("followups.listForClient", error);
  }
  return data.map(toFollowupItem);
}

/** Follow-up in attesa con scadenza entro `lastDay` (inclusi gli scaduti). */
export async function listPendingFollowupsDueBy(db: AppSupabaseClient, lastDay: string): Promise<FollowupItem[]> {
  const { data, error } = await db
    .from("followups")
    .select(FOLLOWUP_COLUMNS)
    .eq("status", "pending")
    .lte("due_on", lastDay)
    .order("due_on", { ascending: true })
    .limit(MAX_FOLLOWUPS);
  if (error) {
    throw new DataAccessError("followups.listPendingDueBy", error);
  }
  return data.map(toFollowupItem);
}

export async function listFollowupsByStatus(
  db: AppSupabaseClient,
  statuses: FollowupStatus[],
  order: { column: "due_on" | "updated_at"; ascending: boolean },
  limit = MAX_FOLLOWUPS,
): Promise<FollowupItem[]> {
  const { data, error } = await db
    .from("followups")
    .select(FOLLOWUP_COLUMNS)
    .in("status", statuses)
    .order(order.column, { ascending: order.ascending })
    .limit(limit);
  if (error) {
    throw new DataAccessError("followups.listByStatus", error);
  }
  return data.map(toFollowupItem);
}

/** Follow-up in attesa con scadenza oggi o già passata. */
export async function countDueFollowups(db: AppSupabaseClient, today: string): Promise<number> {
  const { count, error } = await db
    .from("followups")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .lte("due_on", today);
  if (error) {
    throw new DataAccessError("followups.countDue", error);
  }
  return count ?? 0;
}

export async function findFollowup(db: AppSupabaseClient, followupId: string): Promise<FollowupItem | null> {
  const { data, error } = await db.from("followups").select(FOLLOWUP_COLUMNS).eq("id", followupId).maybeSingle();
  if (error) {
    throw new DataAccessError("followups.find", error);
  }
  return data ? toFollowupItem(data) : null;
}

export async function insertFollowup(
  db: AppSupabaseClient,
  input: {
    clientId: string;
    coachId: string;
    title: string;
    description: string | null;
    dueOn: string;
    aiAnalysisId: string | null;
  },
): Promise<string> {
  const { data, error } = await db
    .from("followups")
    .insert({
      client_id: input.clientId,
      coach_id: input.coachId,
      title: input.title,
      description: input.description,
      due_on: input.dueOn,
      source: input.aiAnalysisId ? "ai_suggestion" : "manual",
      ai_analysis_id: input.aiAnalysisId,
    })
    .select("id")
    .single();
  if (error) {
    throw new DataAccessError("followups.insert", error);
  }
  return data.id;
}

export async function updateFollowupStatus(
  db: AppSupabaseClient,
  followupId: string,
  status: FollowupStatus,
): Promise<boolean> {
  const { data, error } = await db.from("followups").update({ status }).eq("id", followupId).select("id");
  if (error) {
    throw new DataAccessError("followups.updateStatus", error);
  }
  return data.length > 0;
}
