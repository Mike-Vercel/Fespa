import "server-only";
import type { AuthenticatedContext } from "@/server/auth/session";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { findCheckin, listRecentCheckins, markCheckinReviewed } from "@/server/repositories/checkins";
import type { CheckinItem, CheckinWithClient } from "@/types/domain";
import { assertClientAccess } from "./access";

const CHECKIN_NOT_FOUND_MESSAGE = "Check-in non trovato o non accessibile.";
// La inbox mostra una finestra operativa: evita di trasferire e validare 100 JSON
// completi quando la coach deve lavorare sui check-in più recenti.
const INBOX_LIMIT = 30;

/** Recupera un check-in verificando l'accesso alla sua cliente. */
export async function getAccessibleCheckin(context: AuthenticatedContext, checkinId: string): Promise<CheckinItem> {
  const checkin = await findCheckin(context.db, checkinId);
  if (!checkin) {
    throw new NotFoundError(CHECKIN_NOT_FOUND_MESSAGE);
  }
  await assertClientAccess(context, checkin.clientId);
  return checkin;
}

/**
 * Segna il check-in come revisionato dalla coach corrente.
 * `reply` è il testo approvato dalla coach (anche se nato da una bozza AI): lo salva lei, esplicitamente.
 */
export async function reviewCheckin(
  context: AuthenticatedContext,
  input: { checkinId: string; reply?: string },
): Promise<void> {
  const checkin = await getAccessibleCheckin(context, input.checkinId);
  if (input.reply === undefined && checkin.reviewedAt) {
    throw new ValidationError({}, "Questo check-in è già stato revisionato.");
  }
  // La cliente potrebbe aver già letto la risposta nella sua area: non la si cambia di nascosto.
  if (input.reply !== undefined && checkin.coachReply) {
    throw new ValidationError({}, "Questo check-in ha già una risposta.");
  }

  const updated = await markCheckinReviewed(context.db, {
    checkinId: checkin.id,
    coachId: context.coach.id,
    reply: input.reply,
  });
  if (!updated) {
    throw new NotFoundError(CHECKIN_NOT_FOUND_MESSAGE);
  }
  logger.info("checkins.reviewed", { checkinId: checkin.id, withReply: input.reply !== undefined });
}

export async function listCheckinInbox(
  context: AuthenticatedContext,
  filter: "pending" | "all",
): Promise<CheckinWithClient[]> {
  return listRecentCheckins(context.db, { limit: INBOX_LIMIT, pendingReviewOnly: filter === "pending" });
}
