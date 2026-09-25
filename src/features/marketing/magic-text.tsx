"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

/*
 * Testo che si "accende" parola per parola scorrendo la pagina (titolo delle Testimonianze).
 * Ogni parola passa da un'opacità di 0,2 a piena seguendo lo scroll: dal momento in cui il testo
 * entra al 90% dello schermo a quando raggiunge il 25%. Una sola copia di ogni parola (niente
 * testo duplicato per screen reader, copia e motori di ricerca). Con "riduci movimento" è subito pieno.
 */

export type MagicTextSegment = { text: string; accent?: boolean };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Preferenza "riduci movimento" letta DOPO l'idratazione: il server prepara sempre la versione animata,
 * poi il browser passa a quella ferma. Leggerla subito creerebbe una differenza con l'HTML del server
 * che React non corregge (le parole resterebbero spente).
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
}

type Word = { word: string; accent: boolean };

function WordReveal({ word, progress, range, isStatic }: { word: Word; progress: MotionValue<number>; range: [number, number]; isStatic: boolean }) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const className = cn("inline-block", word.accent && "fespa-gradient-text italic");
  if (isStatic) {
    return <span className={className}>{word.word}</span>;
  }
  return (
    <motion.span className={className} style={{ opacity }}>
      {word.word}
    </motion.span>
  );
}

export function MagicText({ id, segments, className }: { id?: string; segments: MagicTextSegment[]; className?: string }) {
  const container = useRef<HTMLHeadingElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.9", "start 0.25"] });

  const words: Word[] = segments.flatMap((segment) =>
    segment.text
      .split(" ")
      .filter(Boolean)
      .map((word) => ({ word, accent: segment.accent ?? false })),
  );

  return (
    <h2 id={id} ref={container} className={className}>
      {words.map((word, index) => (
        // Spazi veri tra le parole: la frase resta leggibile e copiabile, e va a capo normalmente.
        <span key={`${word.word}-${index}`}>
          <WordReveal word={word} progress={scrollYProgress} range={[index / words.length, (index + 1) / words.length]} isStatic={reduceMotion} />
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </h2>
  );
}
