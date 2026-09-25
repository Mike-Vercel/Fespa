import { Sparkles } from "lucide-react";
import { DISPLAY_TITLE_CLASSES } from "@/components/shell/page-header";
import { cn } from "@/lib/cn";

/**
 * Intestazione di Coach AI. Su mobile resta solo per le tecnologie assistive:
 * lo spazio va alla conversazione, come in un'app di chat.
 */
export function CoachAIHeader() {
  return (
    <header className="sr-only lg:not-sr-only lg:mb-7">
      <h1 className={cn(DISPLAY_TITLE_CLASSES, "flex items-center gap-3")}>
        Coach AI
        <Sparkles aria-hidden="true" className="size-9 text-brand-violet 2xl:size-10" strokeWidth={1.6} />
      </h1>
      <p className="mt-2.5 max-w-[42rem] text-[16px] leading-relaxed text-pretty text-ink-2 sm:text-[17px]">
        La tua assistente AI per supportarti nel lavoro con le tue clienti.
        <br className="hidden xl:inline" /> Chiedi, analizza, crea piani, ottieni idee e approfondimenti personalizzati.
      </p>
    </header>
  );
}
