import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ClientStatusBadge } from "@/components/ui/badge";
import { describeAttentionReason, type AttentionPriority } from "@/domain/attention";
import { dueBucketOf } from "@/domain/followups";
import { cn } from "@/lib/cn";
import { capitalize, formatRelativeDay, formatRelativeInstant } from "@/lib/format";
import type { ClientListRow } from "@/server/services/clients";
import { ClientRowActions } from "./client-row-actions";

type ClientTableProps = {
  rows: ClientListRow[];
  now: Date;
  today: string;
  timezone: string;
  /** Per l'amministrazione: segnala le clienti rimaste senza coach. */
  showCoachWarnings?: boolean;
};

/** Colori semantici della seconda riga: rosso urgente, arancio attenzione, blu programmato. */
const ATTENTION_TONES: Record<AttentionPriority, { dot: string; text: string; label: string }> = {
  high: { dot: "bg-urgent", text: "text-urgent", label: "Urgente" },
  medium: { dot: "bg-kpi-orange-ink", text: "text-warning", label: "Da seguire" },
  low: { dot: "bg-kpi-blue-ink", text: "text-ink-2", label: "In programma" },
};

/** Seconda riga sotto il nome: il motivo di attenzione se c'è, altrimenti l'obiettivo. */
function SecondaryLine({ row, className }: { row: ClientListRow; className?: string }) {
  const topReason = row.attention?.reasons[0];
  if (row.attention && topReason) {
    const tone = ATTENTION_TONES[row.attention.priority];
    return (
      <p className={cn("flex min-w-0 items-center gap-2 text-[14px] leading-snug", tone.text, className)}>
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", tone.dot)} />
        <span className="sr-only">{tone.label}: </span>
        <span className="truncate">{describeAttentionReason(topReason)}</span>
      </p>
    );
  }
  return row.goal ? <p className={cn("truncate text-[14px] leading-snug text-ink-3", className)}>{row.goal}</p> : null;
}

function lastCheckinLabel(row: ClientListRow, now: Date, timezone: string): string {
  return row.lastCheckinAt ? capitalize(formatRelativeInstant(row.lastCheckinAt, now, timezone)) : "Nessuno";
}

function NextFollowup({ dueOn, today }: { dueOn: string | null; today: string }) {
  if (!dueOn) {
    return <span className="text-ink-3">—</span>;
  }
  const bucket = dueBucketOf(dueOn, today);
  const relative = capitalize(formatRelativeDay(dueOn, today));
  if (bucket === "overdue") {
    return <span className="whitespace-nowrap font-medium text-urgent">Scaduto · {relative}</span>;
  }
  return <span className={cn("whitespace-nowrap", bucket === "today" ? "font-medium text-kpi-blue-ink" : "text-ink")}>{relative}</span>;
}

function PendingReview({ count }: { count: number }) {
  return count > 0 ? (
    <Badge tone="warning">{count} da revisionare</Badge>
  ) : (
    <span className="text-ink-3">—</span>
  );
}

function StatusBadges({ row, showCoachWarnings }: { row: ClientListRow; showCoachWarnings: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <ClientStatusBadge status={row.status} />
      {showCoachWarnings && row.coachCount === 0 ? <Badge tone="amber">Senza coach</Badge> : null}
    </span>
  );
}

/** Righe urgenti: una velatura calda appena percettibile, non una lista rossa. */
function urgentRowClass(row: ClientListRow): string | false {
  return row.attention?.priority === "high" && "bg-[color-mix(in_srgb,var(--color-urgent-soft)_28%,transparent)]";
}

const HEADER_CELL = "whitespace-nowrap py-3 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3";

export function ClientTable({ rows, now, today, timezone, showCoachWarnings = false }: ClientTableProps) {
  return (
    <>
      {/*
       * Sotto i 1280px (mobile, tablet, desktop piccolo con la sidebar aperta) sei colonne non ci stanno:
       * una riga compatta per cliente, con tutte le informazioni della tabella.
       */}
      <ul className="divide-y divide-line/80 xl:hidden">
        {rows.map((row) => (
          <li key={row.id} className={cn("relative px-5 py-4 transition-colors hover:bg-sunken/60 lg:px-6", urgentRowClass(row))}>
            <div className="flex items-start gap-3.5">
              <Avatar name={row.fullName} className="size-11 text-[14px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/clients/${row.id}`}
                    className="min-w-0 truncate text-[16px] font-medium leading-snug text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
                  >
                    {row.fullName}
                  </Link>
                  <div className="-mr-2 -mt-1.5 flex shrink-0 items-center gap-1">
                    <StatusBadges row={row} showCoachWarnings={showCoachWarnings} />
                    <ClientRowActions clientId={row.id} clientName={row.fullName} />
                  </div>
                </div>
                <SecondaryLine row={row} className="mt-0.5" />
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[14px] sm:grid-cols-3">
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
                      <span className="sm:hidden">Check-in</span>
                      <span className="hidden sm:inline">Ultimo check-in</span>
                    </dt>
                    <dd className="mt-0.5 text-ink">{lastCheckinLabel(row, now, timezone)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Follow-up</dt>
                    <dd className="mt-0.5">
                      <NextFollowup dueOn={row.nextFollowupOn} today={today} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Revisione</dt>
                    <dd className="mt-0.5">
                      <PendingReview count={row.pendingReviewCount} />
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Da 1280px: tabella con riga interamente cliccabile; il menu "•••" sta sopra il link. */}
      <table className="hidden w-full border-collapse text-left xl:table">
        <caption className="sr-only">Elenco delle clienti assegnate</caption>
        <thead>
          <tr className="border-b border-line/80">
            <th scope="col" className={cn(HEADER_CELL, "pl-6 pr-4")}>Cliente</th>
            <th scope="col" className={cn(HEADER_CELL, "px-4")}>Stato</th>
            <th scope="col" className={cn(HEADER_CELL, "px-4")}>Ultimo check-in</th>
            <th scope="col" className={cn(HEADER_CELL, "px-4")}>Prossimo follow-up</th>
            <th scope="col" className={cn(HEADER_CELL, "px-4")}>Revisione</th>
            <th scope="col" className={cn(HEADER_CELL, "w-16 pl-2 pr-6 text-right")}>
              <span className="sr-only">Azioni</span>
              <span aria-hidden="true" className="tracking-[0.2em]">···</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn("relative text-[15px] transition-colors hover:bg-sunken/60", urgentRowClass(row))}
            >
              <td className="w-[34%] max-w-0 py-2 pl-6 pr-4">
                <div className="flex items-center gap-3.5">
                  <Avatar name={row.fullName} className="size-[42px] text-[14px]" />
                  <div className="min-w-0">
                    <Link
                      href={`/clients/${row.id}`}
                      className="block truncate text-[16px] font-medium leading-snug text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
                    >
                      {row.fullName}
                    </Link>
                    <SecondaryLine row={row} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-2">
                <StatusBadges row={row} showCoachWarnings={showCoachWarnings} />
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-ink-2">{lastCheckinLabel(row, now, timezone)}</td>
              <td className="px-4 py-2">
                <NextFollowup dueOn={row.nextFollowupOn} today={today} />
              </td>
              <td className="px-4 py-2">
                <PendingReview count={row.pendingReviewCount} />
              </td>
              <td className="py-2 pl-2 pr-4 text-right">
                <ClientRowActions clientId={row.id} clientName={row.fullName} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
