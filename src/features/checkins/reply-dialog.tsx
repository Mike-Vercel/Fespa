"use client";

import { MessageSquareReply } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form-fields";
import { COACH_REPLY_MAX_LENGTH } from "@/validation/checkin-review";
import { reviewCheckinAction } from "./actions";
import { ReplyDeliveryNote } from "./reply-delivery-note";

type ReplyDialogProps = {
  checkinId: string;
  clientFirstName: string;
  checkinLabel: string;
  visibleToClient: boolean;
};

/** Risposta scritta dalla coach, senza AI. Salvarla segna anche il check-in come revisionato. */
export function ReplyDialog({ checkinId, clientFirstName, checkinLabel, visibleToClient }: ReplyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textId = `manual-reply-${checkinId}`;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await reviewCheckinAction(checkinId, text);
      if (result.ok) {
        toast.success(visibleToClient ? `Risposta inviata a ${clientFirstName}` : "Risposta salvata");
        setIsOpen(false);
        setText("");
        return;
      }
      setError(result.error.fieldErrors?.reply?.[0] ?? result.error.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPending && setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="secondary" icon={<MessageSquareReply aria-hidden="true" className="size-4" strokeWidth={1.75} />}>
          Rispondi
        </Button>
      </DialogTrigger>
      <DialogContent title={`Rispondi a ${clientFirstName}`} description={checkinLabel} className="max-w-xl">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={textId} className="text-[13px] font-medium text-ink">
              Testo della risposta
            </label>
            <Textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              maxLength={COACH_REPLY_MAX_LENGTH}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${textId}-error` : undefined}
            />
            <p className="text-right text-xs text-ink-3">
              {text.length}/{COACH_REPLY_MAX_LENGTH}
            </p>
            {error ? (
              <p id={`${textId}-error`} role="alert" className="text-sm text-rust">
                {error}
              </p>
            ) : null}
          </div>
          <ReplyDeliveryNote clientFirstName={clientFirstName} visibleToClient={visibleToClient} />
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isPending}>
                Annulla
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={save} isLoading={isPending} disabled={!text.trim()}>
              {visibleToClient ? "Invia risposta" : "Salva risposta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
