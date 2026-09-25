import "server-only";
import { cache } from "react";
import { buildAttentionList, CHECKIN_REVIEW_LATE_AFTER_HOURS, type AttentionItem } from "@/domain/attention";
import {
  activeClientsPerDay,
  countPerDay,
  GROWTH_WINDOW_DAYS,
  growthPercent,
  lastDays,
  sumSeries,
  TREND_DAYS,
} from "@/domain/dashboard-trends";
import { addDays, calendarDateIn, hourIn } from "@/domain/dates";
import { DASHBOARD_UPCOMING_DAYS, groupPendingFollowups, type PendingFollowupGroups } from "@/domain/followups";
import { firstNameOf, greetingForHour } from "@/domain/greeting";
import { isAdminRole } from "@/domain/roles";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { countPendingReview, listCheckinTimesSince, listRecentCheckins } from "@/server/repositories/checkins";
import { countPendingRegistrations } from "@/server/repositories/client-accounts";
import { listClientOverviews } from "@/server/repositories/clients";
import {
  countDueFollowups,
  listFollowupDueDatesBetween,
  listPendingFollowupsDueBy,
} from "@/server/repositories/followups";
import type { CheckinWithClient, ClientStatus } from "@/types/domain";

const RECENT_CHECKINS_LIMIT = 6;
/** "Questa settimana" nel briefing: gli ultimi 7 giorni, oggi compreso. */
const RECENT_CHECKIN_DAYS = 7;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

const ACTIVE_STATUSES: ReadonlySet<ClientStatus> = new Set(["active", "onboarding"]);

export type DashboardMetrics = {
  activeClients: number;
  totalClients: number;
  pendingReview: number;
  lateReview: number;
  followupsToday: number;
  followupsOverdue: number;
  priorityItems: number;
  /** Clienti attive con un check-in negli ultimi 7 giorni (continuità, nel briefing). */
  activeWithRecentCheckin: number;
};

/** Linee di andamento delle KPI: un valore per giorno, dal più vecchio (vedi domain/dashboard-trends). */
export type DashboardTrends = {
  activeClients: number[];
  checkins: number[];
  followups: number[];
  /** Check-in ricevuti + follow-up in scadenza: il carico di lavoro giorno per giorno. */
  workload: number[];
  /** Crescita delle clienti attive negli ultimi 30 giorni; null se non c'è una base di confronto. */
  activeClientsGrowthPercent: number | null;
};

export type DashboardData = {
  greeting: string;
  coachFirstName: string;
  today: string;
  timezone: string;
  metrics: DashboardMetrics;
  trends: DashboardTrends;
  attention: AttentionItem[];
  recentCheckins: CheckinWithClient[];
  followups: PendingFollowupGroups;
};

export async function getDashboard(context: AuthenticatedContext, now = new Date()): Promise<DashboardData> {
  const { APP_TIMEZONE: timezone } = getServerEnv();
  const today = calendarDateIn(timezone, now);
  const trendDays = lastDays(today, TREND_DAYS);
  const lateReviewThreshold = new Date(
    now.getTime() - CHECKIN_REVIEW_LATE_AFTER_HOURS * MILLISECONDS_PER_HOUR,
  ).toISOString();
  // Un giorno in più di margine: il fuso della coach può spostare i primi check-in al giorno prima.
  const trendStart = new Date(now.getTime() - (TREND_DAYS + 1) * MILLISECONDS_PER_DAY).toISOString();

  // Query indipendenti in parallelo: nessun waterfall.
  const [clients, recentCheckins, pendingReview, lateReview, pendingFollowups, checkinTimes, followupDueDates] =
    await Promise.all([
      listClientOverviews(context.db),
      listRecentCheckins(context.db, { limit: RECENT_CHECKINS_LIMIT }),
      countPendingReview(context.db),
      countPendingReview(context.db, lateReviewThreshold),
      listPendingFollowupsDueBy(context.db, addDays(today, DASHBOARD_UPCOMING_DAYS)),
      listCheckinTimesSince(context.db, trendStart),
      listFollowupDueDatesBetween(context.db, trendDays[0], today),
    ]);

  const attention = buildAttentionList(clients, { now, timezone });
  const followups = groupPendingFollowups(pendingFollowups, today);
  const activeClients = clients.filter((client) => ACTIVE_STATUSES.has(client.status));
  const activeStartDays = activeClients.map((client) => client.startedOn);
  const checkinsPerDay = countPerDay(
    checkinTimes.map((instant) => calendarDateIn(timezone, instant)),
    trendDays,
  );
  const followupsPerDay = countPerDay(followupDueDates, trendDays);
  const weekStart = addDays(today, -(RECENT_CHECKIN_DAYS - 1));

  return {
    greeting: greetingForHour(hourIn(timezone, now)),
    coachFirstName: firstNameOf(context.coach.fullName),
    today,
    timezone,
    metrics: {
      activeClients: activeClients.length,
      totalClients: clients.length,
      pendingReview,
      lateReview,
      followupsToday: followups.today.length,
      followupsOverdue: followups.overdue.length,
      priorityItems: attention.filter((item) => item.priority === "high").length,
      activeWithRecentCheckin: activeClients.filter(
        (client) => client.lastCheckinAt && calendarDateIn(timezone, client.lastCheckinAt) >= weekStart,
      ).length,
    },
    trends: {
      activeClients: activeClientsPerDay(activeStartDays, trendDays),
      checkins: checkinsPerDay,
      followups: followupsPerDay,
      workload: sumSeries(checkinsPerDay, followupsPerDay),
      activeClientsGrowthPercent: growthPercent(activeStartDays, today, GROWTH_WINDOW_DAYS),
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
