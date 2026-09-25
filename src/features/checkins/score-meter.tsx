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

export type ScoreTone = "good" | "fair" | "concerning";

/**
 * Lettura del valore secondo il significato della scala, non del numero: per energia, sonno e
 * alimentazione più alto è meglio, per lo stress è il contrario (5/5 di stress è un segnale negativo).
 */
export function scoreTone(key: CheckinScaleKey, value: number): ScoreTone {
  if (isConcerningScore(key, value)) return "concerning";
  return value === 3 ? "fair" : "good";
}

const TONE_PRESENTATION: Record<ScoreTone, { bar: string; label: string }> = {
  good: { bar: "bg-kpi-green-ink", label: "buono" },
  fair: { bar: "bg-kpi-orange-ink", label: "nella media" },
  concerning: { bar: "bg-urgent", label: "da attenzionare" },
};

/** Ordine ed etichette brevi delle quattro scale nelle liste (l'etichetta intera resta nel tooltip). */
const LIST_SCALES: Array<{ key: CheckinScaleKey; shortLabel: string }> = [
  { key: "energy", shortLabel: "Energia" },
  { key: "sleepQuality", shortLabel: "Sonno" },
  { key: "nutritionAdherence", shortLabel: "Aliment." },
  { key: "stress", shortLabel: "Stress" },
];

/**
 * Le quattro scale del check-in: etichetta, valore /5 e una barra sottile.
 * Il colore ripete il significato del valore, che resta sempre scritto (mai solo colore).
 */
export function CheckinScores({ answers }: { answers: CheckinAnswers }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 sm:gap-x-4">
      {LIST_SCALES.map(({ key, shortLabel }) => {
        const scale = CHECKIN_SCALES.find((item) => item.key === key);
        const value = answers[key];
        const tone = TONE_PRESENTATION[scoreTone(key, value)];
        return (
          <div key={key} title={`${scale?.description ?? shortLabel}: ${value} su ${CHECKIN_SCALE_MAX} (${tone.label})`} className="min-w-0 sm:w-14">
            <dt className="truncate text-[13px] leading-tight text-ink-2">
              <span aria-hidden="true">{shortLabel}</span>
              <span className="sr-only">{scale?.label ?? shortLabel}</span>
            </dt>
            <dd className="mt-1">
              <span className="tabular text-[14px] font-medium leading-none text-ink">
                {value}/{CHECKIN_SCALE_MAX}
              </span>
              <span className="sr-only"> ({tone.label})</span>
              <span aria-hidden="true" className="mt-1.5 block h-[3px] w-full max-w-14 overflow-hidden rounded-full bg-line/80">
                <span className={cn("block h-full rounded-full", tone.bar)} style={{ width: `${(value / CHECKIN_SCALE_MAX) * 100}%` }} />
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
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
