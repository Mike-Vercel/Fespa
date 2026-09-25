"use client";

import { ArrowRight, ArrowUp, Check, CircleCheck, RotateCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { OFFICIAL_SITE_URL, SIGNUP_PATH } from "@/features/marketing/content";
import { cn } from "@/lib/cn";
import { TRIAL_MESSAGE_MAX_LENGTH, TRIAL_NAME_MAX_LENGTH } from "@/validation/public-trial";
import type { TrialPublicError, TrialView } from "./types";
import { useTrialChat, type TrialBusy } from "./use-trial-chat";

/*
 * Chat della Prova FESPA. Tutto ciò che conta (messaggi disponibili, fasi, riepilogo, email)
 * arriva dal server: qui c'è solo la presentazione e l'invio.
 */

const GREETING = "Ciao 👋 Raccontami qual è la cosa che oggi ti rende più difficile mantenere delle abitudini con costanza.";

function remainingLabel(view: TrialView | null): string {
  if (view?.phase === "completed") return "Prova completata";
  const remaining = view?.remaining ?? 3;
  return remaining === 1 ? "1 messaggio disponibile" : `${remaining} messaggi disponibili`;
}

function Avatar() {
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_4px_14px_-6px_rgb(106_79_224/0.45)] ring-1 ring-[#15172b]/5">
      <Image src="/images/brand/logo-sidebar.webp" alt="" width={36} height={36} className="size-8 object-contain" />
    </span>
  );
}

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar />
      <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-md bg-[#f3f1fb] px-4 py-3 text-[15px] leading-relaxed text-[#1d1f33]">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-md bg-[#15172b] px-4 py-3 text-[15px] leading-relaxed text-white", pending && "opacity-70")}>
        {children}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-start gap-3" role="status">
      <Avatar />
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-[#f3f1fb] px-4 py-3 text-[14px] text-[#5d5f6e]">
        FESPA AI sta scrivendo
        <span aria-hidden="true" className="trial-typing flex gap-1">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}

function ErrorNotice({ error, onRetry, busy }: { error: TrialPublicError; onRetry?: () => void; busy: boolean }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e7c6cf] bg-[#fdf3f5] px-4 py-3 text-[14px] text-[#8a2d45]">
      <span className="min-w-0 flex-1">{error.message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-[#15172b] ring-1 ring-[#15172b]/10 disabled:opacity-60"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Riprova
        </button>
      ) : null}
    </div>
  );
}

