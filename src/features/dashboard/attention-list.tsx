import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { describeAttentionReason, type AttentionItem, type AttentionPriority, type AttentionReason } from "@/domain/attention";
import { cn } from "@/lib/cn";

const MAX_VISIBLE_ITEMS = 8;

const PRIORITY_PRESENTATION: Record<AttentionPriority, { dot: string; label: string }> = {
  high: { dot: "bg-rust", label: "Priorità alta" },
  medium: { dot: "bg-amber", label: "Priorità media" },
  low: { dot: "bg-line-strong", label: "Da tenere d'occhio" },
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

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Tutto sotto controllo"
        description="Nessuna cliente richiede attenzione in questo momento."
      />
    );
  }

  const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

  return (
    <>
      <ul className="divide-y divide-line">
        {items.slice(0, MAX_VISIBLE_ITEMS).map((item) => {
          const priority = PRIORITY_PRESENTATION[item.priority];
          return (
            <li key={item.clientId}>
              <Link
                href={`/clients/${item.clientId}?tab=${tabForReason(item.reasons[0])}`}
                className="group -mx-2 flex items-center gap-4 rounded-md px-2 py-3.5 transition-colors hover:bg-sunken"
              >
                <Avatar name={item.clientName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{item.clientName}</p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] text-ink-2">
                    <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", priority.dot)} />
                    <span className="sr-only">{priority.label}: </span>
                    <span className="truncate">{item.reasons.map(describeAttentionReason).join(" · ")}</span>
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <p className="pt-3 text-[13px] text-ink-3">
          Altre {hiddenCount} clienti richiedono attenzione:{" "}
          <Link href="/clients?sort=priority" className="font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
            vedi la lista per priorità
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
