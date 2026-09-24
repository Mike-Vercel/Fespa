import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SettingsCardProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
};

/** Riquadro del profilo: a sinistra cosa si cambia e perché, a destra il form (uno sotto l'altro su mobile). */
export function SettingsCard({ id, icon: Icon, title, description, children }: SettingsCardProps) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface shadow-raised">
      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
        <div className="flex flex-col gap-2">
          <span aria-hidden="true" className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink-2">
            <Icon className="size-[18px]" strokeWidth={1.8} />
          </span>
          <h2 id={id} className="font-serif text-xl leading-snug text-ink">
            {title}
          </h2>
          <div className="text-[13px] leading-relaxed text-pretty text-ink-3">{description}</div>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
