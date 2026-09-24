"use client";

import { PenLine, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AIAnalysisItem, AIStatus } from "@/types/domain";
import type { PublicError } from "@/types/results";
import { AIAnalysisPanel } from "./ai-analysis-panel";
import { AIAnalysisSkeleton, AIErrorNotice, AINotConfiguredNotice } from "./ai-notices";
import { postJson } from "./api-client";
import { ReplyDraftDialog } from "./reply-draft-dialog";

type CheckinAIToolsProps = {
  checkinId: string;
  checkinLabel: string;
  client: { id: string; fullName: string; firstName: string };
  /** false se il check-in ha già una risposta: non si sovrascrive ciò che la cliente ha già letto. */
  canReply: boolean;
  /** true se la cliente usa l'area clienti e vedrà lì la risposta. */
  replyVisibleToClient: boolean;
  today: string;
  timezone: string;
  aiStatus: AIStatus;
  /** Analisi già salvata per questo check-in (la più recente). */
  initialAnalysis: AIAnalysisItem | null;
  /** false se le risposte del check-in non sono in un formato analizzabile. */
  canAnalyze: boolean;
  /** Azioni manuali (risposta, revisione), mostrate accanto ai pulsanti AI. */
  manualActions?: ReactNode;
};

type AnalysisState = { status: "idle" } | { status: "loading" } | { status: "error"; error: PublicError };

export function CheckinAITools({
  checkinId,
  checkinLabel,
  client,
  today,
  timezone,
  aiStatus,
  initialAnalysis,
  canAnalyze,
  canReply,
  replyVisibleToClient,
  manualActions,
}: CheckinAIToolsProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AIAnalysisItem | null>(initialAnalysis);
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const isAIAvailable = aiStatus.mode !== "not_configured";

  async function analyze() {
    setState({ status: "loading" });
    const result = await postJson<{ analysis: AIAnalysisItem }>("/api/ai/analyze-checkin", { checkinId });
    if (result.ok) {
      setAnalysis(result.data.analysis);
      setState({ status: "idle" });
      // Aggiorna contatori e liste che dipendono dalle proposte AI in attesa.
      router.refresh();
    } else {
      setState({ status: "error", error: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ai"
          onClick={analyze}
          isLoading={state.status === "loading"}
          disabled={!isAIAvailable || !canAnalyze}
          icon={<Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />}
        >
          {analysis ? "Rianalizza con AI" : "Analizza con AI"}
        </Button>
        {canReply ? (
          <ReplyDraftDialog
            checkinId={checkinId}
            clientFirstName={client.firstName}
            checkinLabel={checkinLabel}
            timezone={timezone}
            visibleToClient={replyVisibleToClient}
            trigger={
              <Button
                variant="secondary"
                disabled={!isAIAvailable || !canAnalyze}
                icon={<PenLine aria-hidden="true" className="size-4" strokeWidth={1.75} />}
              >
                Bozza risposta con AI
              </Button>
            }
          />
        ) : null}
        {manualActions}
      </div>

      {!isAIAvailable ? <AINotConfiguredNotice /> : null}

      <div aria-live="polite">
        {state.status === "loading" ? <AIAnalysisSkeleton /> : null}
        {state.status === "error" ? <AIErrorNotice error={state.error} onRetry={analyze} /> : null}
        {state.status !== "loading" && analysis ? (
          // key: una nuova analisi riparte da uno stato pulito (es. decisione sulla proposta).
          <AIAnalysisPanel key={analysis.id} analysis={analysis} client={client} today={today} timezone={timezone} />
        ) : null}
      </div>
    </div>
  );
}
