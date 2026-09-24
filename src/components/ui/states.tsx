import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Stato vuoto: spiega perché non c'è nulla e, se possibile, cosa fare. */
export function EmptyState({ icon: Icon, title, description, action, className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink-3">
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
      </span>
      <p className="font-serif text-lg text-ink">{title}</p>
      {description ? <div className="mt-1 max-w-sm text-sm text-pretty text-ink-2">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Stato di errore: messaggio comprensibile, mai dettagli tecnici. */
export function ErrorState({ icon: Icon, title, description, action, className }: StateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-rust-soft text-rust">
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
      </span>
      <p className="font-serif text-lg text-ink">{title}</p>
      {description ? <div className="mt-1 max-w-sm text-sm text-pretty text-ink-2">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
