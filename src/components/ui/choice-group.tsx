"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChoiceOption<TValue extends string | number | boolean> = {
  value: TValue;
  label: ReactNode;
  description?: string;
};

type ChoiceGroupProps<TValue extends string | number | boolean> = {
  name: string;
  legend: string;
  hint?: ReactNode;
  options: ChoiceOption<TValue>[];
  value: TValue | null;
  onChange: (value: TValue) => void;
  errors?: string[];
  /** "pills" per scelte brevi (numeri, sì/no), "cards" per opzioni con descrizione. */
  variant?: "pills" | "cards";
};

/**
 * Gruppo di scelte con radio native (accessibili, navigabili con le frecce) stilizzate come pulsanti.
 */
export function ChoiceGroup<TValue extends string | number | boolean>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  errors,
  variant = "pills",
}: ChoiceGroupProps<TValue>) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={errors?.length ? errorId : hint ? hintId : undefined}
    >
      <legend className="mb-1.5 text-[13px] font-medium text-ink">{legend}</legend>
      <div className={cn(variant === "pills" ? "flex flex-wrap gap-2" : "grid gap-2 sm:grid-cols-3")}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                "cursor-pointer rounded-md border text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                variant === "pills" ? "inline-flex min-h-10 min-w-11 items-center justify-center px-3.5" : "flex flex-col gap-0.5 p-3.5",
                isSelected
                  ? "border-ink bg-ink text-on-ink"
                  : "border-control bg-surface text-ink hover:border-ink-3",
              )}
            >
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className={cn("text-xs", isSelected ? "text-on-ink/80" : "text-ink-3")}>{option.description}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      {hint && !errors?.length ? (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={errorId} className="text-xs font-medium text-rust">
          {errors[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
