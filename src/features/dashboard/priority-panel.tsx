"use client";

import { ChevronDown, ListChecks } from "lucide-react";
import { useId, useState } from "react";
import type { AttentionItem, AttentionReason } from "@/domain/attention";
import { cn } from "@/lib/cn";
import { AttentionList } from "./attention-list";

type Filter = "all" | "checkins" | "followups";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "checkins", label: "Check-in" },
  { value: "followups", label: "Follow-up" },
];

const FILTER_KINDS: Record<Exclude<Filter, "all">, ReadonlySet<AttentionReason["kind"]>> = {
  checkins: new Set(["checkin_review_late", "checkin_to_review"]),
  followups: new Set(["followup_overdue", "followup_today"]),
};

function isFilter(value: string): value is Filter {
  return FILTERS.some((filter) => filter.value === value);
}

/**
 * "Da controllare oggi": clienti con attività in sospeso, dalla più urgente (ordine deciso dal server).
 * Il filtro lavora sulla lista già caricata: nessuna nuova richiesta.
 */
export function PriorityPanel({ items, className }: { items: AttentionItem[]; className?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const selectId = useId();
  const visible =
    filter === "all" ? items : items.filter((item) => item.reasons.some((reason) => FILTER_KINDS[filter].has(reason.kind)));

  return (
    <section
      aria-labelledby="da-controllare"
      className={cn("scroll-mt-24 rounded-2xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.2)]", className)}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line/80 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-kpi-violet text-kpi-violet-ink">
            <ListChecks className="size-[22px]" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <h2 id="da-controllare" className="font-serif text-[24px] leading-tight text-ink">
              Da controllare oggi
            </h2>
            <p className="mt-1 text-[14px] text-ink-3">Clienti con attività in sospeso, dalla più urgente</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <label htmlFor={selectId} className="sr-only">
            Mostra
          </label>
          <select
            id={selectId}
            value={filter}
            onChange={(event) => {
              if (isFilter(event.target.value)) setFilter(event.target.value);
            }}
            className="h-9 cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-base font-medium text-ink sm:text-[14px] shadow-[0_1px_2px_rgb(31_29_26/0.04)] transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        </div>
      </div>

      <div className="px-5 pb-4 pt-1 sm:px-6">
        <AttentionList
          items={visible}
          emptyTitle={filter === "all" ? undefined : "Niente da controllare"}
          emptyDescription={filter === "all" ? undefined : "Nessuna cliente con attività di questo tipo in sospeso."}
        />
      </div>
    </section>
  );
}
