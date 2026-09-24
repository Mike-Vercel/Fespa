import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className, id }: PageHeaderProps) {
  return (
    <header id={id} className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p data-slot="eyebrow" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">
            {eyebrow}
          </p>
        ) : null}
        <h1
          data-slot="title"
          className="mt-1.5 font-serif text-[30px] leading-[1.15] tracking-[-0.01em] text-ink text-balance sm:text-[36px]"
        >
          {title}
        </h1>
        {description ? (
          <div data-slot="description" className="mt-2 max-w-2xl text-[15px] text-pretty text-ink-2">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Titolo di sezione all'interno di una pagina, con eventuale link/azione a destra. */
export function SectionHeader({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
      <div className="min-w-0">
        <h2 id={id} className="font-serif text-xl leading-snug text-ink">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
