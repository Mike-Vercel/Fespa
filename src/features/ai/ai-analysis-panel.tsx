import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AI_CONFIDENCE_LABELS } from "@/lib/labels";
import type { AIAnalysisItem } from "@/types/domain";
import { FollowupSuggestionCard } from "./followup-suggestion-card";
import { GeneratedByAI } from "./generated-by-ai";

type AIAnalysisPanelProps = {
  analysis: AIAnalysisItem;
  client: { id: string; fullName: string };
  today: string;
  timezone: string;
};

/** Output dell'analisi, sempre presentato come materiale da verificare. Testo semplice: niente HTML dal modello. */
export function AIAnalysisPanel({ analysis, client, today, timezone }: AIAnalysisPanelProps) {
  return (
    <section aria-label="Analisi AI del check-in" className="animate-rise-in rounded-lg border border-line border-l-2 border-l-accent bg-surface p-5">
      <GeneratedByAI
        label="Analisi AI"
        model={analysis.model}
        isMock={analysis.isMock}
        generatedAt={analysis.createdAt}
        timezone={timezone}
      />
      <p className="mt-1 text-xs text-ink-3">Sintesi da verificare: le valutazioni e le decisioni restano tue.</p>

      <p className="mt-4 text-[15px] leading-relaxed text-pretty text-ink">{analysis.summary}</p>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Temi emersi">
        {analysis.topics.map((topic) => (
          <li key={topic}>
            <Badge>{topic}</Badge>
          </li>
        ))}
      </ul>

      {analysis.sensitiveContentNote ? (
        <div role="note" className="mt-4 flex gap-3 rounded-md bg-amber-soft px-4 py-3 text-sm text-amber">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-medium">Tema potenzialmente sensibile</p>
            <p className="mt-0.5 text-pretty">{analysis.sensitiveContentNote}</p>
          </div>
        </div>
      ) : null}

      {analysis.suggestedQuestions.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">Domande da approfondire</h4>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-2 marker:text-ink-3">
            {analysis.suggestedQuestions.map((question) => (
              <li key={question} className="pl-1 text-pretty">
                {question}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-ink-3">
        Affidabilità stimata dall&apos;AI: {AI_CONFIDENCE_LABELS[analysis.confidence].toLowerCase()} (in base alla quantità e
        chiarezza dei dati disponibili)
      </p>

      {analysis.followupSuggestion ? (
        <div className="mt-5">
          <FollowupSuggestionCard
            suggestion={analysis.followupSuggestion}
            client={client}
            today={today}
            analysisId={analysis.id}
            initialDecision={analysis.followupDecision}
          />
        </div>
      ) : null}
    </section>
  );
}