function LeadCard({
  onSubmit,
  busy,
  fieldErrors,
}: {
  onSubmit: (lead: { name: string; email: string; privacyConsent: boolean }) => void;
  busy: boolean;
  fieldErrors?: Record<string, string[]>;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ name, email, privacyConsent: consent });
  };
  const fieldError = (field: string) => fieldErrors?.[field]?.[0];

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-[#e3dcf7] bg-white p-5 shadow-[0_12px_30px_-20px_rgb(106_79_224/0.5)]">
      <p className="font-serif text-[1.3rem] leading-tight text-[#15172b]">Prima di preparare il riepilogo…</p>
      <p className="mt-1 text-[14.5px] text-[#5d5f6e]">Come ti chiami e dove vuoi riceverlo?</p>

      <div className="mt-4 grid gap-3 min-[520px]:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#2b2d3d]" htmlFor={`${id}-name`}>
            Nome
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="given-name"
            maxLength={TRIAL_NAME_MAX_LENGTH}
            aria-invalid={fieldError("name") ? true : undefined}
            aria-describedby={fieldError("name") ? `${id}-name-error` : undefined}
            className="h-11 rounded-xl border border-[#dcd7ea] bg-white px-3.5 text-[15px] font-normal text-[#15172b] outline-none transition focus:border-[#7c5cf2] focus:ring-3 focus:ring-[#7c5cf2]/20"
          />
          {fieldError("name") ? (
            <span id={`${id}-name-error`} className="text-[12.5px] text-[#a3264a]">
              {fieldError("name")}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#2b2d3d]" htmlFor={`${id}-email`}>
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            aria-invalid={fieldError("email") ? true : undefined}
            aria-describedby={fieldError("email") ? `${id}-email-error` : undefined}
            className="h-11 rounded-xl border border-[#dcd7ea] bg-white px-3.5 text-[15px] font-normal text-[#15172b] outline-none transition focus:border-[#7c5cf2] focus:ring-3 focus:ring-[#7c5cf2]/20"
          />
          {fieldError("email") ? (
            <span id={`${id}-email-error`} className="text-[12.5px] text-[#a3264a]">
              {fieldError("email")}
            </span>
          ) : null}
        </div>
      </div>

      <label className="mt-4 flex items-start gap-3 text-[13px] leading-snug text-[#4d4f5e]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          aria-invalid={fieldError("privacyConsent") ? true : undefined}
          aria-describedby={fieldError("privacyConsent") ? `${id}-consent-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-[#6a4fe0]"
        />
        <span>
          Acconsento al trattamento di nome ed email per ricevere il riepilogo e gestire questa richiesta, come descritto
          nell&apos;
          <a href={`${OFFICIAL_SITE_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="font-medium text-[#5b3fc8] underline underline-offset-2">
            informativa privacy
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
          .
        </span>
      </label>
      {fieldError("privacyConsent") ? (
        <p id={`${id}-consent-error`} className="mt-1.5 text-[12.5px] text-[#a3264a]">
          {fieldError("privacyConsent")}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[20rem] text-[12.5px] text-[#6b6d7b]">Useremo questi dati per inviarti il riepilogo e gestire questa richiesta.</p>
        <button
          type="submit"
          disabled={busy}
          className="trial-send-gradient inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] font-medium text-white disabled:opacity-60"
        >
          Continua
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}

function ResultCard({ view, busy, onRetryEmail }: { view: TrialView; busy: TrialBusy; onRetryEmail: () => void }) {
  const firstName = view.lead?.name.split(/\s+/)[0] ?? "";
  return (
    <div className="rounded-2xl border border-[#e3dcf7] bg-gradient-to-br from-white to-[#f6f3fd] p-5">
      <p className="font-serif text-[1.35rem] leading-tight text-[#15172b]">Fatto{firstName ? `, ${firstName}` : ""}.</p>
      <p className="mt-1 text-[14.5px] text-[#5d5f6e]">Ho preparato un piccolo riepilogo di quello che mi hai raccontato.</p>
      {view.result ? (
        <ul className="mt-4 flex flex-col gap-2.5">
          {view.result.insights.map((insight) => (
            <li key={insight} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-[#2b2d3d]">
              <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8efe6]">
                <Check className="size-3 text-[#3d6842]" strokeWidth={3} />
              </span>
              {insight}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 border-t border-[#15172b]/8 pt-3 text-[14px]" aria-live="polite">
        {view.email.status === "sent" && view.lead ? (
          <p className="text-[#3d6842]">
            Ti abbiamo inviato una copia a <strong className="font-semibold">{view.lead.email}</strong>.
          </p>
        ) : view.email.status === "sending" || busy === "email" ? (
          <p className="text-[#5d5f6e]">Sto inviando il riepilogo…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-[#8a2d45]">Non siamo riusciti a inviare il riepilogo.</p>
            {view.email.canRetry ? (
              <button
                type="button"
                onClick={onRetryEmail}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-[#15172b] ring-1 ring-[#15172b]/10 disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Riprova
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedCard() {
  return (
    <div className="rounded-2xl bg-[#15172b] p-5 text-white">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <CircleCheck aria-hidden="true" className="size-5 text-[#9fe0a6]" />
        Prova completata
      </p>
      <p className="mt-1 text-[14px] text-white/75">Hai utilizzato i 3 messaggi gratuiti.</p>
      <p className="mt-3 font-serif text-[1.25rem]">Vuoi continuare?</p>
      <Link
        href={SIGNUP_PATH}
        className="trial-send-gradient mt-3 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white"
      >
        Inizia gratuitamente
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      <p className="mt-3 text-[13px] text-white/65">Crea il tuo account e continua da dove hai lasciato.</p>
    </div>
  );
}

export function TrialChat() {
  const { view, busy, error, pendingText, send, submitLead, resume, retryEmail } = useTrialChat();
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();

  const phase = view?.phase ?? "ready";
  const completed = phase === "completed";
  const canWrite = !completed && phase !== "lead_required" && phase !== "awaiting_reply" && busy === null;
  const showTyping = busy === "send" || busy === "resume" || (busy === "lead" && !error) || (view?.pending ?? false);
  const needsResume = phase === "awaiting_reply" && !view?.pending && busy === null;

  // Nuovi contenuti: la chat scorre in fondo (solo il suo contenitore, non la pagina).
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [view, pendingText, busy, error]);

  const autosize = () => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canWrite || !draft.trim()) return;
    const text = draft;
    setDraft("");
    requestAnimationFrame(autosize);
    const stored = await send(text);
    if (!stored) {
      // Il server non l'ha registrato (rete, limite, errore): il testo torna nel campo.
      setDraft(text);
      requestAnimationFrame(autosize);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  const retry = error?.retryable ? (phase === "awaiting_reply" ? resume : error.kind === "email_failed" ? retryEmail : undefined) : undefined;
  const showError = error && error.kind !== "validation" && !(completed && error.kind === "email_failed");

  return (
    <div className="trial-chat flex flex-col overflow-hidden rounded-[1.75rem] border border-[#15172b]/[0.06] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#15172b]/[0.07] px-5 py-4 min-[640px]:px-6">
        <div className="flex items-center gap-3">
          <Image src="/images/brand/logo-sidebar.webp" alt="" width={40} height={40} className="size-10 object-contain" />
          <div>
            <p className="text-[16px] font-semibold text-[#15172b]">FESPA AI</p>
            <p className="flex items-center gap-1.5 text-[12.5px] text-[#5d5f6e]">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#34c26b]" />
              Online
            </p>
          </div>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-[#f1eefc] px-3.5 py-2 text-[13px] font-medium text-[#2b2d3d]" aria-live="polite">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#7c5cf2] ring-3 ring-[#7c5cf2]/20" />
          {remainingLabel(view)}
        </p>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-label="Conversazione con FESPA AI"
        aria-busy={busy !== null}
        className="trial-log flex min-h-[9rem] flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 min-[640px]:px-6"
      >
        <AssistantBubble>{GREETING}</AssistantBubble>
        {view?.messages.map((message) =>
          message.role === "assistant" ? (
            <AssistantBubble key={message.id}>{message.content}</AssistantBubble>
          ) : (
            <UserBubble key={message.id}>{message.content}</UserBubble>
          ),
        )}
        {pendingText ? <UserBubble pending>{pendingText}</UserBubble> : null}
        {showTyping ? <Typing /> : null}

        {phase === "lead_required" ? (
          <LeadCard onSubmit={(lead) => void submitLead(lead)} busy={busy !== null} fieldErrors={error?.kind === "validation" ? error.fieldErrors : undefined} />
        ) : null}

        {needsResume && !error ? (
          <ErrorNotice error={{ kind: "ai_failed", message: "La risposta non è arrivata.", retryable: true }} onRetry={() => void resume()} busy={busy !== null} />
        ) : null}
        {showError ? <ErrorNotice error={error} onRetry={retry ? () => void retry() : undefined} busy={busy !== null} /> : null}

        {completed && view ? (
          <>
            <ResultCard view={view} busy={busy} onRetryEmail={() => void retryEmail()} />
            <CompletedCard />
          </>
        ) : null}
      </div>

      <form onSubmit={submit} className="trial-input border-t border-[#15172b]/[0.05] bg-white px-4 pb-4 pt-3 min-[640px]:px-5 min-[640px]:pb-5">
        <div className={cn("flex items-end gap-2 rounded-[1.4rem] border border-[#dcd7ea] bg-white py-1.5 pl-4 pr-1.5 transition focus-within:border-[#7c5cf2] focus-within:ring-3 focus-within:ring-[#7c5cf2]/15", !canWrite && "bg-[#f7f6fa]")}>
          <label htmlFor={inputId} className="sr-only">
            Scrivi il tuo messaggio
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              autosize();
            }}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={TRIAL_MESSAGE_MAX_LENGTH}
            disabled={!canWrite}
            placeholder={completed ? "Prova completata" : phase === "lead_required" ? "Inserisci nome ed email per continuare" : "Scrivi il tuo messaggio..."}
            className="max-h-[8.25rem] min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-snug text-[#15172b] outline-none placeholder:text-[#8a8c99] disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canWrite || !draft.trim()}
            aria-label="Invia messaggio"
            className="trial-send-gradient flex size-11 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" className="size-5" strokeWidth={2.2} />
          </button>
        </div>
      </form>
    </div>
  );
}
