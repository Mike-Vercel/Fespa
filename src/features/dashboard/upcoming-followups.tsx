import { ArrowRight, CalendarCheck2, CalendarDays } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import {
  cappedCountLabel,
  DASHBOARD_FOLLOWUPS_PER_GROUP,
  DASHBOARD_UPCOMING_DAYS,
  type DueBucket,
  type PendingFollowupGroups,
} from "@/domain/followups";
import { CompleteFollowupButton } from "@/features/followups/followup-actions";
import { FollowupRow } from "@/features/followups/followup-row";
import { cn } from "@/lib/cn";

const GROUPS: Array<{ bucket: DueBucket; title: string; tone: string }> = [
  { bucket: "overdue", title: "Scaduti", tone: "text-urgent" },
  { bucket: "today", title: "Oggi", tone: "text-ink-2" },
  { bucket: "upcoming", title: `Prossimi ${DASHBOARD_UPCOMING_DAYS} giorni`, tone: "text-ink-3" },
];

type UpcomingFollowupsProps = {
  groups: PendingFollowupGroups;
  today: string;
  className?: string;
};

/** "Prossimi follow-up": scaduti, di oggi e dei prossimi giorni, al massimo pochi per gruppo. */
export function UpcomingFollowups({ groups, today, className }: UpcomingFollowupsProps) {
  const visibleGroups = GROUPS.filter(({ bucket }) => groups[bucket].length > 0);

  return (
    <section
      aria-labelledby="prossimi-followup"
      className={cn("rounded-2xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.2)]", className)}
    >
      <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-kpi-blue text-kpi-blue-ink">
            <CalendarDays className="size-5" strokeWidth={1.7} />
          </span>
          <h2 id="prossimi-followup" className="font-serif text-[24px] leading-tight text-ink">
            Prossimi follow-up
          </h2>
        </div>
        <Link
          href="/followups"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-sm text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          Tutti
          <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="px-5 pb-4 sm:px-6">
        {visibleGroups.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Nessun follow-up in programma"
            description="Puoi crearne uno dalla scheda di una cliente o dalla pagina Follow-up."
          />
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            {visibleGroups.map(({ bucket, title, tone }) => (
              <section key={bucket} aria-label={title}>
                <h3 className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", tone)}>
                  {title}{" "}
                  <span className="tabular">· {cappedCountLabel(groups[bucket].length, DASHBOARD_FOLLOWUPS_PER_GROUP)}</span>
                </h3>
                {/* I primi per scadenza; tutti gli altri sono nella pagina Follow-up ("Tutti"). */}
                <ul className="divide-y divide-line/80">
                  {groups[bucket].slice(0, DASHBOARD_FOLLOWUPS_PER_GROUP).map((followup) => (
                    <li key={followup.id}>
                      <FollowupRow
                        followup={followup}
                        today={today}
                        action={<CompleteFollowupButton followupId={followup.id} title={followup.title} />}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
