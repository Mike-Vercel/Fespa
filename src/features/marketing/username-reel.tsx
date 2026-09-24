"use client";

import * as React from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { cn } from "@/lib/cn";

const DEFAULT_NAMES = [
  "ritrova-il-tuo-equilibrio",
  "mangia-senza-sensi-di-colpa",
  "ascolta-il-tuo-corpo",
  "costruisci-nuove-abitudini",
  "sentiti-bene-ogni-giorno",
  "torna-a-fidarti-di-te",
];

type Phase = "spinning" | "landed" | "done";

type UsernameReelProps = {
  names?: string[];
  finalName?: string;
  prefix?: string;
  rows?: number;
  cycles?: number;
  spinDuration?: number;
  spinDelay?: number;
  highlightColor?: string;
  placeholderColor?: string;
  surfaceColor?: string;
  loop?: boolean;
  onComplete?: () => void;
  className?: string;
};

/** Numeri pseudo-casuali ripetibili (mulberry32): stesso seme, stessa sequenza. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mescola le frasi in modo ripetibile. Con Math.random() il server e il browser producevano
 * ordini diversi e React segnalava un errore di idratazione, ricostruendo il componente.
 */
function shuffled<T>(input: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...input];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

export function UsernameReel({
  names = DEFAULT_NAMES,
  finalName = "scegli-il-tuo-percorso",
  prefix = "fespa/",
  rows = 5,
  cycles = 3,
  spinDuration = 3.8,
  spinDelay = 0,
  highlightColor = "#4a6645",
  placeholderColor = "#77736b",
  surfaceColor = "#ffffff",
  loop = true,
  onComplete,
  className,
}: UsernameReelProps) {
  const [runId, setRunId] = React.useState(0);
  const [rowHeight, setRowHeight] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("spinning");
  const measureRef = React.useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const half = Math.floor(rows / 2);
  const reel = React.useMemo(() => {
    const rotation = names.length ? runId % names.length : 0;
    const rotatedNames = [...names.slice(rotation), ...names.slice(0, rotation)];
    const scrollingNames = rotatedNames.filter((name) => name !== finalName);
    const list: string[] = [];
    // Un seme diverso per ogni giro e ogni ripartenza (runId): l'ordine cambia, ma è uguale su server e browser.
    const seedBase = (runId + 1) * 1000;
    for (let cycle = 0; cycle < Math.max(1, cycles); cycle += 1) list.push(...shuffled(scrollingNames, seedBase + cycle));
    return [...list, finalName, ...shuffled(scrollingNames, seedBase + cycles).slice(0, half)];
  }, [cycles, finalName, half, names, runId]);
  const finalIndex = reel.indexOf(finalName);
  const startIndex = Math.max(half, finalIndex - Math.max(2, half + 1));
  const viewportHeight = rowHeight * rows;

  const offsetFor = React.useCallback(
    (index: number) => viewportHeight / 2 - (index * rowHeight + rowHeight / 2),
    [rowHeight, viewportHeight],
  );

  React.useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => {
      if (element.offsetHeight && element.offsetHeight !== rowHeight) setRowHeight(element.offsetHeight);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [rowHeight]);

  React.useEffect(() => {
    if (!rowHeight) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      y.set(offsetFor(finalIndex));
      const frame = window.requestAnimationFrame(() => {
        setPhase("done");
        onComplete?.();
      });
      return () => window.cancelAnimationFrame(frame);
    }

    y.set(offsetFor(startIndex));
    const phaseFrame = window.requestAnimationFrame(() => setPhase("spinning"));
    let finishTimer: number | undefined;
    let loopTimer: number | undefined;
    let controls: { stop: () => void } | undefined;
    const spinTimer = window.setTimeout(() => {
      controls = animate(y, offsetFor(finalIndex), {
        duration: spinDuration,
        ease: [0.65, 0, 0.35, 1],
        onComplete: () => {
          setPhase("landed");
          onComplete?.();
          finishTimer = window.setTimeout(() => {
            setPhase("done");
            if (loop) loopTimer = window.setTimeout(() => setRunId((current) => current + 1), 2600);
          }, 700);
        },
      });
    }, spinDelay);

    return () => {
      controls?.stop();
      window.cancelAnimationFrame(phaseFrame);
      window.clearTimeout(spinTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(loopTimer);
    };
  }, [finalIndex, loop, offsetFor, onComplete, rowHeight, runId, spinDelay, spinDuration, startIndex, y]);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden text-ink", className)} style={{ backgroundColor: surfaceColor }}>
      <div className="username-reel__content flex w-full min-w-0 max-w-full items-center font-serif text-[clamp(0.9rem,4.2vw,4.4rem)] leading-none tracking-[-0.035em]">
        <span className="shrink-0 whitespace-nowrap">{prefix}</span>
        <div className="username-reel__viewport relative min-w-0 flex-1 overflow-hidden" style={{ height: viewportHeight || "1.2em" }}>
          <div ref={measureRef} aria-hidden="true" className="invisible absolute whitespace-nowrap leading-[1.2]">
            {finalName}
          </div>
          <motion.div style={{ y }} className={cn("username-reel__track will-change-transform", !rowHeight && "opacity-0")}>
            {reel.map((name, index) => {
              const isFinal = index === finalIndex;
              return (
                <div
                  key={`${name}-${index}`}
                  className="whitespace-nowrap leading-[1.2] transition-[color,opacity] duration-500"
                  style={{
                    color: isFinal && phase !== "spinning" ? highlightColor : placeholderColor,
                    opacity: !isFinal && phase !== "spinning" ? 0 : 1,
                    textShadow: isFinal && phase === "landed" ? `0 0 24px ${highlightColor}` : "none",
                    transform: isFinal && phase === "landed" ? "scale(1.025)" : "scale(1)",
                  }}
                >
                  {name}
                </div>
              );
            })}
          </motion.div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1.3em]" style={{ background: `linear-gradient(to bottom, ${surfaceColor}, transparent)` }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.3em]" style={{ background: `linear-gradient(to top, ${surfaceColor}, transparent)` }} />
        </div>
      </div>
    </div>
  );
}
