import { cn } from "@/lib/cn";
import type { AIStatus } from "@/types/domain";

const PRESENTATION: Record<AIStatus["mode"], { label: string; dot: string; title: (status: AIStatus) => string }> = {
  live: {
    label: "AI attiva",
    dot: "bg-accent",
    title: (status) => (status.mode === "live" ? `Provider: ${status.providerLabel} · modello ${status.model}` : ""),
  },
  mock: {
    label: "AI in modalità demo",
    dot: "bg-amber",
    title: () => "DEMO_AI_MODE attivo: i risultati AI sono simulati e segnalati come tali",
  },
  not_configured: {
    label: "AI non configurata",
    dot: "bg-line-strong",
    title: () => "Configura AI_PROVIDER e AI_API_KEY per attivare le funzioni AI",
  },
};

/** Indicatore trasparente dello stato AI: in demo nessuno deve scambiare un mock per un modello reale. */
export function AIStatusPill({ status, className }: { status: AIStatus; className?: string }) {
  const presentation = PRESENTATION[status.mode];
  return (
    <span
      title={presentation.title(status)}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-2",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", presentation.dot)} />
      {presentation.label}
    </span>
  );
}
