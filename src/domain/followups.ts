import type { FollowupItem } from "@/types/domain";
import { daysBetween } from "./dates";

export type DueBucket = "overdue" | "today" | "upcoming";

export function dueBucketOf(dueOn: string, today: string): DueBucket {
  const days = daysBetween(today, dueOn);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return "upcoming";
}

export type PendingFollowupGroups = Record<DueBucket, FollowupItem[]>;

/**
 * Riquadro "Prossimi follow-up" della dashboard: oltre a scaduti e di oggi, solo i prossimi giorni
 * e al massimo pochi per gruppo, così resta compatto. La lista completa è nella pagina Follow-up.
 */
export const DASHBOARD_UPCOMING_DAYS = 3;
export const DASHBOARD_FOLLOWUPS_PER_GROUP = 3;

/** Conteggio di un gruppo mostrato solo in parte: oltre il massimo diventa "3+". */
export function cappedCountLabel(count: number, max: number): string {
  return count > max ? `${max}+` : String(count);
}

/** Divide i follow-up in attesa in scaduti / oggi / prossimi, ordinati per scadenza. */
export function groupPendingFollowups(followups: FollowupItem[], today: string): PendingFollowupGroups {
  const groups: PendingFollowupGroups = { overdue: [], today: [], upcoming: [] };
  const pending = followups
    .filter((followup) => followup.status === "pending")
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  for (const followup of pending) {
    groups[dueBucketOf(followup.dueOn, today)].push(followup);
  }
  return groups;
}
