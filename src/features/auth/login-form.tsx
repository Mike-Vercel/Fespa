"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/form-fields";
import { requestLoginLinkAction, signInAction, type AuthFormState } from "./actions";
import { AuthFormError, AuthSuccess } from "./auth-shell";
import { PasswordInput } from "./password-input";

const INITIAL_STATE: AuthFormState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  return mode === "password" ? (
    <PasswordLoginForm nextPath={nextPath} onUseLink={() => setMode("link")} />
  ) : (
    <LoginLinkForm onUsePassword={() => setMode("password")} />
  );
}

function PasswordLoginForm({ nextPath, onUseLink }: { nextPath: string; onUseLink: () => void }) {
  const [state, formAction, isPending] = useActionState(signInAction, INITIAL_STATE);
  const emailErrors = state.fieldErrors?.email;
  const passwordErrors = state.fieldErrors?.password;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={nextPath} />
      {state.formError ? <AuthFormError message={state.formError} /> : null}

      <Field id="email" label="Email" errors={emailErrors}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          required
          autoFocus
          {...describedBy("email", emailErrors)}
        />
      </Field>

      <Field id="password" label="Password" errors={passwordErrors}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          {...describedBy("password", passwordErrors)}
        />
      </Field>

      <Button type="submit" variant="primary" isLoading={isPending} className="mt-1 h-11 w-full">
        {isPending ? "Accesso in corso…" : "Accedi"}
      </Button>
      <button type="button" onClick={onUseLink} className="self-center text-[13px] font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
        Preferisci ricevere un link di accesso via email?
      </button>
    </form>
  );
}

function LoginLinkForm({ onUsePassword }: { onUsePassword: () => void }) {
  const [state, formAction, isPending] = useActionState(requestLoginLinkAction, INITIAL_STATE);
  const emailErrors = state.fieldErrors?.email;

  if (state.success) {
    return <AuthSuccess message={state.success} />;
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? <AuthFormError message={state.formError} /> : null}
      <Field id="link-email" label="Email" errors={emailErrors} hint="Ti invieremo un link monouso: niente password da ricordare.">
        <Input
          id="link-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          required
          autoFocus
          {...describedBy("link-email", emailErrors, true)}
        />
      </Field>
      <Button type="submit" variant="primary" isLoading={isPending} className="h-11 w-full">
        Inviami il link
      </Button>
      <button type="button" onClick={onUsePassword} className="self-center text-[13px] font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
        Accedi con la password
      </button>
    </form>
  );
}
