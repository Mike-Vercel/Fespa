import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ClientStatusBadge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/text-link";
import { dueBucketOf } from "@/domain/followups";
import { capitalize, formatCalendarDate, formatRelativeDay, formatRelativeInstant } from "@/lib/format";
import type { ClientListItem } from "@/types/domain";
import { ClientAccountStatus } from "./client-account-status";

type ClientHeaderProps = {
  client: ClientListItem;
  now: Date;
  today: string;
  timezone: string;
  actions: ReactNode;
  /** Strumenti dell'amministrazione (es. coach assegnate), assenti per le coach. */
  adminTools?: ReactNode;
};

export function ClientHeader({ client, now, today, timezone, actions, adminTools }: ClientHeaderProps) {
  const nextFollowupOverdue = client.nextFollowupOn ? dueBucketOf(client.nextFollowupOn, today) === "overdue" : false;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/clients" className="self-start">
        Tutte le clienti
      </BackLink>

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={client.fullName} size="lg" className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-serif text-[30px] leading-[1.15] tracking-[-0.01em] text-ink sm:text-[34px]">
                {client.fullName}
              </h1>
              <ClientStatusBadge status={client.status} />
            </div>

            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
              <div className="flex gap-1.5">
                <dt className="text-ink-3">In percorso dal</dt>
                <dd className="text-ink">{formatCalendarDate(client.startedOn, { withYear: true })}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">Ultimo check-in</dt>
                <dd className="text-ink">
                  {client.lastCheckinAt ? formatRelativeInstant(client.lastCheckinAt, now, timezone) : "nessuno"}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">Prossimo follow-up</dt>
                <dd className={nextFollowupOverdue ? "font-medium text-rust" : "text-ink"}>
                  {client.nextFollowupOn
                    ? `${nextFollowupOverdue ? "scaduto · " : ""}${formatRelativeDay(client.nextFollowupOn, today)}`
                    : "nessuno"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <ClientAccountStatus client={client} />
              {adminTools}
            </div>

            {client.goal ? (
              <p className="mt-3 max-w-2xl text-[15px] text-pretty text-ink-2">
                <span className="text-ink-3">Obiettivo · </span>
                {capitalize(client.goal)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      </header>
    </div>
  );
}
