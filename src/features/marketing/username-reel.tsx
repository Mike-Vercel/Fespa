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
  highlightColor?: string;
  loop?: boolean;
  onComplete?: () => void;
  className?: string;
};

function shuffled<T>(input: T[]): T[] {
  return [...input].sort(() => Math.random() - 0.5);
}

export function UsernameReel({
  names = DEFAULT_NAMES,
  finalName = "scegli-il-tuo-percorso",
  prefix = "fespa/",
  rows = 5,
  cycles = 3,
  spinDuration = 3.8,
  highlightColor = "#4a6645",
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
    const list = [finalName];
    for (let cycle = 0; cycle < Math.max(1, cycles); cycle += 1) list.push(...shuffled(rotatedNames));
    return [...shuffled(rotatedNames).slice(0, half), ...list];
  }, [cycles, finalName, half, names, runId]);
  const finalIndex = half;
  const lastIndex = reel.length - 1;
  const startIndex = Math.max(finalIndex + 1, lastIndex - half);
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
    const controls = animate(y, offsetFor(finalIndex), {
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

    return () => {
      controls.stop();
      window.cancelAnimationFrame(phaseFrame);
      window.clearTimeout(finishTimer);
      window.clearTimeout(loopTimer);
    };
  }, [finalIndex, loop, offsetFor, onComplete, rowHeight, runId, spinDuration, startIndex, y]);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-white text-ink", className)}>
      <div className="flex max-w-full items-center font-serif text-[clamp(2.1rem,7vw,5.5rem)] leading-none tracking-[-0.045em] sm:text-[clamp(3.6rem,7vw,6.7rem)]">
        <span className="shrink-0 whitespace-nowrap text-ink">{prefix}</span>
        <div className="relative min-w-0 overflow-hidden" style={{ height: viewportHeight || "1.2em" }}>
          <div ref={measureRef} aria-hidden="true" className="invisible absolute whitespace-nowrap leading-[1.2]">
            {finalName}
          </div>
          <motion.div style={{ y }} className={cn("will-change-transform", !rowHeight && "opacity-0")}>
            {reel.map((name, index) => {
              const isFinal = index === finalIndex;
              return (
                <div
                  key={`${name}-${index}`}
                  className="whitespace-nowrap leading-[1.2] transition-[color,opacity] duration-500"
                  style={{
                    color: isFinal && phase !== "spinning" ? highlightColor : "#77736b",
                    opacity: !isFinal && phase !== "spinning" ? 0 : 1,
                  }}
                >
                  {name}
                </div>
              );
            })}
          </motion.div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1.3em] bg-gradient-to-b from-white via-white/70 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.3em] bg-gradient-to-t from-white via-white/70 to-transparent" />
        </div>
      </div>
    </div>
  );
}
