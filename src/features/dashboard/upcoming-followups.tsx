import { CalendarCheck2 } from "lucide-react";
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

const GROUPS: Array<{ bucket: DueBucket; title: string }> = [
  { bucket: "overdue", title: "Scaduti" },
  { bucket: "today", title: "Oggi" },
  { bucket: "upcoming", title: `Prossimi ${DASHBOARD_UPCOMING_DAYS} giorni` },
];

export function UpcomingFollowups({ groups, today }: { groups: PendingFollowupGroups; today: string }) {
  const hasAny = GROUPS.some(({ bucket }) => groups[bucket].length > 0);
  if (!hasAny) {
    return (
      <EmptyState
        icon={CalendarCheck2}
        title="Nessun follow-up in programma"
        description="Puoi crearne uno dalla scheda di una cliente o dalla pagina Follow-up."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      {GROUPS.filter(({ bucket }) => groups[bucket].length > 0).map(({ bucket, title }) => (
        <section key={bucket} aria-label={title}>
          <h3 className={bucket === "overdue" ? "text-xs font-semibold uppercase tracking-[0.12em] text-rust" : "text-xs font-semibold uppercase tracking-[0.12em] text-ink-3"}>
            {title}{" "}
            <span className="tabular font-normal">· {cappedCountLabel(groups[bucket].length, DASHBOARD_FOLLOWUPS_PER_GROUP)}</span>
          </h3>
          {/* I primi per scadenza; tutti gli altri sono nella pagina Follow-up ("Tutti"). */}
          <ul className="divide-y divide-line">
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
  );
}
