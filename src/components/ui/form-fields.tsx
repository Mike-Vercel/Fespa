import type { ComponentProps, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/*
 * Campi di form accessibili: label sempre visibile, errore collegato con aria-describedby,
 * aria-invalid quando serve. Select e date sono nativi: accessibili e ottimi su mobile.
 */

const CONTROL =
  "w-full rounded-md border border-control bg-surface px-3 text-[15px] text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:opacity-60 aria-invalid:border-rust";

type FieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  className?: string;
  children: ReactNode;
};

export function Field({ id, label, hint, errors, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !errors?.length ? (
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-xs font-medium text-rust">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Attributi ARIA che collegano un controllo al suo messaggio d'errore o suggerimento. */
export function describedBy(id: string, errors?: string[], hasHint = false) {
  if (errors?.length) {
    return { "aria-invalid": true, "aria-describedby": `${id}-error` } as const;
  }
  return hasHint ? ({ "aria-describedby": `${id}-hint` } as const) : {};
}

/** `ref` compreso (React 19: è una prop normale), per chi deve leggere o misurare il campo. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "h-10 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}
