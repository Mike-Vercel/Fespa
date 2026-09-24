import Link from "next/link";
import { CalendarClock, Flag, Inbox, UsersRound, type LucideIcon } from "lucide-react";
import { pluralize } from "@/lib/format";
import type { DashboardMetrics } from "@/server/services/dashboard";

type Metric = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  href: string;
  tone: "accent" | "sky" | "amber" | "rust";
  /** Evidenzia il suggerimento quando segnala qualcosa da fare subito. */
  hintIsUrgent: boolean;
};

function buildMetrics(metrics: DashboardMetrics): Metric[] {
  return [
    {
      icon: UsersRound,
      label: "Clienti attive",
      value: metrics.activeClients,
      hint: `su ${pluralize(metrics.totalClients, "cliente", "clienti")} in carico`,
      href: "/clients",
      tone: "accent",
      hintIsUrgent: false,
    },
    {
      icon: Inbox,
      label: "Check-in da revisionare",
      value: metrics.pendingReview,
      hint: metrics.lateReview > 0 ? `${metrics.lateReview} in attesa da oltre 48 ore` : "Nessuno in ritardo",
      href: "/checkins",
      tone: "sky",
      hintIsUrgent: metrics.lateReview > 0,
    },
    {
      icon: CalendarClock,
      label: "Follow-up oggi",
      value: metrics.followupsToday,
      hint:
        metrics.followupsOverdue > 0
          ? `${pluralize(metrics.followupsOverdue, "scaduto", "scaduti")} da recuperare`
          : "Nessuno scaduto",
      href: "/followups",
      tone: "amber",
      hintIsUrgent: metrics.followupsOverdue > 0,
    },
    {
      icon: Flag,
      label: "Attività prioritarie",
      value: metrics.priorityItems,
      hint: metrics.priorityItems > 0 ? "richiedono attenzione oggi" : "Nessuna urgenza",
      href: "#da-controllare",
      tone: "rust",
      hintIsUrgent: false,
    },
  ];
}

/**
 * Quattro numeri chiave, leggibili in un colpo d'occhio: una striscia, non quattro card.
 * I separatori sono il colore di fondo visibile nel gap di 1px tra le celle (2×2 su mobile, 1×4 su desktop).
 */
export function MetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section aria-label="Riepilogo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {buildMetrics(metrics).map((metric) => (
        <Link
          key={metric.label}
          href={metric.href}
          className={`group flex min-h-[148px] flex-col gap-2 rounded-lg border border-line border-t-4 bg-surface px-4 py-4 shadow-raised transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-hover hover:shadow-popover sm:px-5 ${
            metric.tone === "accent"
              ? "border-t-accent"
              : metric.tone === "sky"
                ? "border-t-sky"
                : metric.tone === "amber"
                  ? "border-t-amber"
                  : "border-t-rust"
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-ink-2">{metric.label}</span>
            <metric.icon aria-hidden="true" className="size-[18px] text-ink-3 transition-colors group-hover:text-ink" strokeWidth={1.8} />
          </span>
          <span className="tabular font-serif text-[40px] leading-none tracking-[-0.02em] text-ink">{metric.value}</span>
          <span className={metric.hintIsUrgent ? "text-xs font-medium text-rust" : "text-xs text-ink-3"}>
            {metric.hint}
          </span>
        </Link>
      ))}
    </section>
  );
}
