import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { dueBucketOf } from "@/domain/followups";
import { cn } from "@/lib/cn";
import { capitalize, formatRelativeDay } from "@/lib/format";
import type { FollowupItem } from "@/types/domain";

type FollowupRowProps = {
  followup: FollowupItem;
  today: string;
  /** Nella scheda cliente il nome è ridondante. */
  showClient?: boolean;
  action?: ReactNode;
};

function dueLabel(followup: FollowupItem, today: string): { text: string; isOverdue: boolean } {
  if (followup.status !== "pending") {
    return { text: `Scadenza ${formatRelativeDay(followup.dueOn, today)}`, isOverdue: false };
  }
  const isOverdue = dueBucketOf(followup.dueOn, today) === "overdue";
  const relative = formatRelativeDay(followup.dueOn, today);
  return { text: isOverdue ? `Scaduto · ${relative}` : capitalize(relative), isOverdue };
}

export function FollowupRow({ followup, today, showClient = true, action }: FollowupRowProps) {
  const due = dueLabel(followup, today);
  const isClosed = followup.status !== "pending";

  return (
    <div className="flex items-start gap-3 py-3">
      {action ? <div className="pt-0.5">{action}</div> : null}
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium text-ink", isClosed && "text-ink-3 line-through decoration-line-strong")}>
          {followup.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-3">
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
          <p className="mt-1 line-clamp-2 text-[13px] text-pretty text-ink-2">{followup.description}</p>
        ) : null}
      </div>
      <span className={cn("shrink-0 pt-0.5 text-[13px]", due.isOverdue ? "font-medium text-rust" : "text-ink-3")}>
        {due.text}
      </span>
    </div>
  );
}
