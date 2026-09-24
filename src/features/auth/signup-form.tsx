"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/form-fields";
import { MIN_NEW_PASSWORD_LENGTH } from "@/validation/auth";
import { signUpAction, type AuthFormState } from "./actions";
import { AuthFormError, AuthSuccess } from "./auth-shell";
import { PasswordInput } from "./password-input";

const INITIAL_STATE: AuthFormState = {};

export function SignUpForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, isPending] = useActionState(signUpAction, INITIAL_STATE);
  const errors = state.fieldErrors ?? {};

  if (state.success) {
    return <AuthSuccess message={state.success} />;
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? <AuthFormError message={state.formError} /> : null}

      <Field id="signup-name" label="Nome e cognome" errors={errors.fullName}>
        <Input id="signup-name" name="fullName" autoComplete="name" required autoFocus {...describedBy("signup-name", errors.fullName)} />
      </Field>

      <Field id="signup-email" label="Email" errors={errors.email}>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email ?? defaultEmail}
          required
          {...describedBy("signup-email", errors.email)}
        />
      </Field>

      <Field
        id="signup-password"
        label="Password"
        errors={errors.password}
        hint={`Almeno ${MIN_NEW_PASSWORD_LENGTH} caratteri.`}
      >
        <PasswordInput
          id="signup-password"
          name="password"
          autoComplete="new-password"
          required
          {...describedBy("signup-password", errors.password, true)}
        />
      </Field>

      <Button type="submit" variant="primary" isLoading={isPending} className="mt-1 h-11 w-full">
        {isPending ? "Registrazione in corso…" : "Crea l'account"}
      </Button>
      <p className="text-xs text-ink-3">
        Dopo la conferma dell&apos;email completerai i tuoi dati. Se ti ha invitato una coach, usa la stessa email
        dell&apos;invito: il tuo account verrà collegato automaticamente.
      </p>
    </form>
  );
}
