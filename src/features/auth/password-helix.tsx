import { cn } from "@/lib/cn";

/*
 * Nastro viola a spirale che si avvolge attorno al campo password (come i nastri delle foto).
 *
 * Visto di fronte, un'elica attorno a un cilindro è un'onda: i tratti che scendono passano davanti
 * al campo, quelli che salgono dietro. Si disegna quindi la stessa onda su due strati:
 *  - "back": l'onda intera, SOTTO il campo (se ne vede solo la parte che sporge sopra e sotto);
 *  - "front": solo i tratti anteriori, SOPRA il campo e il testo.
 * L'onda scorre di un giro mentre si avvolge, così sembra ruotare. Solo decorazione (aria-hidden).
 */

const UNITS_PER_TURN = 100;
/** Giri visibili nel campo + uno per lato, per poter far scorrere l'onda senza scoprire i bordi. */
const TOTAL_TURNS = 7;
const VIEW_WIDTH = UNITS_PER_TURN * TOTAL_TURNS;
const VIEW_HEIGHT = 100;
const CENTER = VIEW_HEIGHT / 2;
const AMPLITUDE = 42;
const SAMPLE_STEP = 2.5;
/** Quarto di giro: i tratti anteriori vanno da -¼ a +¼ di ogni giro (dove l'onda scende). */
const QUARTER_TURN = UNITS_PER_TURN / 4;

function waveY(x: number): number {
  return CENTER + AMPLITUDE * Math.sin((2 * Math.PI * x) / UNITS_PER_TURN);
}

function wavePath(from: number, to: number): string {
  const points: string[] = [];
  for (let x = from; x < to; x += SAMPLE_STEP) {
    points.push(`${x.toFixed(1)} ${waveY(x).toFixed(2)}`);
  }
  points.push(`${to.toFixed(1)} ${waveY(to).toFixed(2)}`);
  return `M ${points.join(" L ")}`;
}

const FULL_WAVE = wavePath(0, VIEW_WIDTH);
const FRONT_STRANDS = Array.from({ length: TOTAL_TURNS + 1 }, (_, turn) => {
  const middle = turn * UNITS_PER_TURN;
  return wavePath(Math.max(0, middle - QUARTER_TURN), Math.min(VIEW_WIDTH, middle + QUARTER_TURN));
}).join(" ");

type PasswordHelixProps = {
  layer: "back" | "front";
  /** forward: si avvolge da sinistra a destra (mostra); backward: da destra a sinistra (nascondi). */
  direction: "forward" | "backward";
  /** Prefisso univoco per gli id dei gradienti SVG (più campi password nella stessa pagina). */
  idPrefix: string;
};

export function PasswordHelix({ layer, direction, idPrefix }: PasswordHelixProps) {
  const gradientId = `${idPrefix}-${layer}`;
  const isForward = direction === "forward";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "password-helix pointer-events-none absolute inset-x-0 -inset-y-3",
        layer === "back" ? "z-0" : "z-20",
        isForward ? "password-helix-wrap-forward" : "password-helix-wrap-backward",
      )}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className={cn(
          "absolute inset-y-0 -left-[20%] h-full w-[140%] overflow-visible",
          isForward ? "password-helix-spin-forward" : "password-helix-spin-backward",
        )}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="0.5" stopColor="#8b6cf0" />
            <stop offset="1" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        {/* Corpo del nastro + un filo di luce: lo spessore resta costante anche se l'onda si allarga. */}
        <path
          d={layer === "back" ? FULL_WAVE : FRONT_STRANDS}
          fill="none"
          stroke={`url(#${gradientId})`}
          // I tratti dietro il campo sono più tenui: danno profondità all'avvolgimento.
          strokeOpacity={layer === "back" ? 0.5 : 0.95}
          strokeWidth={7}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={layer === "back" ? FULL_WAVE : FRONT_STRANDS}
          fill="none"
          stroke="white"
          strokeOpacity={layer === "back" ? 0.25 : 0.55}
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
