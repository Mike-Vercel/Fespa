"use client";

import { CalendarPlus, Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addDays } from "@/domain/dates";
import { NewFollowupDialog } from "@/features/followups/new-followup-dialog";
import { formatCalendarDate } from "@/lib/format";
import type { FollowupDecision, FollowupSuggestion } from "@/types/domain";
import { dismissAISuggestionAction } from "./actions";

type FollowupSuggestionCardProps = {
  suggestion: FollowupSuggestion;
  client: { id: string; fullName: string };
  today: string;
  /** Presente per le proposte di un'analisi salvata: la decisione viene registrata. */
  analysisId?: string;
  initialDecision?: FollowupDecision | null;
};

/**
 * Human in the loop: l'AI propone, la coach decide.
 * "Crea follow-up" apre il form precompilato e modificabile; nulla viene creato prima della conferma.
 */
export function FollowupSuggestionCard({ suggestion, client, today, analysisId, initialDecision = "pending" }: FollowupSuggestionCardProps) {
  const [decision, setDecision] = useState<FollowupDecision | null>(initialDecision);
  const [isDismissing, startDismissing] = useTransition();
  const proposedDate = addDays(today, suggestion.dueInDays);

  function dismiss() {
    if (!analysisId) {
      setDecision("dismissed");
      return;
    }
    startDismissing(async () => {
      const result = await dismissAISuggestionAction(analysisId);
      if (result.ok) {
        setDecision("dismissed");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  if (decision === "accepted") {
    return (
      <p className="flex items-center gap-2 text-sm text-accent-strong">
        <Check aria-hidden="true" className="size-4" strokeWidth={2} />
        Follow-up creato dalla proposta: {suggestion.title}
      </p>
    );
  }
  if (decision === "dismissed") {
    return <p className="text-sm text-ink-3">Proposta di follow-up ignorata.</p>;
  }

  return (
    <div className="rounded-md border border-dashed border-accent/45 bg-accent-soft/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-strong">Proposta dell&apos;AI · da confermare</p>
      <p className="mt-1.5 font-medium text-ink">Potrebbe essere utile un follow-up: {suggestion.title}</p>
      <p className="mt-1 text-sm text-pretty text-ink-2">{suggestion.reason}</p>
      <p className="mt-1 text-xs text-ink-3">Data proposta: {formatCalendarDate(proposedDate, { withYear: true })}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={dismiss}
          isLoading={isDismissing}
          icon={<X aria-hidden="true" className="size-3.5" strokeWidth={2} />}
        >
          Ignora
        </Button>
        <NewFollowupDialog
          today={today}
          client={client}
          defaults={{ title: suggestion.title, description: suggestion.reason, dueOn: proposedDate, aiAnalysisId: analysisId }}
          onCreated={() => setDecision("accepted")}
          trigger={
            <Button size="sm" variant="primary" icon={<CalendarPlus aria-hidden="true" className="size-3.5" strokeWidth={1.75} />}>
              Crea follow-up
            </Button>
          }
        />
      </div>
    </div>
  );
}
