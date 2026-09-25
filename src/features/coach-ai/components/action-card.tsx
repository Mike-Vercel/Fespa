"use client";

import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  FileText,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import type { ActionRequestView } from "@/types/coach-ai";
import { actionRequestAction } from "../actions";

/*
 * Scheda di un'azione preparata da Coach AI: mostra COSA cambierà e la esegue solo con la conferma.
 * Il livello di conferma arriva dal server (policy): standard, esplicita (spunta) o digitata.
 * Il server ricontrolla comunque tutto: la UI non è una barriera di sicurezza, solo chiarezza.
 */

type ActionCardProps = {
  action: ActionRequestView;
  onChange: (action: ActionRequestView) => void;
  /** Disabilita le operazioni (es. conversazione archiviata). */
  readOnly?: boolean;
};

const RISK_BADGES: Record<ActionRequestView["riskLevel"], { label: string; className: string; Icon: LucideIcon } | null> = {
  read: null,
  draft: null,
  write: { label: "Richiede conferma", className: "bg-brand-soft text-brand", Icon: Clock3 },
  high_risk: { label: "Alto rischio", className: "bg-warning-soft text-warning", Icon: ShieldAlert },
  destructive: { label: "Azione distruttiva", className: "bg-urgent-soft text-urgent", Icon: Trash2 },
};

function StatusFooter({ action }: { action: ActionRequestView }) {
  switch (action.status) {
    case "succeeded":
      return (
        <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium text-kpi-green-ink">
          <CircleCheck aria-hidden="true" className="size-[18px]" />
          {action.result?.message ?? "Operazione eseguita."}
          {action.result?.link ? (
            <Link href={action.result.link.href} className="font-medium text-brand underline-offset-4 hover:underline">
              {action.result.link.label}
            </Link>
          ) : null}
        </p>
      );
    case "cancelled":
      return (
        <p className="flex items-center gap-2 text-[14px] text-ink-3">
          <Ban aria-hidden="true" className="size-4" />
          Annullata: nessuna modifica è stata fatta.
        </p>
      );
    case "expired":
      return (
        <p className="flex items-center gap-2 text-[14px] text-ink-3">
          <CalendarClock aria-hidden="true" className="size-4" />
          Richiesta scaduta: chiedi di nuovo a Coach AI di prepararla.
        </p>
      );
    case "executing":
      return (
        <p className="flex items-center gap-2 text-[14px] text-ink-2">
          <Spinner />
          In esecuzione…
        </p>
      );
    default:
      return null;
  }
}

