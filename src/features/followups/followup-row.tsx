import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { dueBucketOf, type DueBucket } from "@/domain/followups";
import { cn } from "@/lib/cn";
import { capitalize, formatRelativeDay } from "@/lib/format";
import type { FollowupItem } from "@/types/domain";

type FollowupRowProps = {
  followup: FollowupItem;
  today: string;
  /** Nella scheda cliente il nome è ridondante. */
  showClient?: boolean;
  action?: ReactNode;
  /** "badge": scadenza in una pillola colorata (pagina Follow-up); "text": testo semplice (liste compatte). */
  dueVariant?: "text" | "badge";
  /** Azione secondaria sulla stessa riga della scadenza (es. "Annulla"). */
  trailing?: ReactNode;
};

type DueTone = DueBucket | "closed";

/** Il testo dice sempre anche lo stato ("Scaduto", "Oggi", "Domani"): il colore non è l'unica informazione. */
function dueLabel(followup: FollowupItem, today: string): { text: string; tone: DueTone } {
  if (followup.status !== "pending") {
    return { text: `Scadenza ${formatRelativeDay(followup.dueOn, today)}`, tone: "closed" };
  }
  const bucket = dueBucketOf(followup.dueOn, today);
  const relative = formatRelativeDay(followup.dueOn, today);
  return { text: bucket === "overdue" ? `Scaduto · ${relative}` : capitalize(relative), tone: bucket };
}

const TEXT_TONES: Record<DueTone, string> = {
  overdue: "font-medium text-urgent",
  today: "font-medium text-kpi-blue-ink",
  upcoming: "text-ink-3",
  closed: "text-ink-3",
};

const BADGE_TONES: Record<DueTone, string> = {
  overdue: "bg-urgent-soft text-urgent",
  today: "bg-brand-soft text-brand",
  // Testo verde scuro: il verde delle KPI sul suo fondo non raggiunge 4.5:1.
  upcoming: "bg-kpi-green text-accent-strong",
  closed: "bg-sunken text-ink-3",
};

export function FollowupRow({ followup, today, showClient = true, action, dueVariant = "text", trailing }: FollowupRowProps) {
  const due = dueLabel(followup, today);
  const isClosed = followup.status !== "pending";
  const isBadge = dueVariant === "badge";

  return (
    // In "badge", su mobile scadenza e azione vanno a capo sotto il testo (allineate al titolo).
    <div className={cn("flex items-start gap-x-3", isBadge ? "flex-wrap gap-y-3 py-4 sm:flex-nowrap" : "py-3")}>
      {action ? <div className="pt-0.5">{action}</div> : null}
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium text-ink", isBadge ? "text-[16px]" : "text-[15px]", isClosed && "text-ink-3 line-through decoration-line-strong")}>
          {followup.title}
        </p>
        <p className={cn("mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ink-3", isBadge ? "text-[14px]" : "text-[13px]")}>
          {showClient ? (
            <Link
              href={`/clients/${followup.clientId}?tab=followups`}
              className="text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              {followup.clientName}
            </Link>
          ) : null}
          {followup.source === "ai_suggestion" ? (
            <span className="inline-flex items-center gap-1 text-accent-strong">
              <Sparkles aria-hidden="true" className="size-3" strokeWidth={2} />
              Da proposta AI
            </span>
          ) : null}
        </p>
        {followup.description ? (
          <p className={cn("mt-1 line-clamp-2 max-w-3xl text-pretty", isBadge ? "text-[14px] text-ink-3" : "text-[13px] text-ink-2")}>
            {followup.description}
          </p>
        ) : null}
      </div>
      {isBadge ? (
        <div
          className={cn(
            "flex basis-full items-center justify-between gap-3 sm:basis-auto sm:shrink-0 sm:justify-end sm:self-center",
            action && "pl-[34px] sm:pl-0",
          )}
        >
          <span className={cn("inline-flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[14px] font-medium", BADGE_TONES[due.tone])}>
            {due.text}
          </span>
          {trailing}
        </div>
      ) : (
        <>
          <span className={cn("shrink-0 pt-0.5 text-[13px]", TEXT_TONES[due.tone])}>{due.text}</span>
          {trailing}
        </>
      )}
    </div>
  );
}
