"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/form-fields";
import { PROFILE_NAME_MAX_LENGTH } from "@/validation/profile";
import { updateProfileAction } from "./actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [fullName, setFullName] = useState(initialName);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const hasChanges = fullName.trim() !== initialName;

  function save() {
    startTransition(async () => {
      const result = await updateProfileAction(fullName);
      if (result.ok) {
        setErrors(undefined);
        toast.success("Profilo aggiornato");
      } else {
        setErrors(result.error.fieldErrors?.fullName ?? [result.error.message]);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex max-w-md flex-col gap-4"
    >
      <Field id="profile-name" label="Nome e cognome" errors={errors} hint="Visibile alle colleghe che seguono le tue stesse clienti.">
        <Input
          id="profile-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          maxLength={PROFILE_NAME_MAX_LENGTH}
          autoComplete="name"
          {...describedBy("profile-name", errors, true)}
        />
      </Field>
      <div>
        <Button type="submit" variant="primary" isLoading={isPending} disabled={!hasChanges}>
          Salva modifiche
        </Button>
      </div>
    </form>
  );
}
