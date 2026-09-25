import "server-only";
import { cache } from "react";
import type { Json } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";
import { logger } from "@/server/logger";
import type { CheckinItem, CheckinWithClient } from "@/types/domain";
import { checkinAnswersSchema, type CheckinAnswers } from "@/validation/checkin";

const MAX_CHECKINS_PER_CLIENT = 60;

const CHECKIN_COLUMNS =
  "id, client_id, submitted_at, answers, reviewed_at, coach_reply, reviewer:profiles!checkins_reviewed_by_fkey(full_name)";
const CHECKIN_WITH_CLIENT_COLUMNS = `${CHECKIN_COLUMNS}, client:clients!checkins_client_id_fkey(full_name)`;

type CheckinRow = {
  id: string;
  client_id: string;
  submitted_at: string;
  answers: Json;
  reviewed_at: string | null;
  coach_reply: string | null;
  reviewer: { full_name: string } | null;
};

/** Il jsonb salvato viene rivalidato: se non rispetta lo schema la UI lo segnala, senza rompersi. */
function parseAnswers(checkinId: string, answers: Json): CheckinAnswers | null {
  const parsed = checkinAnswersSchema.safeParse(answers);
  if (!parsed.success) {
    logger.warn("checkins.invalid_answers", { checkinId });
    return null;
  }
  return parsed.data;
}

function toCheckinItem(row: CheckinRow): CheckinItem {
  return {
    id: row.id,
    clientId: row.client_id,
    submittedAt: row.submitted_at,
    answers: parseAnswers(row.id, row.answers),
    reviewedAt: row.reviewed_at,
    reviewedByName: row.reviewer?.full_name ?? null,
    coachReply: row.coach_reply,
  };
}

/** Check-in della cliente, dal più recente. */
export async function listCheckinsForClient(
  db: AppSupabaseClient,
  clientId: string,
  limit = MAX_CHECKINS_PER_CLIENT,
): Promise<CheckinItem[]> {
  const { data, error } = await db
    .from("checkins")
    .select(CHECKIN_COLUMNS)
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })
    .limit(Math.min(limit, MAX_CHECKINS_PER_CLIENT));
  if (error) {
    throw new DataAccessError("checkins.listForClient", error);
  }
  return data.map(toCheckinItem);
}

export async function listRecentCheckins(
  db: AppSupabaseClient,
  options: { limit: number; pendingReviewOnly?: boolean },
): Promise<CheckinWithClient[]> {
  let query = db
    .from("checkins")
    .select(CHECKIN_WITH_CLIENT_COLUMNS)
    .order("submitted_at", { ascending: false })
    .limit(options.limit);
  if (options.pendingReviewOnly) {
    query = query.is("reviewed_at", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new DataAccessError("checkins.listRecent", error);
  }
  return data.map((row) => ({ ...toCheckinItem(row), clientName: row.client?.full_name ?? "Cliente" }));
}

/** Conta i check-in da revisionare; con `submittedBefore` solo quelli più vecchi di quell'istante. */
export const countPendingReview = cache(async (db: AppSupabaseClient, submittedBefore?: string): Promise<number> => {
  let query = db.from("checkins").select("id", { count: "exact", head: true }).is("reviewed_at", null);
  if (submittedBefore) {
    query = query.lt("submitted_at", submittedBefore);
  }

  const { count, error } = await query;
  if (error) {
    throw new DataAccessError("checkins.countPendingReview", error);
  }
  return count ?? 0;
});

/** Solo gli istanti di invio da `since` in poi: bastano per l'andamento giornaliero in dashboard. */
export async function listCheckinTimesSince(db: AppSupabaseClient, since: string): Promise<string[]> {
  const { data, error } = await db.from("checkins").select("submitted_at").gte("submitted_at", since);
  if (error) {
    throw new DataAccessError("checkins.listTimesSince", error);
  }
  return data.map((row) => row.submitted_at);
}

export async function findCheckin(db: AppSupabaseClient, checkinId: string): Promise<CheckinItem | null> {
  const { data, error } = await db.from("checkins").select(CHECKIN_COLUMNS).eq("id", checkinId).maybeSingle();
  if (error) {
    throw new DataAccessError("checkins.find", error);
  }
  return data ? toCheckinItem(data) : null;
}

/** Check-in precedenti a una data, dal più recente: servono come contesto storico. */
export async function listCheckinsBefore(
  db: AppSupabaseClient,
  clientId: string,
  submittedBefore: string,
  limit: number,
): Promise<CheckinItem[]> {
  const { data, error } = await db
    .from("checkins")
    .select(CHECKIN_COLUMNS)
    .eq("client_id", clientId)
    .lt("submitted_at", submittedBefore)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new DataAccessError("checkins.listBefore", error);
  }
  return data.map(toCheckinItem);
}

/** Registra la revisione (ed eventualmente la risposta approvata) a nome della coach. */
export async function markCheckinReviewed(
  db: AppSupabaseClient,
  input: { checkinId: string; coachId: string; reply?: string },
): Promise<boolean> {
  const { data, error } = await db
    .from("checkins")
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.coachId,
      ...(input.reply !== undefined ? { coach_reply: input.reply } : {}),
    })
    .eq("id", input.checkinId)
    .select("id");
  if (error) {
    throw new DataAccessError("checkins.markReviewed", error);
  }
  return data.length > 0;
}
