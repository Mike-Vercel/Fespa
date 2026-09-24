import { cn } from "@/lib/cn";
import { CHECKIN_SCALE_MAX, CHECKIN_SCALES, type CheckinAnswers, type CheckinScaleKey } from "@/validation/checkin";

/** Soglia oltre la quale un valore merita attenzione (≤ 2 sulle scale positive, ≥ 4 sullo stress). */
const CONCERNING_LOW = 2;
const CONCERNING_HIGH = 4;

export function isConcerningScore(key: CheckinScaleKey, value: number): boolean {
  const scale = CHECKIN_SCALES.find((item) => item.key === key);
  if (!scale) return false;
  return scale.higherIsBetter ? value <= CONCERNING_LOW : value >= CONCERNING_HIGH;
}

/** Punteggio 1–5 come piccola barra a segmenti, con valore testuale per l'accessibilità. */
export function ScoreMeter({
  scaleKey,
  value,
  compact = false,
}: {
  scaleKey: CheckinScaleKey;
  value: number;
  compact?: boolean;
}) {
  const scale = CHECKIN_SCALES.find((item) => item.key === scaleKey);
  const concerning = isConcerningScore(scaleKey, value);
  const label = scale?.label ?? scaleKey;

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-1" : "gap-1.5")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("truncate text-ink-3", compact ? "text-xs" : "text-[13px]")}>{label}</span>
        <span className={cn("tabular font-medium", compact ? "text-xs" : "text-[13px]", concerning ? "text-amber" : "text-ink")}>
          {value}
          <span className="text-ink-3">/{CHECKIN_SCALE_MAX}</span>
        </span>
      </div>
      <div aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: CHECKIN_SCALE_MAX }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full",
              index < value ? (concerning ? "bg-amber" : "bg-ink-3") : "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Le tre scale più indicative in formato compatto (liste e dashboard). */
export function CompactScores({ answers }: { answers: CheckinAnswers }) {
  return (
    <div className="grid w-full max-w-[260px] grid-cols-3 gap-3">
      <ScoreMeter scaleKey="energy" value={answers.energy} compact />
      <ScoreMeter scaleKey="sleepQuality" value={answers.sleepQuality} compact />
      <ScoreMeter scaleKey="stress" value={answers.stress} compact />
    </div>
  );
}

/** Estratto testuale per le liste: prima le difficoltà, altrimenti i successi. */
export function checkinExcerpt(answers: CheckinAnswers | null, maxLength = 140): string | null {
  if (!answers) return null;
  const text = (answers.challenges || answers.wins).trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
