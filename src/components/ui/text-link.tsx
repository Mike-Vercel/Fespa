import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Ritorno alla pagina superiore (es. dalla scheda cliente alla lista). */
export function BackLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-sm text-[13px] font-medium text-ink-3 transition-colors hover:text-ink",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-x-0.5">
        ←
      </span>
      {children}
    </Link>
  );
}

/** Link testuale discreto (es. "Vedi tutti") con freccia che si sposta al passaggio del mouse. */
export function TextLink({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline",
        className,
      )}
      {...props}
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}
