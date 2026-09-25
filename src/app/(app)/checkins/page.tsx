import { CheckCheck, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/states";
import { CheckinList } from "@/features/checkins/checkin-list";
import { MarkReviewedButton } from "@/features/checkins/mark-reviewed-button";
import { cn } from "@/lib/cn";
import { requireCoach } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getCheckinInbox } from "@/server/services/checkins";
import { firstParam } from "@/validation/common";

export const metadata: Metadata = { title: "Check-in" };

const FILTERS = [
  { value: "pending", label: "Da revisionare", href: "/checkins" },
  { value: "all", label: "Tutti", href: "/checkins?filter=all" },
] as const;

/** Lo stesso pannello di Dashboard e Clienti: bianco caldo, bordo sottile, ombra appena accennata. */
const PANEL =
  "overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.2)]";

export default async function CheckinsPage({ searchParams }: PageProps<"/checkins">) {
  const context = await requireCoach();
  const filter = firstParam((await searchParams).filter) === "all" ? "all" : "pending";
  const now = new Date();
  const { checkins, pendingCount } = await getCheckinInbox(context, filter);
  const { APP_TIMEZONE: timezone } = getServerEnv();
  const summary =
    filter === "pending"
      ? `${pendingCount} check-in da visualizzare`
      : `Ultimi ${checkins.length} check-in · ${pendingCount} da revisionare`;

  return (
    <>
      <PageAtmosphere variant="soft" />

      <div className="flex flex-col gap-7 animate-rise-in">
        <PageHeader
          variant="display"
          title="Check-in"
          description="I check-in inviati dalle tue clienti. Segnali come revisionati quando li hai letti e gestiti."
        />

        <section aria-label="Inbox check-in" className={PANEL}>
          <div className="flex flex-col gap-3 border-b border-line/80 bg-[color-mix(in_srgb,var(--color-sunken)_55%,var(--color-surface))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <p className="text-[15px] font-medium text-ink">{summary}</p>
            <nav aria-label="Filtra i check-in" className="flex gap-2">
              {FILTERS.map((option) => {
                const isActive = option.value === filter;
                return (
                  <Link
                    key={option.value}
                    href={option.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors",
                      isActive
                        ? "bg-accent text-white shadow-[0_2px_6px_-2px_rgb(60_86_56/0.45)]"
                        : "bg-surface text-ink ring-1 ring-inset ring-line hover:bg-sunken",
                    )}
                  >
                    {isActive ? <span aria-hidden="true" className="size-1.5 rounded-full bg-white/85" /> : null}
                    {option.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {checkins.length > 0 ? (
            <div className="px-5 lg:px-6">
              <CheckinList
                checkins={checkins}
                now={now}
                timezone={timezone}
                renderAction={(checkin) => (checkin.reviewedAt ? null : <MarkReviewedButton checkinId={checkin.id} size="md" />)}
              />
            </div>
          ) : filter === "pending" ? (
            <EmptyState icon={CheckCheck} title="Tutto revisionato" description="Non ci sono check-in in attesa." />
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
