"use client";

import { Bot, FileClock, RefreshCw, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AUTOMATION_STEPS } from "@/domain/coach-ai";
import { cn } from "@/lib/cn";
import type { ActionRequestView, AutomationView } from "@/types/coach-ai";
import { toggleAutomationAction } from "../actions";
import { formatUpdatedAt } from "../format";
import { ActionCard } from "./action-card";

type DraftsPanelProps = {
  drafts: ActionRequestView[];
  automations: AutomationView[];
  pendingEvents: number;
  isRunning: boolean;
  clock: { now: Date; timezone: string };
  onActionChange: (action: ActionRequestView) => void;
  onAutomationChange: (automation: AutomationView) => void;
  onRunNow: () => void;
};

const LAST_STATUS_LABELS = { success: "riuscita", failed: "non riuscita", partial: "riuscita in parte" } as const;

/** Bozze preparate dalle automazioni (mai inviate da sole) e regole attive. */
export function DraftsPanel({ drafts, automations, pendingEvents, isRunning, clock, onActionChange, onAutomationChange, onRunNow }: DraftsPanelProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const openDrafts = drafts.filter((draft) => draft.status === "draft" || draft.status === "pending");

  async function toggle(automation: AutomationView) {
    setTogglingId(automation.id);
    const result = await toggleAutomationAction({ automationId: automation.id, enabled: !automation.enabled });
    setTogglingId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    onAutomationChange({ ...automation, enabled: !automation.enabled });
    toast.success(automation.enabled ? "Automazione sospesa." : "Automazione riattivata.");
  }

  return (
    <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section aria-labelledby="bozze-titolo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="bozze-titolo" className="flex items-center gap-2 text-[18px] font-semibold text-ink">
              <FileClock aria-hidden="true" className="size-5 text-brand-violet" strokeWidth={1.8} />
              {openDrafts.length === 1 ? "1 risposta pronta da revisionare" : `${openDrafts.length} risposte pronte da revisionare`}
            </h3>
            <p className="mt-1 text-[14px] text-ink-3">Preparate dalle tue automazioni. Nessuna viene inviata senza la tua conferma.</p>
          </div>
          {pendingEvents > 0 ? (
            <Button variant="secondary" size="sm" onClick={onRunNow} isLoading={isRunning} icon={<RefreshCw aria-hidden="true" className="size-4" />}>
              Prepara le nuove ({pendingEvents})
            </Button>
          ) : null}
        </div>

        {drafts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong/70 px-5 py-8 text-center text-[14px] leading-relaxed text-ink-3">
            Nessuna bozza in attesa.
            {automations.length === 0 ? " Attiva un'automazione chiedendo a Coach AI: “Ogni volta che arriva un nuovo check-in preparami una risposta, ma non inviarla”." : ""}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {drafts.map((draft) => (
              <ActionCard key={draft.id} action={draft} onChange={onActionChange} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="automazioni-titolo" className="flex flex-col gap-4">
        <h3 id="automazioni-titolo" className="flex items-center gap-2 text-[18px] font-semibold text-ink">
          <Zap aria-hidden="true" className="size-5 text-kpi-orange-ink" strokeWidth={1.8} />
          Automazioni
        </h3>
        {automations.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-ink-3">Nessuna automazione attiva.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {automations.map((automation) => (
              <li key={automation.id} className="flex flex-col gap-3 rounded-2xl border border-line/80 bg-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <Bot aria-hidden="true" className="size-[18px] text-brand" strokeWidth={1.8} />
                    {automation.description}
                  </p>
                  <ol className="mt-2 flex flex-col gap-1 text-[13.5px] text-ink-2">
                    {AUTOMATION_STEPS[automation.trigger].steps.map((step) => (
                      <li key={step}>→ {step}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-[12.5px] text-ink-3" suppressHydrationWarning>
                    {automation.lastRunAt
                      ? `Ultima esecuzione ${formatUpdatedAt(automation.lastRunAt, clock.now, clock.timezone)}${automation.lastStatus ? `, ${LAST_STATUS_LABELS[automation.lastStatus]}` : ""}`
                      : "Non ancora eseguita"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={automation.enabled}
                  aria-label={automation.enabled ? "Sospendi l'automazione" : "Riattiva l'automazione"}
                  disabled={togglingId === automation.id}
                  onClick={() => void toggle(automation)}
                  className={cn(
                    "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
                    automation.enabled ? "bg-brand" : "bg-line-strong",
                  )}
                >
                  <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", automation.enabled ? "translate-x-6" : "translate-x-1")} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