export function ActionCard({ action, onChange, readOnly = false }: ActionCardProps) {
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const formId = useId();

  const isOpen = action.status === "draft" || action.status === "pending";
  const canRetry = action.status === "failed" && action.error?.retryable === true;
  const interactive = !readOnly && (isOpen || canRetry);
  const badge = action.status === "draft" ? null : RISK_BADGES[action.riskLevel];
  const confirmReady =
    action.confirmation === "explicit"
      ? acknowledged
      : action.confirmation === "typed"
        ? typed.trim().toLocaleLowerCase("it-IT") === (action.typedConfirmation ?? "").trim().toLocaleLowerCase("it-IT")
        : true;

  async function run(operation: Parameters<typeof actionRequestAction>[0]): Promise<boolean> {
    setIsPending(true);
    setFieldError(null);
    const result = await actionRequestAction(operation);
    setIsPending(false);
    if (!result.ok) {
      const firstFieldError = Object.values(result.error.fieldErrors ?? {})[0]?.[0];
      setFieldError(firstFieldError ?? result.error.message);
      toast.error(result.error.message);
      return false;
    }
    onChange(result.data);
    return true;
  }

  function confirm() {
    void run({
      op: "confirm",
      actionId: action.id,
      acknowledged: action.confirmation === "explicit" ? acknowledged : undefined,
      typedConfirmation: action.confirmation === "typed" ? typed : undefined,
    });
  }

  async function saveEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fields = Object.fromEntries(action.editable.map((field) => [field.key, String(data.get(field.key) ?? "")]));
    if (await run({ op: "edit", actionId: action.id, fields })) setIsEditing(false);
  }

  async function copy() {
    if (!action.copyText) return;
    try {
      await navigator.clipboard.writeText(action.copyText);
      toast.success("Testo copiato.");
    } catch {
      toast.error("Non è stato possibile copiare il testo.");
    }
  }

  const destructive = action.riskLevel === "destructive";

  return (
    <section
      aria-label={action.title}
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgb(31_29_26/0.04),0_10px_28px_-20px_rgb(58_48_120/0.3)] sm:p-5",
        destructive && isOpen ? "border-urgent/35" : "border-line/80",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="flex min-w-0 items-center gap-2 text-[16px] font-semibold text-ink">
          <FileText aria-hidden="true" className={cn("size-[18px] shrink-0", destructive ? "text-urgent" : "text-brand-violet")} strokeWidth={1.9} />
          <span className="min-w-0 text-pretty">{action.title}</span>
        </h4>
        {action.status === "draft" ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-[12.5px] font-medium text-brand">
            {action.source === "automation" ? "Bozza automatica" : "Bozza"} · non inviata
          </span>
        ) : badge && isOpen ? (
          <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium", badge.className)}>
            <badge.Icon aria-hidden="true" className="size-3.5" />
            {badge.label}
          </span>
        ) : null}
      </header>

      {isEditing ? (
        <form id={formId} onSubmit={saveEdits} className="mt-4 flex flex-col gap-3">
          {action.editable.map((field) => {
            const inputId = `${formId}-${field.key}`;
            const inputClasses =
              "w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-base text-ink sm:text-[15px] focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent";
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-[13px] font-medium text-ink-2">
                  {field.label}
                </label>
                {field.kind === "textarea" ? (
                  <textarea id={inputId} name={field.key} defaultValue={field.value} maxLength={field.maxLength} rows={field.key === "text" ? 7 : 3} className={cn(inputClasses, "resize-y leading-relaxed")} />
                ) : (
                  <input id={inputId} name={field.key} type={field.kind === "date" ? "date" : "text"} defaultValue={field.value} maxLength={field.maxLength} className={cn(inputClasses, "h-11 py-0")} />
                )}
              </div>
            );
          })}
        </form>
      ) : (
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(7rem,auto)_1fr]">
          {action.fields.map((field) => (
            <div key={field.label} className={cn("flex flex-col gap-0.5 sm:contents")}>
              <dt className="text-[13px] font-medium text-ink-3 sm:pt-0.5">{field.label}</dt>
              <dd
                className={cn(
                  "min-w-0 text-[15px] text-ink",
                  field.multiline && "whitespace-pre-line rounded-xl bg-sunken/70 px-3.5 py-3 leading-relaxed text-ink-2",
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {action.warnings.length > 0 && (isOpen || action.status === "failed") ? (
        <ul className={cn("mt-4 flex flex-col gap-1.5 rounded-xl px-3.5 py-3 text-[13.5px] leading-snug", destructive ? "bg-urgent-soft text-urgent" : "bg-warning-soft/70 text-warning")}>
          {action.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {action.status === "failed" ? (
        <p role="alert" className="mt-4 flex items-start gap-2 text-[14px] font-medium text-urgent">
          <CircleX aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
          Non sono riuscito a completare l&apos;operazione: {action.error?.message}
        </p>
      ) : null}

      {interactive && !isEditing && action.confirmation === "explicit" ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line/80 px-3.5 py-3 text-[14px] text-ink">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 size-[18px] accent-[var(--color-brand)]" />
          Ho verificato i dati e confermo questa operazione.
        </label>
      ) : null}

      {interactive && !isEditing && action.confirmation === "typed" ? (
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={`${formId}-typed`} className="text-[13.5px] text-ink-2">
            Per confermare scrivi <strong className="font-semibold text-ink">{action.typedConfirmation}</strong>
          </label>
          <input
            id={`${formId}-typed`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink focus-visible:border-urgent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-urgent sm:text-[15px]"
          />
        </div>
      ) : null}

      {fieldError ? (
        <p role="alert" className="mt-3 text-[13.5px] font-medium text-urgent">
          {fieldError}
        </p>
      ) : null}

      <footer className="mt-4 flex flex-col gap-3">
        <StatusFooter action={action} />
        {interactive ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isPending}>
                  Annulla modifica
                </Button>
                <Button variant="primary" type="submit" form={formId} isLoading={isPending} icon={<Check aria-hidden="true" className="size-4" />}>
                  Salva modifiche
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => void run({ op: "cancel", actionId: action.id })} disabled={isPending}>
                  {action.status === "draft" ? "Scarta" : "Annulla"}
                </Button>
                {isOpen && action.editable.length > 0 ? (
                  <Button variant="secondary" onClick={() => setIsEditing(true)} disabled={isPending} icon={<Pencil aria-hidden="true" className="size-4" />}>
                    Modifica
                  </Button>
                ) : null}
                {action.copyText ? (
                  <Button variant="secondary" onClick={() => void copy()} disabled={isPending} icon={<Copy aria-hidden="true" className="size-4" />}>
                    Copia
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onClick={confirm}
                  isLoading={isPending}
                  disabled={!confirmReady}
                  icon={canRetry ? <RotateCcw aria-hidden="true" className="size-4" /> : undefined}
                  className={cn(destructive && "bg-urgent text-white hover:bg-urgent/90")}
                >
                  {canRetry ? "Riprova" : action.confirmLabel}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </footer>
    </section>
  );
}
