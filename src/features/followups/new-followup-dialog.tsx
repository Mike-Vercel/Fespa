"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import type { FieldErrors } from "@/types/results";
import { FOLLOWUP_DESCRIPTION_MAX_LENGTH, FOLLOWUP_TITLE_MAX_LENGTH } from "@/validation/followups";
import { createFollowupAction } from "./actions";

type ClientOption = { id: string; fullName: string };

export type FollowupDefaults = {
  title?: string;
  description?: string;
  dueOn?: string;
  /** Presente quando il follow-up nasce da una proposta AI: la creazione registra la conferma della coach. */
  aiAnalysisId?: string;
};

type NewFollowupDialogProps = {
  today: string;
  trigger: ReactNode;
  /** Cliente già determinata (scheda cliente) oppure elenco tra cui scegliere (pagina Follow-up). */
  client?: ClientOption;
  clientOptions?: ClientOption[];
  defaults?: FollowupDefaults;
  onCreated?: () => void;
};

export function NewFollowupDialog({ today, trigger, client, clientOptions = [], defaults, onCreated }: NewFollowupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFromAISuggestion = Boolean(defaults?.aiAnalysisId);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setFieldErrors({});
      setFormError(null);
    }
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createFollowupAction(formData);
      if (result.ok) {
        handleOpenChange(false);
        toast.success("Follow-up creato");
        onCreated?.();
        return;
      }
      setFieldErrors(result.error.fieldErrors ?? {});
      const hasFieldErrors = Object.keys(result.error.fieldErrors ?? {}).length > 0;
      setFormError(hasFieldErrors ? null : result.error.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={isFromAISuggestion ? "Crea follow-up dalla proposta AI" : "Nuovo follow-up"}
        description={
          isFromAISuggestion
            ? "I campi sono precompilati dalla proposta dell'AI: verificali e modificali prima di confermare."
            : "Un promemoria operativo per te: chiamata, messaggio, verifica da fare."
        }
      >
        <form action={submit} className="flex flex-col gap-4" noValidate>
          {defaults?.aiAnalysisId ? <input type="hidden" name="aiAnalysisId" value={defaults.aiAnalysisId} /> : null}

          {client ? (
            <>
              <input type="hidden" name="clientId" value={client.id} />
              <p className="text-sm text-ink-2">
                Cliente: <span className="font-medium text-ink">{client.fullName}</span>
              </p>
            </>
          ) : (
            <Field id="followup-client" label="Cliente" errors={fieldErrors.clientId}>
              <Select id="followup-client" name="clientId" defaultValue="" required {...describedBy("followup-client", fieldErrors.clientId)}>
                <option value="" disabled>
                  Seleziona una cliente
                </option>
                {clientOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field id="followup-title" label="Titolo" errors={fieldErrors.title}>
            <Input
              id="followup-title"
              name="title"
              defaultValue={defaults?.title}
              maxLength={FOLLOWUP_TITLE_MAX_LENGTH}
              placeholder="Es. Chiamata per rivedere la routine serale"
              required
              {...describedBy("followup-title", fieldErrors.title)}
            />
          </Field>

          <Field id="followup-description" label="Nota (facoltativa)" errors={fieldErrors.description}>
            <Textarea
              id="followup-description"
              name="description"
              defaultValue={defaults?.description}
              maxLength={FOLLOWUP_DESCRIPTION_MAX_LENGTH}
              rows={3}
              {...describedBy("followup-description", fieldErrors.description)}
            />
          </Field>

          <Field id="followup-due" label="Data" errors={fieldErrors.dueOn}>
            <Input
              id="followup-due"
              name="dueOn"
              type="date"
              min={today}
              defaultValue={defaults?.dueOn ?? today}
              required
              className="sm:max-w-52"
              {...describedBy("followup-due", fieldErrors.dueOn)}
            />
          </Field>

          {formError ? (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-rust-soft px-3 py-2.5 text-sm text-rust">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {formError}
            </p>
          ) : null}

          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isPending}>
                Annulla
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Crea follow-up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
