import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SettingsSectionProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
};

/**
 * Sezione della scheda del profilo: a sinistra cosa si cambia e perché, a destra il form
 * (uno sotto l'altro su schermi stretti). Le sezioni stanno nella stessa scheda, separate da una linea.
 */
export function SettingsSection({ id, icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className="grid gap-5 px-6 py-7 sm:px-8 xl:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)] xl:gap-8">
      <div className="flex items-start gap-3 xl:flex-col xl:gap-2">
        <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-2">
          <Icon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="font-serif text-xl leading-snug text-ink">
            {title}
          </h2>
          <div className="mt-1 text-[13px] leading-relaxed text-pretty text-ink-3">{description}</div>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
