import { CheckCheck, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/states";
import { CheckinList } from "@/features/checkins/checkin-list";
import { MarkReviewedButton } from "@/features/checkins/mark-reviewed-button";
import { cn } from "@/lib/cn";
import { requireCoach } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { listCheckinInbox } from "@/server/services/checkins";
import { firstParam } from "@/validation/common";

export const metadata: Metadata = { title: "Check-in" };

const FILTERS = [
  { value: "pending", label: "Da revisionare", href: "/checkins" },
  { value: "all", label: "Tutti", href: "/checkins?filter=all" },
] as const;

export default async function CheckinsPage({ searchParams }: PageProps<"/checkins">) {
  const context = await requireCoach();
  const filter = firstParam((await searchParams).filter) === "all" ? "all" : "pending";
  const now = new Date();
  const checkins = await listCheckinInbox(context, filter);
  const { APP_TIMEZONE: timezone } = getServerEnv();

  return (
    <div className="flex flex-col gap-7 animate-rise-in">
      <PageHeader
        title="Check-in"
        description="I check-in inviati dalle tue clienti. Segnali come revisionati quando li hai letti e gestiti."
      />

      <section aria-label="Inbox check-in" className="overflow-hidden rounded-lg border border-line bg-surface shadow-raised">
        <div className="flex flex-col gap-3 border-b border-line bg-sunken px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm font-medium text-ink-2">
            {checkins.length} {checkins.length === 1 ? "check-in" : "check-in"} visualizzati
          </p>
          <nav aria-label="Filtra i check-in" className="flex gap-1">
            {FILTERS.map((option) => {
              const isActive = option.value === filter;
              return (
                <Link
                  key={option.value}
                  href={option.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors",
                    isActive ? "bg-accent text-on-ink shadow-sm" : "text-ink-2 ring-1 ring-inset ring-line hover:bg-hover hover:text-ink",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {checkins.length > 0 ? (
          <div className="px-4 sm:px-5">
            <CheckinList
              checkins={checkins}
              now={now}
              timezone={timezone}
              renderAction={(checkin) => (checkin.reviewedAt ? null : <MarkReviewedButton checkinId={checkin.id} />)}
            />
          </div>
        ) : filter === "pending" ? (
          <EmptyState
            icon={CheckCheck}
            title="Nessun check-in da revisionare"
            description="Hai già letto e gestito tutti i check-in ricevuti."
          />
        ) : (
          <EmptyState icon={Inbox} title="Nessun check-in ricevuto" description="Quando le clienti invieranno i loro check-in, li troverai qui." />
        )}
      </section>
    </div>
  );
}
