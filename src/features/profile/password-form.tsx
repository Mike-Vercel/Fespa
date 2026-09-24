"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/form-fields";
import { PasswordInput } from "@/features/auth/password-input";
import type { FieldErrors } from "@/types/results";
import { MIN_NEW_PASSWORD_LENGTH } from "@/validation/auth";
import { changePasswordAction } from "./actions";

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(form: HTMLFormElement) {
    const data = new FormData(form);
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: readField(data, "currentPassword"),
        password: readField(data, "password"),
        confirmPassword: readField(data, "confirmPassword"),
      });
      if (result.ok) {
        setErrors({});
        setFormError(null);
        formRef.current?.reset();
        toast.success("Password aggiornata");
      } else {
        const fieldErrors = result.error.fieldErrors ?? {};
        setErrors(fieldErrors);
        setFormError(Object.keys(fieldErrors).length > 0 ? null : result.error.message);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        save(event.currentTarget);
      }}
      noValidate
      className="flex max-w-md flex-col gap-4"
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-rust-soft px-3.5 py-3 text-sm text-rust">
          {formError}
        </p>
      ) : null}

      <Field id="profile-current-password" label="Password attuale" errors={errors.currentPassword}>
        <PasswordInput
          id="profile-current-password"
          name="currentPassword"
          autoComplete="current-password"
          {...describedBy("profile-current-password", errors.currentPassword)}
        />
      </Field>
      <Field
        id="profile-new-password"
        label="Nuova password"
        errors={errors.password}
        hint={`Almeno ${MIN_NEW_PASSWORD_LENGTH} caratteri.`}
      >
        <PasswordInput
          id="profile-new-password"
          name="password"
          autoComplete="new-password"
          {...describedBy("profile-new-password", errors.password, true)}
        />
      </Field>
      <Field id="profile-confirm-password" label="Ripeti la nuova password" errors={errors.confirmPassword}>
        <PasswordInput
          id="profile-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          {...describedBy("profile-confirm-password", errors.confirmPassword)}
        />
      </Field>
      <div>
        <Button type="submit" variant="primary" isLoading={isPending}>
          Cambia password
        </Button>
      </div>
    </form>
  );
}
