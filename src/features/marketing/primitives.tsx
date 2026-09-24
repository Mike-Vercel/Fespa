import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Contenitore orizzontale comune a tutte le sezioni (stessa larghezza e stessi margini). */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

type SectionIntroProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  /** Su sfondo scuro i colori del testo si invertono. */
  tone?: "light" | "dark";
  className?: string;
};

export function SectionIntro({ id, eyebrow, title, description, tone = "light", className }: SectionIntroProps) {
  const isDark = tone === "dark";
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className={cn("text-xs font-semibold uppercase tracking-[0.18em]", isDark ? "text-accent-soft" : "text-accent-strong")}>
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cn(
          "mt-3 font-serif text-[32px] leading-[1.1] tracking-[-0.015em] text-balance sm:text-[42px]",
          isDark ? "text-on-ink" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-4 text-[17px] leading-relaxed text-pretty", isDark ? "text-on-ink/75" : "text-ink-2")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Link verso un sito esterno: nuova scheda, annunciata anche agli screen reader. */
export function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1", className)}>
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only"> (si apre in una nuova scheda)</span>
    </a>
  );
}

/** Pulsanti grandi della landing: stessi colori del design system, area di tocco ≥ 48px. */
export const CTA_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-6 text-[15px] font-medium text-on-ink transition-colors duration-200 hover:bg-ink-hover";
export const CTA_SECONDARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-6 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-hover";
