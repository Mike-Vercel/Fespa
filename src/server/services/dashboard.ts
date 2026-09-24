import "server-only";
import { cache } from "react";
import { buildAttentionList, CHECKIN_REVIEW_LATE_AFTER_HOURS, type AttentionItem } from "@/domain/attention";
import { addDays, calendarDateIn, hourIn } from "@/domain/dates";
import { groupPendingFollowups, type PendingFollowupGroups } from "@/domain/followups";
import { firstNameOf, greetingForHour } from "@/domain/greeting";
import { isAdminRole } from "@/domain/roles";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { countPendingReview, listRecentCheckins } from "@/server/repositories/checkins";
import { countPendingRegistrations } from "@/server/repositories/client-accounts";
import { listClientOverviews } from "@/server/repositories/clients";
import { countDueFollowups, listPendingFollowupsDueBy } from "@/server/repositories/followups";
import type { CheckinWithClient, ClientStatus } from "@/types/domain";

const RECENT_CHECKINS_LIMIT = 6;
/** "Prossimi follow-up" mostra la settimana successiva, oltre a scaduti e di oggi. */
const UPCOMING_FOLLOWUP_DAYS = 7;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

const ACTIVE_STATUSES: ReadonlySet<ClientStatus> = new Set(["active", "onboarding"]);

export type DashboardMetrics = {
  activeClients: number;
  totalClients: number;
  pendingReview: number;
  lateReview: number;
  followupsToday: number;
  followupsOverdue: number;
  priorityItems: number;
};

export type DashboardData = {
  greeting: string;
  coachFirstName: string;
  today: string;
  timezone: string;
  metrics: DashboardMetrics;
  attention: AttentionItem[];
  recentCheckins: CheckinWithClient[];
  followups: PendingFollowupGroups;
};

export async function getDashboard(context: AuthenticatedContext, now = new Date()): Promise<DashboardData> {
  const { APP_TIMEZONE: timezone } = getServerEnv();
  const today = calendarDateIn(timezone, now);
  const lateReviewThreshold = new Date(
    now.getTime() - CHECKIN_REVIEW_LATE_AFTER_HOURS * MILLISECONDS_PER_HOUR,
  ).toISOString();

  // Query indipendenti in parallelo: nessun waterfall.
  const [clients, recentCheckins, pendingReview, lateReview, pendingFollowups] = await Promise.all([
    listClientOverviews(context.db),
    listRecentCheckins(context.db, { limit: RECENT_CHECKINS_LIMIT }),
    countPendingReview(context.db),
    countPendingReview(context.db, lateReviewThreshold),
    listPendingFollowupsDueBy(context.db, addDays(today, UPCOMING_FOLLOWUP_DAYS)),
  ]);

  const attention = buildAttentionList(clients, { now, timezone });
  const followups = groupPendingFollowups(pendingFollowups, today);

  return {
    greeting: greetingForHour(hourIn(timezone, now)),
    coachFirstName: firstNameOf(context.coach.fullName),
    today,
    timezone,
    metrics: {
      activeClients: clients.filter((client) => ACTIVE_STATUSES.has(client.status)).length,
      totalClients: clients.length,
      pendingReview,
      lateReview,
      followupsToday: followups.today.length,
      followupsOverdue: followups.overdue.length,
      priorityItems: attention.filter((item) => item.priority === "high").length,
    },
    attention,
    recentCheckins,
    followups,
  };
}

export type NavigationCounts = {
  pendingCheckins: number;
  dueFollowups: number;
  /** Solo per l'admin; 0 per le coach. */
  pendingRegistrations: number;
};

/** Contatori della sidebar (una sola volta per richiesta, anche se usati in più punti). */
export const getNavigationCounts = cache(async (context: AuthenticatedContext): Promise<NavigationCounts> => {
  const today = calendarDateIn(getServerEnv().APP_TIMEZONE);
  const [pendingCheckins, dueFollowups, pendingRegistrations] = await Promise.all([
    countPendingReview(context.db),
    countDueFollowups(context.db, today),
    isAdminRole(context.coach.role) ? countPendingRegistrations(context.db) : 0,
  ]);
  return { pendingCheckins, dueFollowups, pendingRegistrations };
});
