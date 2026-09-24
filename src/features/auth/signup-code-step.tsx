"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/form-fields";
import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS } from "@/validation/auth";
import { resendSignupCodeAction, verifySignupCodeAction, type AuthFormState, type ResendResult } from "./actions";
import { AuthFormError, AuthSuccess } from "./auth-shell";

const INITIAL_STATE: AuthFormState = {};

type SignupCodeStepProps = {
  email: string;
  /** Messaggio in cima: perché serve il codice (o perché l'invio non è riuscito). */
  notice?: { tone: "success" | "error"; message: string };
  /** Secondi prima di poter chiedere un nuovo codice. */
  resendAfterSeconds?: number;
  /** Pagina richiesta prima del login: dopo la conferma si va lì (se è dell'area giusta). */
  nextPath?: string;
  /** Torna al form di partenza (es. email scritta male). */
  back: { label: string; onClick: () => void };
};

/**
 * Conferma dell'email con il codice ricevuto: dopo la registrazione, oppure al login
 * di chi si era registrato senza confermare.
 * autocomplete="one-time-code" permette a iPhone (e alle tastiere che lo supportano) di proporre
 * il codice appena arriva; all'ultima cifra il form parte da solo.
 */
export function SignupCodeStep({
  email,
  notice = {
    tone: "success",
    message: `Ti abbiamo inviato un codice di conferma a ${email}. Inseriscilo qui sotto: vale per poco tempo.`,
  },
  resendAfterSeconds = RESEND_COOLDOWN_SECONDS,
  nextPath,
  back,
}: SignupCodeStepProps) {
  const [state, formAction, isVerifying] = useActionState(verifySignupCodeAction, INITIAL_STATE);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(resendAfterSeconds);
  const [resendResult, setResendResult] = useState<ResendResult | null>(null);
  const [isResending, startResend] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function handleCodeChange(value: string) {
    // Solo cifre: chi incolla "123 456" o "Codice: 123456" ottiene comunque il codice pulito.
    const digits = value.replace(/\D/g, "");
    setCode(digits);
    if (digits.length === OTP_LENGTH && !isVerifying) {
      // Dopo il render, così il form invia il valore aggiornato.
      window.setTimeout(() => formRef.current?.requestSubmit(), 0);
    }
  }

  function resend() {
    startResend(async () => {
      const result = await resendSignupCodeAction(email);
      setResendResult(result);
      if (result.ok) {
        setCode("");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {notice.tone === "success" ? <AuthSuccess message={notice.message} /> : <AuthFormError message={notice.message} />}

      <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
        {state.formError ? <AuthFormError message={state.formError} /> : null}
        <input type="hidden" name="email" value={email} />
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
        <Field id="signup-code" label="Codice di conferma" errors={errors.code}>
          <Input
            id="signup-code"
            name="code"
            value={code}
            onChange={(event) => handleCodeChange(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            placeholder={"0".repeat(OTP_LENGTH)}
            autoFocus
            className="h-14 text-center font-serif text-[28px] tracking-[0.45em] tabular placeholder:text-ink-3/40"
            {...describedBy("signup-code", errors.code)}
          />
        </Field>
        <Button type="submit" variant="primary" isLoading={isVerifying} className="h-11 w-full">
          {isVerifying ? "Verifica in corso…" : "Conferma"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center text-[13px] text-ink-3 lg:items-start lg:text-left">
        <p>
          Non è arrivato? Controlla lo spam, oppure{" "}
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || isResending}
            className="font-medium text-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline"
          >
            {isResending ? "invio in corso…" : cooldown > 0 ? `reinvia tra ${cooldown}s` : "reinvia il codice"}
          </button>
        </p>
        {resendResult ? (
          <p role="status" className={resendResult.ok ? "text-accent-strong" : "text-rust"}>
            {resendResult.message}
          </p>
        ) : null}
        <button type="button" onClick={back.onClick} className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          {back.label}
        </button>
      </div>
    </div>
  );
}
