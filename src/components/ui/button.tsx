import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "ai" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 select-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-on-ink hover:bg-ink-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-hover",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  ai: "border border-accent/25 bg-accent-soft text-accent-strong hover:border-accent/45 hover:bg-accent-soft/70",
  danger: "text-rust hover:bg-rust-soft",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  icon: "size-10",
};

/** Classi del bottone, riusabili anche su <Link> per avere lo stesso aspetto. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra un piccolo loader inline e disabilita il bottone. */
  isLoading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  isLoading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
