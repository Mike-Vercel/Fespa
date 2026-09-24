"use client";

import { AlertCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { describedBy, Field, Input, Textarea } from "@/components/ui/form-fields";
import type { InviteOutcome } from "@/server/services/client-accounts";
import type { FieldErrors } from "@/types/results";
import { createClientAction } from "./actions";
import { InviteOutcomeNotice } from "./invite-outcome";

type Created = { clientId: string; fullName: string; invite: InviteOutcome };

export function NewClientDialog({ today }: { today: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setFieldErrors({});
      setFormError(null);
      setCreated(null);
    }
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createClientAction(formData);
      if (result.ok) {
        setCreated({ ...result.data, fullName: String(formData.get("fullName") ?? "").trim() });
        return;
      }
      setFieldErrors(result.error.fieldErrors ?? {});
      const hasFieldErrors = Object.keys(result.error.fieldErrors ?? {}).length > 0;
      setFormError(hasFieldErrors ? null : result.error.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary" icon={<UserPlus aria-hidden="true" className="size-4" strokeWidth={2} />}>
          Nuova cliente
        </Button>
      </DialogTrigger>
      <DialogContent
        title={created ? `${created.fullName} è tra le tue clienti` : "Nuova cliente"}
        description={
          created
            ? undefined
            : "Inserisci i dati essenziali: con l'email la cliente riceve un invito e completa da sola il suo profilo."
        }
      >
        {created ? (
          <div className="flex flex-col gap-6">
            <InviteOutcomeNotice outcome={created.invite} idPrefix="new-client" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button variant="secondary">Chiudi</Button>
              </DialogClose>
              <Link href={`/clients/${created.clientId}`} className={buttonClasses("primary")} onClick={() => handleOpenChange(false)}>
                Apri la scheda
              </Link>
            </div>
          </div>
        ) : (
          <form action={submit} className="flex flex-col gap-4" noValidate>
            <Field id="new-client-name" label="Nome e cognome" errors={fieldErrors.fullName}>
              <Input
                id="new-client-name"
                name="fullName"
                autoComplete="off"
                maxLength={120}
                required
                {...describedBy("new-client-name", fieldErrors.fullName)}
              />
            </Field>

            <Field
              id="new-client-email"
              label="Email (consigliata)"
              hint="Serve per l'invito all'area clienti, dove compilerà profilo e check-in."
              errors={fieldErrors.email}
            >
              <Input
                id="new-client-email"
                name="email"
                type="email"
                autoComplete="off"
                inputMode="email"
                {...describedBy("new-client-email", fieldErrors.email, true)}
              />
            </Field>

            <Field id="new-client-goal" label="Obiettivo (facoltativo)" errors={fieldErrors.goal}>
              <Textarea
                id="new-client-goal"
                name="goal"
                rows={2}
                maxLength={500}
                placeholder="La cliente potrà precisarlo nel suo profilo"
                {...describedBy("new-client-goal", fieldErrors.goal)}
              />
            </Field>

            <Field id="new-client-start" label="Inizio del percorso" errors={fieldErrors.startedOn}>
              <Input
                id="new-client-start"
                name="startedOn"
                type="date"
                defaultValue={today}
                required
                className="sm:max-w-52"
                {...describedBy("new-client-start", fieldErrors.startedOn)}
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
                Crea e invita
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
