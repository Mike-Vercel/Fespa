import type { ClientListItem, ClientStatus } from "@/types/domain";
import { calendarDateIn, daysBetween, hoursBetween } from "./dates";

/**
 * Regole di "Da controllare oggi": quali clienti richiedono attenzione e perché.
 * Logica pura e deterministica (riceve "adesso" dall'esterno) → facile da testare.
 */

/** Un check-in in attesa da più di così è considerato in ritardo. */
export const CHECKIN_REVIEW_LATE_AFTER_HOURS = 48;
/** Una cliente attiva senza check-in da più giorni di così va ricontattata. */
export const MAX_DAYS_WITHOUT_CHECKIN = 14;

export type AttentionPriority = "high" | "medium" | "low";

export type AttentionReason =
  | { kind: "followup_overdue"; daysOverdue: number }
  | { kind: "checkin_review_late"; hoursWaiting: number }
  | { kind: "checkin_to_review"; count: number }
  | { kind: "no_recent_checkin"; daysSinceLastCheckin: number | null }
  | { kind: "ai_suggestion_pending"; count: number }
  | { kind: "followup_today" };

export type AttentionItem = {
  clientId: string;
  clientName: string;
  clientStatus: ClientStatus;
  priority: AttentionPriority;
  reasons: AttentionReason[];
};

const PRIORITY_OF: Record<AttentionReason["kind"], AttentionPriority> = {
  followup_overdue: "high",
  checkin_review_late: "high",
  checkin_to_review: "medium",
  no_recent_checkin: "medium",
  ai_suggestion_pending: "medium",
  followup_today: "low",
};

const PRIORITY_RANK: Record<AttentionPriority, number> = { high: 0, medium: 1, low: 2 };

const STATUSES_EXPECTING_CHECKINS: ReadonlySet<ClientStatus> = new Set(["active", "onboarding"]);

type AttentionContext = { now: Date; timezone: string };

export function attentionReasonsFor(client: ClientListItem, { now, timezone }: AttentionContext): AttentionReason[] {
  const today = calendarDateIn(timezone, now);
  const reasons: AttentionReason[] = [];

  if (client.nextFollowupOn) {
    const daysUntilDue = daysBetween(today, client.nextFollowupOn);
    if (daysUntilDue < 0) reasons.push({ kind: "followup_overdue", daysOverdue: -daysUntilDue });
    if (daysUntilDue === 0) reasons.push({ kind: "followup_today" });
  }

  if (client.pendingReviewCount > 0 && client.oldestPendingReviewAt) {
    const hoursWaiting = hoursBetween(client.oldestPendingReviewAt, now);
    if (hoursWaiting >= CHECKIN_REVIEW_LATE_AFTER_HOURS) {
      reasons.push({ kind: "checkin_review_late", hoursWaiting: Math.floor(hoursWaiting) });
    } else {
      reasons.push({ kind: "checkin_to_review", count: client.pendingReviewCount });
    }
  }

  if (STATUSES_EXPECTING_CHECKINS.has(client.status)) {
    const lastCheckinDay = client.lastCheckinAt ? calendarDateIn(timezone, client.lastCheckinAt) : null;
    const daysSinceLastCheckin = lastCheckinDay ? daysBetween(lastCheckinDay, today) : null;
    const daysSinceStart = daysBetween(client.startedOn, today);
    const isSilent =
      daysSinceLastCheckin === null
        ? daysSinceStart > MAX_DAYS_WITHOUT_CHECKIN
        : daysSinceLastCheckin > MAX_DAYS_WITHOUT_CHECKIN;
    if (isSilent) reasons.push({ kind: "no_recent_checkin", daysSinceLastCheckin });
  }

  if (client.pendingAiSuggestionCount > 0) {
    reasons.push({ kind: "ai_suggestion_pending", count: client.pendingAiSuggestionCount });
  }

  return reasons;
}

function highestPriority(reasons: AttentionReason[]): AttentionPriority {
  return reasons
    .map((reason) => PRIORITY_OF[reason.kind])
    .reduce((best, current) => (PRIORITY_RANK[current] < PRIORITY_RANK[best] ? current : best));
}

/** Clienti che richiedono attenzione, dalla più urgente. A parità di urgenza: più motivi prima. */
export function buildAttentionList(clients: ClientListItem[], context: AttentionContext): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const client of clients) {
    const reasons = attentionReasonsFor(client, context);
    if (reasons.length === 0) continue;

    reasons.sort((a, b) => PRIORITY_RANK[PRIORITY_OF[a.kind]] - PRIORITY_RANK[PRIORITY_OF[b.kind]]);
    items.push({
      clientId: client.id,
      clientName: client.fullName,
      clientStatus: client.status,
      priority: highestPriority(reasons),
      reasons,
    });
  }

  return items.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.reasons.length - a.reasons.length ||
      a.clientName.localeCompare(b.clientName, "it"),
  );
}

/** Testo breve e leggibile per ogni motivo, mostrato nella dashboard. */
export function describeAttentionReason(reason: AttentionReason): string {
  switch (reason.kind) {
    case "followup_overdue":
      return reason.daysOverdue === 1 ? "Follow-up scaduto ieri" : `Follow-up scaduto da ${reason.daysOverdue} giorni`;
    case "checkin_review_late":
      return `Check-in in attesa da ${Math.floor(reason.hoursWaiting / 24)} giorni`;
    case "checkin_to_review":
      return reason.count === 1 ? "Check-in da revisionare" : `${reason.count} check-in da revisionare`;
    case "no_recent_checkin":
      return reason.daysSinceLastCheckin === null
        ? "Nessun check-in dall'inizio del percorso"
        : `Nessun check-in da ${reason.daysSinceLastCheckin} giorni`;
    case "ai_suggestion_pending":
      return reason.count === 1 ? "Proposta AI da valutare" : `${reason.count} proposte AI da valutare`;
    case "followup_today":
      return "Follow-up in programma oggi";
  }
}
