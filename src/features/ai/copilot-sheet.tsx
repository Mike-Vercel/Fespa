"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { AIStatus } from "@/types/domain";
import type { CopilotAnswer } from "@/types/ai";
import type { PublicError } from "@/types/results";
import { COPILOT_QUESTION_MAX_LENGTH, COPILOT_QUESTION_MIN_LENGTH } from "@/validation/ai";
import { AIErrorNotice, AINotConfiguredNotice } from "./ai-notices";
import { postJson } from "./api-client";
import { CopilotExchange } from "./copilot-exchange";

const SUGGESTED_QUESTIONS = [
  "Questa difficoltà era già comparsa?",
  "Riassumimi gli ultimi 3 check-in.",
  "Quali argomenti ricorrenti emergono?",
  "Quando è stato l'ultimo follow-up?",
];

type Exchange = { id: number; question: string; answer: CopilotAnswer };

type CopilotSheetProps = {
  client: { id: string; fullName: string; firstName: string };
  today: string;
  timezone: string;
  aiStatus: AIStatus;
};

/**
 * Coach Copilot: domande sullo storico di UNA cliente.
 * Ogni domanda è indipendente (nessuna memoria lato server): meno dati inviati, comportamento prevedibile.
 */
export function CopilotSheet({ client, today, timezone, aiStatus }: CopilotSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<{ question: string; error: PublicError } | null>(null);
  const nextId = useRef(1);
  const isAIAvailable = aiStatus.mode !== "not_configured";
  const trimmed = question.trim();
  const canSend = isAIAvailable && pendingQuestion === null && trimmed.length >= COPILOT_QUESTION_MIN_LENGTH;

  async function ask(text: string) {
    setPendingQuestion(text);
    setError(null);
    const result = await postJson<{ answer: CopilotAnswer }>("/api/ai/copilot", { clientId: client.id, question: text });
    setPendingQuestion(null);
    if (result.ok) {
      const id = nextId.current;
      nextId.current += 1;
      setExchanges((current) => [...current, { id, question: text, answer: result.data.answer }]);
      setQuestion("");
    } else {
      setError({ question: text, error: result.error });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ai" icon={<Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />}>
          Chiedi al Coach Copilot
        </Button>
      </DialogTrigger>

      <SheetContent
        side="right"
        title="Coach Copilot"
        description={`Domande su ${client.firstName}: risponde usando solo lo storico disponibile, e cita le fonti.`}
      >
        <div className="flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
          {exchanges.length === 0 && pendingQuestion === null ? (
            <div>
              <p className="text-sm text-ink-2">Prova con una di queste domande:</p>
              <ul className="mt-3 flex flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      disabled={!isAIAvailable}
                      onClick={() => ask(suggestion)}
                      className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft/50 disabled:opacity-55"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ol className="flex flex-col gap-8">
            {exchanges.map((exchange) => (
              <li key={exchange.id}>
                <CopilotExchange
                  question={exchange.question}
                  answer={exchange.answer}
                  client={client}
                  today={today}
                  timezone={timezone}
                  onNavigate={() => setIsOpen(false)}
                />
              </li>
            ))}
          </ol>

          {pendingQuestion !== null ? (
            <div className="mt-8 flex flex-col gap-2">
              <p className="font-medium text-ink">{pendingQuestion}</p>
              <p className="flex items-center gap-2 text-sm text-ink-3">
                <Spinner /> Il Copilot sta consultando lo storico…
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-8 flex flex-col gap-2">
              <p className="font-medium text-ink">{error.question}</p>
              <AIErrorNotice error={error.error} onRetry={() => ask(error.question)} />
            </div>
          ) : null}
        </div>

        <form
          className="border-t border-line px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) void ask(trimmed);
          }}
        >
          {!isAIAvailable ? (
            <div className="mb-3">
              <AINotConfiguredNotice />
            </div>
          ) : null}
          <label htmlFor="copilot-question" className="sr-only">
            Domanda per il Copilot
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="copilot-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                // Invio per inviare, Maiusc+Invio per andare a capo.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend) void ask(trimmed);
                }
              }}
              rows={2}
              maxLength={COPILOT_QUESTION_MAX_LENGTH}
              disabled={!isAIAvailable}
              placeholder={`Chiedi qualcosa su ${client.firstName}…`}
              className="min-h-11 flex-1 resize-none rounded-md border border-control bg-surface px-3 py-2.5 text-base sm:text-[15px] text-ink placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:opacity-60"
            />
            <Button type="submit" variant="primary" size="icon" disabled={!canSend} aria-label="Invia domanda">
              <ArrowUp aria-hidden="true" className="size-4" strokeWidth={2} />
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            Le risposte sono generate con AI: verifica sempre le fonti citate. Nessuna azione viene eseguita senza la tua conferma.
          </p>
        </form>
      </SheetContent>
    </Dialog>
  );
}
