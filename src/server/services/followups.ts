import "server-only";
import { addDays, calendarDateIn, daysBetween } from "@/domain/dates";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { findAnalysis, recordFollowupDecision } from "@/server/repositories/ai-analyses";
import { listClientOptions } from "@/server/repositories/clients";
import {
  findFollowup,
  insertFollowup,
  listFollowupsByStatus,
  updateFollowupStatus,
} from "@/server/repositories/followups";
import type { FollowupItem, FollowupStatus } from "@/types/domain";
import { FOLLOWUP_MAX_DAYS_AHEAD, type CreateFollowupInput } from "@/validation/followups";
import { assertClientAccess } from "./access";

const FOLLOWUP_NOT_FOUND_MESSAGE = "Follow-up non trovato o non accessibile.";
const RECENTLY_CLOSED_LIMIT = 10;

export type FollowupsOverview = {
  pending: FollowupItem[];
  recentlyClosed: FollowupItem[];
  clientOptions: Array<{ id: string; fullName: string }>;
  today: string;
};

export async function getFollowupsOverview(context: AuthenticatedContext): Promise<FollowupsOverview> {
  const [pending, recentlyClosed, clientOptions] = await Promise.all([
    listFollowupsByStatus(context.db, ["pending"], { column: "due_on", ascending: true }),
    listFollowupsByStatus(context.db, ["completed", "cancelled"], { column: "updated_at", ascending: false }, RECENTLY_CLOSED_LIMIT),
    listClientOptions(context.db),
  ]);
  return { pending, recentlyClosed, clientOptions, today: calendarDateIn(getServerEnv().APP_TIMEZONE) };
}

function assertDueDateInWindow(dueOn: string, today: string): void {
  const daysAhead = daysBetween(today, dueOn);
  if (daysAhead < 0) {
    throw new ValidationError({ dueOn: ["La data non può essere nel passato."] });
  }
  if (daysAhead > FOLLOWUP_MAX_DAYS_AHEAD) {
    throw new ValidationError({ dueOn: [`Scegli una data entro il ${addDays(today, FOLLOWUP_MAX_DAYS_AHEAD)}.`] });
  }
}

/**
 * Crea un follow-up. Se nasce da una proposta AI, la proposta deve appartenere alla stessa
 * cliente ed essere ancora in attesa: la creazione registra la decisione "accettata" della coach.
 */
export async function createFollowup(context: AuthenticatedContext, input: CreateFollowupInput): Promise<string> {
  const clientId = await assertClientAccess(context, input.clientId);
  const today = calendarDateIn(getServerEnv().APP_TIMEZONE);
  assertDueDateInWindow(input.dueOn, today);

  if (input.aiAnalysisId) {
    const analysis = await findAnalysis(context.db, input.aiAnalysisId);
    if (!analysis || analysis.clientId !== clientId) {
      throw new NotFoundError("La proposta AI collegata non è stata trovata.");
    }
    if (analysis.followupDecision !== "pending") {
      throw new ValidationError({}, "Questa proposta AI è già stata gestita.");
    }
  }

  const followupId = await insertFollowup(context.db, {
    clientId,
    coachId: context.coach.id,
    title: input.title,
    description: input.description,
    dueOn: input.dueOn,
    aiAnalysisId: input.aiAnalysisId,
  });

  if (input.aiAnalysisId) {
    await recordFollowupDecision(context.db, input.aiAnalysisId, "accepted");
  }

  logger.info("followups.created", {
    followupId,
    clientId,
    source: input.aiAnalysisId ? "ai_suggestion" : "manual",
  });
  return followupId;
}

export async function changeFollowupStatus(
  context: AuthenticatedContext,
  followupId: string,
  status: FollowupStatus,
): Promise<void> {
  const followup = await findFollowup(context.db, followupId);
  if (!followup) {
    throw new NotFoundError(FOLLOWUP_NOT_FOUND_MESSAGE);
  }
  await assertClientAccess(context, followup.clientId);

  const updated = await updateFollowupStatus(context.db, followupId, status);
  if (!updated) {
    throw new NotFoundError(FOLLOWUP_NOT_FOUND_MESSAGE);
  }
  logger.info("followups.status_changed", { followupId, status });
}
