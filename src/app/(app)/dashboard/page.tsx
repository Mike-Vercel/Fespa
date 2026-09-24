import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/states";
import { TextLink } from "@/components/ui/text-link";
import { CheckinList } from "@/features/checkins/checkin-list";
import { AttentionList } from "@/features/dashboard/attention-list";
import { DashboardWelcome } from "@/features/dashboard/dashboard-welcome";
import { MetricStrip } from "@/features/dashboard/metric-strip";
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
  const longDate = formatLongDate(dashboard.today);

  return (
    <>
      {/* Fuori dal contenitore animato: un antenato con transform farebbe da riferimento al position: fixed. */}
      {showWelcome ? (
        <DashboardWelcome
          greeting={dashboard.greeting}
          name={dashboard.coachFirstName}
          date={longDate}
          targetId={HEADER_ID}
        />
      ) : null}

      <div className="flex flex-col gap-10 animate-rise-in">
        <PageHeader
          id={HEADER_ID}
          className="dashboard-reveal dashboard-reveal--header"
          eyebrow={longDate}
          title={`${dashboard.greeting} ${dashboard.coachFirstName}`}
          description={dashboardSummary(dashboard.metrics)}
        />

        <div className="dashboard-reveal dashboard-reveal--metrics">
          <MetricStrip metrics={dashboard.metrics} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          <section aria-labelledby="da-controllare" className="dashboard-reveal dashboard-reveal--attention scroll-mt-24 rounded-lg border border-line bg-surface p-5 shadow-raised sm:p-6 lg:col-span-7">
            <SectionHeader
              id="da-controllare"
              title="Da controllare oggi"
              description="Clienti con attività in sospeso, dalla più urgente"
            />
            <AttentionList items={dashboard.attention} />
          </section>

          <section aria-labelledby="prossimi-followup" className="dashboard-reveal dashboard-reveal--followups rounded-lg border border-line bg-surface p-5 shadow-raised sm:p-6 lg:col-span-5">
            <SectionHeader
              id="prossimi-followup"
              title="Prossimi follow-up"
              action={<TextLink href="/followups">Tutti</TextLink>}
            />
            <UpcomingFollowups groups={dashboard.followups} today={dashboard.today} />
          </section>
        </div>

        <section aria-labelledby="checkin-recenti" className="dashboard-reveal dashboard-reveal--checkins rounded-lg border border-line bg-surface p-5 shadow-raised sm:p-6">
          <SectionHeader
            id="checkin-recenti"
            title="Check-in recenti"
            action={<TextLink href="/checkins">Apri l&apos;inbox</TextLink>}
          />
          {dashboard.recentCheckins.length > 0 ? (
            <CheckinList checkins={dashboard.recentCheckins} now={now} timezone={dashboard.timezone} />
          ) : (
            <EmptyState
              icon={Inbox}
              title="Nessun check-in ricevuto"
              description="Quando le clienti invieranno i loro check-in, li troverai qui."
            />
          )}
        </section>
      </div>
    </>
  );
}
