import "server-only";
import type { ViewRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";
import type { ClientListItem } from "@/types/domain";

/*
 * Accesso ai dati delle clienti. Tutte le query usano il client della coach:
 * la RLS restituisce solo le clienti a lei assegnate.
 */

/** Tetto di sicurezza: nessuna lista carica righe senza limite. */
const MAX_CLIENTS = 500;

const OVERVIEW_COLUMNS =
  "id, full_name, status, goal, started_on, last_checkin_at, pending_review_count, oldest_pending_review_at, next_followup_on, pending_followup_count, pending_ai_suggestion_count, approval_status, email, has_account, onboarding_completed_at, coach_count";

/**
 * I caratteri jolly di LIKE (e "*" di PostgREST) nel testo cercato vengono rimossi:
 * la ricerca deve essere sempre "contiene questo testo", mai un pattern scelto dall'utente.
 */
function toContainsPattern(search: string): string {
  const literal = search.replace(/[%_*\\,()]/g, " ").trim();
  return `%${literal}%`;
}

function toClientListItem(row: ViewRow<"client_overview">): ClientListItem | null {
  // Le colonne della vista sono nullable solo per i tipi generati: in pratica derivano da colonne NOT NULL.
  if (!row.id || !row.full_name || !row.status || !row.started_on || !row.approval_status) {
    return null;
  }
  return {
    id: row.id,
    fullName: row.full_name,
    status: row.status,
    goal: row.goal,
    startedOn: row.started_on,
    lastCheckinAt: row.last_checkin_at,
    pendingReviewCount: row.pending_review_count ?? 0,
    oldestPendingReviewAt: row.oldest_pending_review_at,
    nextFollowupOn: row.next_followup_on,
    pendingFollowupCount: row.pending_followup_count ?? 0,
    pendingAiSuggestionCount: row.pending_ai_suggestion_count ?? 0,
    approvalStatus: row.approval_status,
    email: row.email,
    hasAccount: row.has_account ?? false,
    onboardingCompletedAt: row.onboarding_completed_at,
    coachCount: row.coach_count ?? 0,
  };
}

function toClientListItems(rows: ViewRow<"client_overview">[]): ClientListItem[] {
  return rows.map(toClientListItem).filter((item): item is ClientListItem => item !== null);
}

/** Clienti operative (approvate). Le iscrizioni in attesa compaiono solo nell'area admin. */
export async function listClientOverviews(db: AppSupabaseClient, search = ""): Promise<ClientListItem[]> {
  let query = db
    .from("client_overview")
    .select(OVERVIEW_COLUMNS)
    .eq("approval_status", "approved")
    .order("full_name")
    .limit(MAX_CLIENTS);
  if (search.trim()) {
    query = query.ilike("full_name", toContainsPattern(search));
  }

  const { data, error } = await query;
  if (error) {
    throw new DataAccessError("clients.listOverviews", error);
  }
  return toClientListItems(data);
}

export async function findClientOverview(db: AppSupabaseClient, clientId: string): Promise<ClientListItem | null> {
  const { data, error } = await db.from("client_overview").select(OVERVIEW_COLUMNS).eq("id", clientId).maybeSingle();
  if (error) {
    throw new DataAccessError("clients.findOverview", error);
  }
  return data ? toClientListItem(data) : null;
}

/** Vero se la cliente è assegnata alla coach (controllo esplicito, oltre alla RLS). */
export async function isClientAssignedTo(db: AppSupabaseClient, coachId: string, clientId: string): Promise<boolean> {
  const { data, error } = await db
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("clients.isAssigned", error);
  }
  return data !== null;
}

export async function clientExists(db: AppSupabaseClient, clientId: string): Promise<boolean> {
  const { data, error } = await db.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (error) {
    throw new DataAccessError("clients.exists", error);
  }
  return data !== null;
}

/** Nomi delle clienti accessibili, per i select dei form (es. nuovo follow-up). */
export async function listClientOptions(db: AppSupabaseClient): Promise<Array<{ id: string; fullName: string }>> {
  const { data, error } = await db
    .from("clients")
    .select("id, full_name")
    .eq("approval_status", "approved")
    .neq("status", "completed")
    .order("full_name")
    .limit(MAX_CLIENTS);
  if (error) {
    throw new DataAccessError("clients.listOptions", error);
  }
  return data.map((row) => ({ id: row.id, fullName: row.full_name }));
}
