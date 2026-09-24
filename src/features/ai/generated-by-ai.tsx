import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

/**
 * Intestazione comune ai contenuti generati: chi li ha prodotti e quando.
 * In modalità demo lo dice esplicitamente: un mock non deve mai sembrare un modello reale.
 */
export function GeneratedByAI({
  label,
  model,
  isMock,
  generatedAt,
  timezone,
}: {
  label: string;
  model: string;
  isMock: boolean;
  generatedAt: string;
  timezone: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
      <Sparkles aria-hidden="true" className="size-4 text-accent" strokeWidth={1.75} />
      <span className="font-medium text-ink">{label}</span>
      <span>
        · {isMock ? "nessun modello (demo)" : model} · {formatDateTime(generatedAt, timezone)}
      </span>
      {isMock ? <Badge tone="amber">Risultato dimostrativo · non generato da AI</Badge> : null}
    </div>
  );
}
