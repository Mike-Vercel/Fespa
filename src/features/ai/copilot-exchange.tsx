"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import type { AISourceLink, CopilotAnswer } from "@/types/ai";
import { FollowupSuggestionCard } from "./followup-suggestion-card";
import { GeneratedByAI } from "./generated-by-ai";

function sourceHref(clientId: string, source: AISourceLink): string {
  switch (source.kind) {
    case "checkin":
      return `/clients/${clientId}?tab=checkins#checkin-${source.id}`;
    case "note":
      return `/clients/${clientId}?tab=notes`;
    case "followup":
      return `/clients/${clientId}?tab=followups`;
  }
}

type CopilotExchangeProps = {
  question: string;
  answer: CopilotAnswer;
  client: { id: string; fullName: string };
  today: string;
  timezone: string;
  /** Chiamato quando la coach apre una fonte: il pannello si chiude per mostrarla. */
  onNavigate: () => void;
};

/** Una domanda con la sua risposta: testo semplice, fonti verificabili, eventuali proposte da confermare. */
export function CopilotExchange({ question, answer, client, today, timezone, onNavigate }: CopilotExchangeProps) {
  return (
    <article className="flex flex-col gap-3 animate-rise-in">
      <p className="font-medium text-ink">{question}</p>

      <div className="border-l-2 border-l-accent pl-4">
        <GeneratedByAI
          label="Copilot"
          model={answer.meta.model}
          isMock={answer.meta.isMock}
          generatedAt={answer.meta.generatedAt}
          timezone={timezone}
        />
        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-pretty text-ink">{answer.answer}</p>

        {answer.dataLimitations ? (
          <p className="mt-2 text-[13px] italic text-ink-3">Limiti dei dati: {answer.dataLimitations}</p>
        ) : null}

        {answer.sources.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">Fonti</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {answer.sources.map((source) => (
                <li key={source.ref}>
                  <Link
                    href={sourceHref(client.id, source)}
                    onClick={onNavigate}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 text-xs text-ink-2 transition-colors hover:border-accent/40 hover:text-ink"
                  >
                    <FileText aria-hidden="true" className="size-3" strokeWidth={2} />
                    {source.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {answer.proposals.map((proposal) => (
        <FollowupSuggestionCard key={proposal.title} suggestion={proposal} client={client} today={today} />
      ))}
    </article>
  );
}
