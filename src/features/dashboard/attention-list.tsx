import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import {
  attentionWaitingDays,
  describeAttentionReason,
  type AttentionItem,
  type AttentionPriority,
  type AttentionReason,
} from "@/domain/attention";
import { cn } from "@/lib/cn";

/** Righe visibili: le altre clienti sono nella lista ordinata per priorità. */
const MAX_VISIBLE_ITEMS = 5;

const PRIORITY_PRESENTATION: Record<AttentionPriority, { dot: string; badge: string; label: string }> = {
  high: { dot: "bg-urgent", badge: "bg-urgent-soft text-urgent", label: "Priorità alta" },
  medium: { dot: "bg-kpi-orange-ink", badge: "bg-warning-soft text-warning", label: "Priorità media" },
  low: { dot: "bg-line-strong", badge: "bg-sunken text-ink-3", label: "Da tenere d'occhio" },
};

/** Apre la scheda cliente direttamente sulla tab utile per il motivo principale. */
function tabForReason(reason: AttentionReason | undefined): string {
  switch (reason?.kind) {
    case "followup_overdue":
    case "followup_today":
      return "followups";
    case "checkin_review_late":
    case "checkin_to_review":
    case "ai_suggestion_pending":
      return "checkins";
    default:
      return "overview";
  }
}

type AttentionListProps = {
  items: AttentionItem[];
  /** Messaggio quando la lista è vuota (diverso se è vuota per colpa di un filtro). */
  emptyTitle?: string;
  emptyDescription?: string;
};

export function AttentionList({
  items,
  emptyTitle = "Tutto sotto controllo",
  emptyDescription = "Nessuna cliente richiede attenzione in questo momento.",
}: AttentionListProps) {
  if (items.length === 0) {
    return <EmptyState icon={CircleCheck} title={emptyTitle} description={emptyDescription} />;
  }

  const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

  return (
    <>
      <ul className="divide-y divide-line/80">
        {items.slice(0, MAX_VISIBLE_ITEMS).map((item) => {
          const priority = PRIORITY_PRESENTATION[item.priority];
          const waitingDays = attentionWaitingDays(item);
          return (
            <li key={item.clientId}>
              <Link
                href={`/clients/${item.clientId}?tab=${tabForReason(item.reasons[0])}`}
                className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-sunken/70"
              >
                <Avatar name={item.clientName} className="size-12 text-[15px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-ink">{item.clientName}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-2 text-[14px] text-ink-2">
                    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", priority.dot)} />
                    <span className="sr-only">{priority.label}: </span>
                    <span className="truncate">{item.reasons.map(describeAttentionReason).join(" · ")}</span>
                  </p>
                </div>
                {waitingDays !== null ? (
                  <span className={cn("tabular hidden shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium sm:inline-block", priority.badge)}>
                    <span className="sr-only">In attesa da </span>
                    {waitingDays === 1 ? "1 giorno" : `${waitingDays} giorni`}
                  </span>
                ) : null}
                <ChevronRight
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-[18px] shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <p className="border-t border-line/80 pt-3 text-[13px] text-ink-3">
          {hiddenCount === 1 ? "Un'altra cliente richiede" : `Altre ${hiddenCount} clienti richiedono`} attenzione:{" "}
          <Link href="/clients?sort=priority" className="font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
            vedi la lista per priorità
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
