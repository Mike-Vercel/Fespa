"use client";

import { MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/form-fields";
import { requestEmailChangeAction } from "./actions";

type EmailFormProps = {
  currentEmail: string;
  /** Cambio già chiesto e non ancora confermato (letto da Supabase Auth). */
  initialPendingEmail: string | null;
};

export function EmailForm({ currentEmail, initialPendingEmail }: EmailFormProps) {
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState(initialPendingEmail);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await requestEmailChangeAction(email);
      if (result.ok) {
        setErrors(undefined);
        setEmail("");
        setPendingEmail(result.data.pendingEmail);
        toast.success("Ti abbiamo inviato i link di conferma");
      } else {
        setErrors(result.error.fieldErrors?.email ?? [result.error.message]);
      }
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-sm text-ink-2">
        Accedi con <span className="font-medium text-ink">{currentEmail}</span>
      </p>

      {pendingEmail ? (
        <div role="status" className="flex gap-3 rounded-md bg-accent-soft px-4 py-3.5 text-sm text-pretty text-accent-strong">
          <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Cambio in attesa: per passare a <span className="font-medium">{pendingEmail}</span> apri il link che ti abbiamo
            inviato a <span className="font-medium">entrambi</span> gli indirizzi. Finché non li confermi, continui ad accedere
            con {currentEmail}.
          </p>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field
          id="profile-new-email"
          label="Nuova email"
          errors={errors}
          hint="Per sicurezza il cambio va confermato sia dal vecchio sia dal nuovo indirizzo."
        >
          <Input
            id="profile-new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            {...describedBy("profile-new-email", errors, true)}
          />
        </Field>
        <div>
          <Button type="submit" variant="primary" isLoading={isPending} disabled={email.trim() === ""}>
            Cambia email
          </Button>
        </div>
      </form>
    </div>
  );
}
