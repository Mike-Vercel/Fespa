"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/form-fields";
import { MIN_NEW_PASSWORD_LENGTH } from "@/validation/auth";
import { requestPasswordResetAction, updatePasswordAction, type AuthFormState } from "./actions";
import { AuthFormError, AuthSuccess } from "./auth-shell";
import { PasswordInput } from "./password-input";

const INITIAL_STATE: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, INITIAL_STATE);
  const emailErrors = state.fieldErrors?.email;

  if (state.success) {
    return <AuthSuccess message={state.success} />;
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? <AuthFormError message={state.formError} /> : null}
      <Field id="reset-email" label="Email" errors={emailErrors}>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          required
          autoFocus
          {...describedBy("reset-email", emailErrors)}
        />
      </Field>
      <Button type="submit" variant="primary" isLoading={isPending} className="h-11 w-full">
        Inviami il link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, INITIAL_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? <AuthFormError message={state.formError} /> : null}
      <Field id="new-password" label="Nuova password" errors={errors.password} hint={`Almeno ${MIN_NEW_PASSWORD_LENGTH} caratteri.`}>
        <PasswordInput
          id="new-password"
          name="password"
          autoComplete="new-password"
          required
          autoFocus
          {...describedBy("new-password", errors.password, true)}
        />
      </Field>
      <Field id="confirm-password" label="Ripeti la password" errors={errors.confirmPassword}>
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          {...describedBy("confirm-password", errors.confirmPassword)}
        />
      </Field>
      <Button type="submit" variant="primary" isLoading={isPending} className="h-11 w-full">
        Salva la nuova password
      </Button>
    </form>
  );
}
