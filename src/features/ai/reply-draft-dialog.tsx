"use client";

import { Check, Copy, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { reviewCheckinAction } from "@/features/checkins/actions";
import { ReplyDeliveryNote } from "@/features/checkins/reply-delivery-note";
import type { ReplyDraft } from "@/types/ai";
import type { PublicError } from "@/types/results";
import { COACH_REPLY_MAX_LENGTH } from "@/validation/checkin-review";
import { REPLY_INSTRUCTIONS_MAX_LENGTH } from "@/validation/ai";
import { AIErrorNotice } from "./ai-notices";
import { postJson } from "./api-client";
import { GeneratedByAI } from "./generated-by-ai";

type ReplyDraftDialogProps = {
  checkinId: string;
  clientFirstName: string;
  checkinLabel: string;
  timezone: string;
  trigger: ReactNode;
  /** true se la cliente usa l'area clienti e vedrà lì la risposta approvata. */
  visibleToClient: boolean;
};

type DraftState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: PublicError }
  | { status: "ready"; draft: ReplyDraft };

export function ReplyDraftDialog({
  checkinId,
  clientFirstName,
  checkinLabel,
  timezone,
  trigger,
  visibleToClient,
}: ReplyDraftDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [state, setState] = useState<DraftState>({ status: "idle" });
  const [text, setText] = useState("");
  const [isApproving, startApproving] = useTransition();

  async function generate() {
    setState({ status: "loading" });
    const result = await postJson<{ draft: ReplyDraft }>("/api/ai/reply-draft", {
      checkinId,
      instructions: instructions.trim() || null,
    });
    if (result.ok) {
      setState({ status: "ready", draft: result.data.draft });
      setText(result.data.draft.draft);
    } else {
      setState({ status: "error", error: result.error });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Bozza copiata negli appunti");
    } catch {
      toast.error("Copia non riuscita: seleziona il testo e copialo manualmente.");
    }
  }

  function approve() {
    startApproving(async () => {
      const result = await reviewCheckinAction(checkinId, text);
      if (result.ok) {
        toast.success(visibleToClient ? `Risposta approvata e inviata a ${clientFirstName}` : "Risposta salvata e check-in segnato come revisionato");
        setIsOpen(false);
      } else {
        toast.error(result.error.fieldErrors?.reply?.[0] ?? result.error.message);
      }
    });
  }

  const isBusy = state.status === "loading" || isApproving;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isBusy && setIsOpen(open)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Prepara risposta" description={`Per ${clientFirstName} · ${checkinLabel}`} className="max-w-2xl">
        <div className="flex flex-col gap-5">
          <Field
            id={`reply-instructions-${checkinId}`}
            label="Indicazioni per la bozza (facoltative)"
            hint="Es. tono più diretto, chiedi del sonno, ricorda l'allenamento di sabato."
          >
            <Input
              id={`reply-instructions-${checkinId}`}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={REPLY_INSTRUCTIONS_MAX_LENGTH}
              disabled={isBusy}
              aria-describedby={`reply-instructions-${checkinId}-hint`}
            />
          </Field>

          {state.status === "idle" ? (
            <div>
              <Button variant="ai" onClick={generate} icon={<Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />}>
                Genera bozza
              </Button>
            </div>
          ) : null}

          {state.status === "loading" ? (
            <LoadingRegion label="Generazione della bozza in corso" className="flex flex-col gap-2 rounded-md border border-line p-4">
              <p className="text-xs text-ink-3">L&apos;AI sta scrivendo una bozza a partire dal check-in…</p>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </LoadingRegion>
          ) : null}

          {state.status === "error" ? <AIErrorNotice error={state.error} onRetry={generate} /> : null}

          {state.status === "ready" ? (
            <div className="flex flex-col gap-4">
              <div role="note" className="flex items-start gap-2.5 rounded-md bg-amber-soft px-3.5 py-3 text-sm font-medium text-amber">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                Bozza generata con AI — verifica prima dell&apos;utilizzo.
              </div>

              <GeneratedByAI
                label="Bozza"
                model={state.draft.meta.model}
                isMock={state.draft.meta.isMock}
                generatedAt={state.draft.meta.generatedAt}
                timezone={timezone}
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`reply-text-${checkinId}`} className="text-[13px] font-medium text-ink">
                  Testo della risposta (modificabile)
                </label>
                <Textarea
                  id={`reply-text-${checkinId}`}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={9}
                  maxLength={COACH_REPLY_MAX_LENGTH}
                />
                <p className="text-right text-xs text-ink-3">
                  {text.length}/{COACH_REPLY_MAX_LENGTH}
                </p>
              </div>

              {state.draft.notesForCoach.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">Da verificare</p>
                  <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
                    {state.draft.notesForCoach.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
                <Button variant="ghost" onClick={generate} disabled={isBusy} icon={<RotateCcw aria-hidden="true" className="size-4" />}>
                  Rigenera
                </Button>
                <Button variant="secondary" onClick={copy} disabled={!text.trim()} icon={<Copy aria-hidden="true" className="size-4" />}>
                  Copia
                </Button>
                <Button
                  variant="primary"
                  className="sm:ml-auto"
                  onClick={approve}
                  isLoading={isApproving}
                  disabled={!text.trim()}
                  icon={<Check aria-hidden="true" className="size-4" strokeWidth={2} />}
                >
                  {visibleToClient ? "Approva e invia" : "Approva e salva"}
                </Button>
              </div>
              <ReplyDeliveryNote clientFirstName={clientFirstName} visibleToClient={visibleToClient} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
