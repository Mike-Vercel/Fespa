import { CalendarCheck2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { FollowupItem } from "@/types/domain";
import { CompleteFollowupButton, FollowupSecondaryAction } from "./followup-actions";
import { FollowupRow } from "./followup-row";
import { NewFollowupDialog } from "./new-followup-dialog";

type ClientFollowupsPanelProps = {
  client: { id: string; fullName: string };
  followups: FollowupItem[];
  today: string;
};

export function ClientFollowupsPanel({ client, followups, today }: ClientFollowupsPanelProps) {
  const pending = followups.filter((followup) => followup.status === "pending");
  const closed = followups
    .filter((followup) => followup.status !== "pending")
    .sort((a, b) => (b.completedAt ?? b.dueOn).localeCompare(a.completedAt ?? a.dueOn));

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section aria-labelledby="followup-pending-title">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <h2 id="followup-pending-title" className="font-serif text-xl text-ink">
            In programma
          </h2>
          <NewFollowupDialog
            today={today}
            client={client}
            trigger={
              <Button variant="primary" size="sm" icon={<Plus aria-hidden="true" className="size-4" strokeWidth={2} />}>
                Nuovo follow-up
              </Button>
            }
          />
        </div>

        {pending.length > 0 ? (
          <ul className="divide-y divide-line">
            {pending.map((followup) => (
              <li key={followup.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FollowupRow
                    followup={followup}
                    today={today}
                    showClient={false}
                    action={<CompleteFollowupButton followupId={followup.id} title={followup.title} />}
                  />
                </div>
                <div className="pt-2.5">
                  <FollowupSecondaryAction followupId={followup.id} status={followup.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarCheck2}
            title="Nessun follow-up in programma"
            description="Crea un promemoria per la prossima azione con questa cliente."
          />
        )}
      </section>

      {closed.length > 0 ? (
        <section aria-labelledby="followup-closed-title">
          <h2 id="followup-closed-title" className="border-b border-line pb-3 font-serif text-xl text-ink">
            Completati e annullati
          </h2>
          <ul className="divide-y divide-line">
            {closed.map((followup) => (
              <li key={followup.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FollowupRow followup={followup} today={today} showClient={false} />
                </div>
                <div className="pt-2.5">
                  <FollowupSecondaryAction followupId={followup.id} status={followup.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
