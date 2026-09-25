import { ArrowUp, CalendarDays, Flag, RefreshCcw, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Sparkline } from "@/components/ui/sparkline";
import { TREND_DAYS } from "@/domain/dashboard-trends";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import type { DashboardMetrics, DashboardTrends } from "@/server/services/dashboard";

type Tone = "green" | "blue" | "orange" | "violet";

/** Card quasi bianche: il colore sta nell'icona, nella linea e in una velatura appena percettibile. */
const TONES: Record<Tone, { card: string; icon: string; line: string }> = {
  green: {
    card: "bg-surface",
    icon: "bg-kpi-green text-kpi-green-ink",
    line: "text-kpi-green-ink/55",
  },
  blue: {
    card: "bg-[color-mix(in_srgb,var(--color-kpi-blue)_38%,var(--color-surface))]",
    icon: "bg-kpi-blue text-kpi-blue-ink",
    line: "text-kpi-blue-ink/55",
  },
  orange: {
    card: "bg-[color-mix(in_srgb,var(--color-kpi-orange)_32%,var(--color-surface))]",
    icon: "bg-kpi-orange text-kpi-orange-ink",
    line: "text-kpi-orange-ink/55",
  },
  violet: {
    card: "bg-[color-mix(in_srgb,var(--color-kpi-violet)_38%,var(--color-surface))]",
    icon: "bg-kpi-violet text-kpi-violet-ink",
    line: "text-kpi-violet-ink/55",
  },
};

type Kpi = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  /** Il suggerimento segnala qualcosa da fare subito (in rosso). */
  hintIsUrgent: boolean;
  href: string;
  tone: Tone;
  trend: number[];
  trendLabel: string;
};

function buildKpis(metrics: DashboardMetrics, trends: DashboardTrends): Kpi[] {
  return [
    {
      icon: UserRound,
      label: "Clienti attive",
      value: metrics.activeClients,
      hint: `su ${pluralize(metrics.totalClients, "cliente", "clienti")} in carico`,
      hintIsUrgent: false,
      href: "/clients",
      tone: "green",
      trend: trends.activeClients,
      trendLabel: `Clienti attive negli ultimi ${TREND_DAYS} giorni`,
    },
    {
      icon: CalendarDays,
      label: "Check-in da revisionare",
      value: metrics.pendingReview,
      hint: metrics.lateReview > 0 ? `${metrics.lateReview} in attesa da oltre 48 ore` : "Nessuno in ritardo",
      hintIsUrgent: metrics.lateReview > 0,
      href: "/checkins",
      tone: "blue",
      trend: trends.checkins,
      trendLabel: `Check-in ricevuti ogni giorno negli ultimi ${TREND_DAYS} giorni`,
    },
    {
      icon: RefreshCcw,
      label: "Follow-up oggi",
      value: metrics.followupsToday,
      hint:
        metrics.followupsOverdue > 0
          ? `${pluralize(metrics.followupsOverdue, "scaduto", "scaduti")} da recuperare`
          : "Nessuno scaduto",
      hintIsUrgent: metrics.followupsOverdue > 0,
      href: "/followups",
      tone: "orange",
      trend: trends.followups,
      trendLabel: `Follow-up in scadenza ogni giorno negli ultimi ${TREND_DAYS} giorni`,
    },
    {
      icon: Flag,
      label: "Attività prioritarie",
      value: metrics.priorityItems,
      hint: metrics.priorityItems > 0 ? "richiedono attenzione oggi" : "Nessuna urgenza",
      hintIsUrgent: false,
      href: "#da-controllare",
      tone: "violet",
      trend: trends.workload,
      trendLabel: `Check-in e follow-up di ogni giorno negli ultimi ${TREND_DAYS} giorni`,
    },
  ];
}

/** Le quattro KPI della dashboard: ogni card porta alla pagina dove si agisce. */
export function KpiGrid({ metrics, trends }: { metrics: DashboardMetrics; trends: DashboardTrends }) {
  const growth = trends.activeClientsGrowthPercent;

  return (
    <section aria-label="Riepilogo" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {buildKpis(metrics, trends).map((kpi) => {
        const tone = TONES[kpi.tone];
        return (
          <Link
            key={kpi.label}
            href={kpi.href}
            className={cn(
              "group flex items-start gap-4 rounded-2xl border border-line/80 px-5 py-6 shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.22)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong/70 hover:shadow-[0_1px_2px_rgb(31_29_26/0.04),0_18px_36px_-22px_rgb(31_29_26/0.3)] 2xl:gap-5 2xl:px-6",
              tone.card,
            )}
          >
            <span aria-hidden="true" className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-full 2xl:size-14", tone.icon)}>
              <kpi.icon className="size-[22px] 2xl:size-6" strokeWidth={1.7} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-start justify-between gap-2">
                <span className="text-[15px] leading-snug text-ink-2">{kpi.label}</span>
                {kpi.tone === "green" && growth !== null && growth > 0 ? (
                  <span
                    title="Crescita delle clienti attive negli ultimi 30 giorni"
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-kpi-green px-2 py-0.5 text-xs font-semibold text-kpi-green-ink"
                  >
                    <ArrowUp aria-hidden="true" className="size-3" strokeWidth={2.5} />
                    <span className="sr-only">Crescita negli ultimi 30 giorni: </span>+{growth}%
                  </span>
                ) : null}
              </span>
              <span className="mt-1 flex items-end justify-between gap-3">
                <span className="tabular font-serif text-[44px] leading-none tracking-[-0.02em] text-ink">{kpi.value}</span>
                <Sparkline values={kpi.trend} label={kpi.trendLabel} className={cn("mb-1.5", tone.line)} />
              </span>
              <span className={cn("mt-2.5 text-[14px] leading-snug", kpi.hintIsUrgent ? "font-medium text-urgent" : "text-ink-3")}>
                {kpi.hint}
              </span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}
