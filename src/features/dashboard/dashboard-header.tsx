import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { DISPLAY_TITLE_CLASSES } from "@/components/shell/page-header";
import { cn } from "@/lib/cn";

type DashboardHeaderProps = {
  /** id dell'intestazione: il benvenuto a tutto schermo atterra sul suo `data-slot="title"`. */
  id: string;
  greeting: string;
  name: string;
  summary: string;
  briefing: string[];
  className?: string;
};

/** Saluto grande ed editoriale, la frase su cosa c'è da fare e, a destra, il briefing del giorno. */
export function DashboardHeader({ id, greeting, name, summary, briefing, className }: DashboardHeaderProps) {
  return (
    <header id={id} className={cn("flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between xl:gap-10", className)}>
      <div className="min-w-0">
        <h1 data-slot="title" className={DISPLAY_TITLE_CLASSES}>
          {greeting} <span className="brand-gradient-text">{name}</span>
        </h1>
        <p data-slot="description" className="mt-2.5 max-w-[38rem] text-[16px] leading-relaxed text-pretty text-ink-2 sm:text-[17px]">
          {summary}
        </p>
      </div>
      <AiDailyBriefing lines={briefing} />
    </header>
  );
}

/**
 * "AI Briefing di oggi": riepilogo costruito dai dati della dashboard (vedi briefing.ts), senza
 * chiamare il modello. Porta alle clienti da controllare, dove si agisce.
 */
function AiDailyBriefing({ lines }: { lines: string[] }) {
  return (
    <Link
      href="#da-controllare"
      title="Riepilogo calcolato dai dati di oggi"
      className="dashboard-reveal dashboard-reveal--metrics group flex w-full shrink-0 items-center gap-4 rounded-2xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_1px_2px_rgb(31_29_26/0.04),0_16px_36px_-24px_rgb(58_48_120/0.35)] backdrop-blur-md transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(31_29_26/0.05),0_22px_44px_-24px_rgb(58_48_120/0.45)] xl:mt-2 xl:w-[24.5rem]"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Sparkles aria-hidden="true" className="size-[18px] text-brand-violet" strokeWidth={1.8} />
          AI Briefing di oggi
        </span>
        <span className="sr-only">(calcolato dai dati di oggi, vai alle clienti da controllare)</span>
        <span className="mt-2.5 flex flex-col gap-1 text-[13.5px] leading-snug text-ink-2">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        strokeWidth={1.75}
        className="size-5 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
      />
    </Link>
  );
}
