import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ClientStatusBadge } from "@/components/ui/badge";
import { describeAttentionReason } from "@/domain/attention";
import { dueBucketOf } from "@/domain/followups";
import { cn } from "@/lib/cn";
import { capitalize, formatRelativeDay, formatRelativeInstant } from "@/lib/format";
import type { ClientListRow } from "@/server/services/clients";

type ClientTableProps = {
  rows: ClientListRow[];
  now: Date;
  today: string;
  timezone: string;
  /** Per l'amministrazione: segnala le clienti rimaste senza coach. */
  showCoachWarnings?: boolean;
};

/** Seconda riga sotto il nome: il motivo di attenzione se c'è, altrimenti l'obiettivo. */
function secondaryLine(row: ClientListRow): { text: string; isAttention: boolean } | null {
  const topReason = row.attention?.reasons[0];
  if (topReason) {
    return { text: describeAttentionReason(topReason), isAttention: true };
  }
  return row.goal ? { text: row.goal, isAttention: false } : null;
}

function lastCheckinLabel(row: ClientListRow, now: Date, timezone: string): string {
  return row.lastCheckinAt ? capitalize(formatRelativeInstant(row.lastCheckinAt, now, timezone)) : "Nessuno";
}

function NextFollowup({ dueOn, today }: { dueOn: string | null; today: string }) {
  if (!dueOn) {
    return <span className="text-ink-3">—</span>;
  }
  const isOverdue = dueBucketOf(dueOn, today) === "overdue";
  return (
    <span className={isOverdue ? "font-medium text-rust" : "text-ink"}>
      {isOverdue ? "Scaduto · " : ""}
      {capitalize(formatRelativeDay(dueOn, today))}
    </span>
  );
}

function PendingReview({ count }: { count: number }) {
  return count > 0 ? (
    <Badge tone="amber">{count} da revisionare</Badge>
  ) : (
    <span className="text-ink-3">—</span>
  );
}

function StatusBadges({ row, showCoachWarnings }: { row: ClientListRow; showCoachWarnings: boolean }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
      <ClientStatusBadge status={row.status} />
      {showCoachWarnings && row.coachCount === 0 ? <Badge tone="amber">Senza coach</Badge> : null}
    </span>
  );
}

export function ClientTable({ rows, now, today, timezone, showCoachWarnings = false }: ClientTableProps) {
  return (
    <>
      {/* Mobile e tablet: lista leggibile, niente tabella compressa. */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => {
          const secondary = secondaryLine(row);
          return (
            <li key={row.id}>
              <Link href={`/clients/${row.id}`} className="-mx-2 flex items-start gap-3 rounded-md px-2 py-4 transition-colors hover:bg-sunken active:bg-sunken">
                <Avatar name={row.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-ink">{row.fullName}</p>
                    <StatusBadges row={row} showCoachWarnings={showCoachWarnings} />
                  </div>
                  {secondary ? (
                    <p className={cn("mt-0.5 truncate text-[13px]", secondary.isAttention ? "text-amber" : "text-ink-3")}>
                      {secondary.text}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs text-ink-3">
                    Check-in: {lastCheckinLabel(row, now, timezone)} · Follow-up:{" "}
                    {row.nextFollowupOn ? formatRelativeDay(row.nextFollowupOn, today) : "nessuno"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: tabella con riga interamente cliccabile. */}
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">Elenco delle clienti assegnate</caption>
        <thead>
          <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.1em] text-ink-3">
            <th scope="col" className="py-3 pr-4 font-medium">Cliente</th>
            <th scope="col" className="px-4 py-3 font-medium">Stato</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Ultimo check-in</th>
            <th scope="col" className="px-4 py-3 font-medium">Prossimo follow-up</th>
            <th scope="col" className="py-3 pl-4 font-medium">Revisione</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const secondary = secondaryLine(row);
            return (
              <tr key={row.id} className={cn("relative text-sm transition-colors hover:bg-sunken", row.attention?.priority === "high" && "bg-rust-soft/30")}>
                <td className="max-w-0 py-3.5 pr-4 lg:w-[38%]">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.fullName} />
                    <div className="min-w-0">
                      <Link
                        href={`/clients/${row.id}`}
                        className="block truncate font-medium text-ink after:absolute after:inset-0 after:content-['']"
                      >
                        {row.fullName}
                      </Link>
                      {secondary ? (
                        <p className={cn("truncate text-[13px]", secondary.isAttention ? "text-amber" : "text-ink-3")}>
                          {secondary.text}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadges row={row} showCoachWarnings={showCoachWarnings} />
                </td>
                <td className="hidden px-4 py-3.5 text-ink-2 lg:table-cell">{lastCheckinLabel(row, now, timezone)}</td>
                <td className="px-4 py-3.5">
                  <NextFollowup dueOn={row.nextFollowupOn} today={today} />
                </td>
                <td className="py-3.5 pl-4">
                  <PendingReview count={row.pendingReviewCount} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
