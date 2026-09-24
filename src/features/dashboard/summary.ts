import { pluralize } from "@/lib/format";
import type { DashboardMetrics } from "@/server/services/dashboard";

/** Frase di contesto sotto il saluto: cosa c'è da fare oggi, in linguaggio naturale. */
export function dashboardSummary(metrics: DashboardMetrics): string {
  const tasks: string[] = [];
  if (metrics.pendingReview > 0) {
    tasks.push(`${pluralize(metrics.pendingReview, "check-in", "check-in")} da revisionare`);
  }
  if (metrics.followupsToday > 0) {
    tasks.push(`${pluralize(metrics.followupsToday, "follow-up", "follow-up")} in programma`);
  }
  if (metrics.followupsOverdue > 0) {
    tasks.push(`${pluralize(metrics.followupsOverdue, "follow-up scaduto", "follow-up scaduti")} da recuperare`);
  }

  if (tasks.length === 0) {
    return "Nessuna attività urgente: è un buon momento per rivedere lo storico delle tue clienti.";
  }

  const list = tasks.length === 1 ? tasks[0] : `${tasks.slice(0, -1).join(", ")} e ${tasks[tasks.length - 1]}`;
  return `Oggi hai ${list}.`;
}
