import { ArrowRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
import { TOPBAR_DATE_ID } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/states";
import { CheckinList } from "@/features/checkins/checkin-list";
import { dailyBriefing } from "@/features/dashboard/briefing";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { DashboardWelcome } from "@/features/dashboard/dashboard-welcome";
import { KpiGrid } from "@/features/dashboard/kpi-grid";
import { PriorityPanel } from "@/features/dashboard/priority-panel";
import { dashboardSummary } from "@/features/dashboard/summary";
import { UpcomingFollowups } from "@/features/dashboard/upcoming-followups";
import { WELCOME_SEEN_COOKIE } from "@/features/dashboard/welcome-cookie";
import { formatLongDate } from "@/lib/format";
import { requireCoach } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const HEADER_ID = "dashboard-intestazione";

export default async function DashboardPage() {
  const context = await requireCoach();
  const now = new Date();
  const [dashboard, cookieStore] = await Promise.all([getDashboard(context, now), cookies()]);
  const showWelcome = !cookieStore.has(WELCOME_SEEN_COOKIE);
  const { metrics } = dashboard;

  return (
    <>
      <PageAtmosphere />

      {/* Fuori dal contenitore animato: un antenato con transform farebbe da riferimento al position: fixed. */}
      {showWelcome ? (
        <DashboardWelcome
          greeting={dashboard.greeting}
          name={dashboard.coachFirstName}
          date={formatLongDate(dashboard.today)}
          targetId={HEADER_ID}
          dateTargetId={TOPBAR_DATE_ID}
        />
      ) : null}

      <div className="flex flex-col gap-5 animate-rise-in">
        <DashboardHeader
          id={HEADER_ID}
          className="dashboard-reveal dashboard-reveal--header"
          greeting={dashboard.greeting}
          name={dashboard.coachFirstName}
          summary={dashboardSummary(metrics)}
          briefing={dailyBriefing({
            urgentClients: metrics.priorityItems,
            followupsToday: metrics.followupsToday,
            activeClients: metrics.activeClients,
            activeWithRecentCheckin: metrics.activeWithRecentCheckin,
          })}
        />

        <div className="dashboard-reveal dashboard-reveal--metrics mt-3 xl:mt-1">
          <KpiGrid metrics={metrics} trends={dashboard.trends} />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <PriorityPanel items={dashboard.attention} className="dashboard-reveal dashboard-reveal--attention" />
          <UpcomingFollowups
            groups={dashboard.followups}
            today={dashboard.today}
            className="dashboard-reveal dashboard-reveal--followups"
          />
        </div>

        <section
          aria-labelledby="checkin-recenti"
          className="dashboard-reveal dashboard-reveal--checkins rounded-2xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.2)]"
        >
          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-kpi-green text-kpi-green-ink">
                <Inbox className="size-5" strokeWidth={1.7} />
              </span>
              <h2 id="checkin-recenti" className="font-serif text-[24px] leading-tight text-ink">
                Check-in recenti
              </h2>
            </div>
            <Link
              href="/checkins"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-sm text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Apri l&apos;inbox
              <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="px-5 pb-4 sm:px-6">
            {dashboard.recentCheckins.length > 0 ? (
              <CheckinList checkins={dashboard.recentCheckins} now={now} timezone={dashboard.timezone} />
            ) : (
              <EmptyState
                icon={Inbox}
                title="Nessun check-in ricevuto"
                description="Quando le clienti invieranno i loro check-in, li troverai qui."
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
