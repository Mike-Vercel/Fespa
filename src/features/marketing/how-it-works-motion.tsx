"use client";

import { motion, MotionConfig, type Transition, type Variants } from "motion/react";
import { createContext, use, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Ingressi della sezione "Come funziona" (how-it-works-section.tsx).
 * Da 1100px una sola sequenza, da sinistra a destra: la linea si disegna da 01 a 04 e ogni passo
 * (nodo, tratteggio, immagine, testi) compare quando la linea lo raggiunge. Parte quando i passi sono
 * davvero in vista, non appena spunta il titolo.
 * Sotto i 1100px (timeline verticale) ogni passo compare quando ci si arriva scorrendo, e il binario
 * si disegna verso il passo successivo.
 * Niente rimbalzi. Con "riduci movimento" niente spostamenti; la linea compare subito (globals.css).
 */

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
const DRAW_SECONDS = 2.8;
/** Istante in cui la linea raggiunge il passo: parte dal nodo 01 e arriva al 04 a velocità costante. */
const reachedAt = (step: number) => 0.15 + (DRAW_SECONDS * step) / 3;

const DESKTOP_QUERY = "(min-width: 1100px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Sul server (e al primo render) si assume il desktop: gli stati iniziali sono comunque identici. */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

/** "sequence": tempi scalati sulla linea orizzontale; "local": ogni passo ha i suoi tempi. */
const TimingContext = createContext<"sequence" | "local">("sequence");

function useStepDelay(step: number) {
  return use(TimingContext) === "sequence" ? reachedAt(step) : 0.1;
}

/*
 * Stessa struttura su ogni schermo (niente cambi dopo l'idratazione): il contenitore fa partire la linea,
 * ogni passo osserva da sé il proprio ingresso. Su desktop i quattro passi entrano insieme (stessa riga)
 * e i ritardi li scaglionano da 01 a 04; sotto i 1100px ognuno parte quando ci si arriva scorrendo.
 * La soglia è la stessa (45%), così su desktop linea e passi partono nello stesso istante.
 */
const IN_VIEW = { once: true, amount: 0.45 } as const;

/** Contenitore dei passi: fa partire la linea orizzontale e decide i tempi (a cascata o per passo). */
export function StepsSequence({ children, className }: { children: ReactNode; className?: string }) {
  const isDesktop = useIsDesktop();
  return (
    <MotionConfig reducedMotion="user">
      <TimingContext value={isDesktop ? "sequence" : "local"}>
        <motion.div className={className} initial="hidden" whileInView="visible" viewport={IN_VIEW}>
          {children}
        </motion.div>
      </TimingContext>
    </MotionConfig>
  );
}

/** Passo della lista: osserva da sé l'ingresso nello schermo. */
export function StepItem({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <motion.li className={className} style={style} initial="hidden" whileInView="visible" viewport={IN_VIEW}>
      {children}
    </motion.li>
  );
}

/*
 * Linea ondulata: i nodi sulle creste (1/8, 3/8, 5/8, 7/8 della larghezza), le valli tra un passo e l'altro.
 * viewBox 1000×80 stirato sulla larghezza (preserveAspectRatio="none"), spessore costante grazie a
 * vector-effect. I tratti .hiw-seg-* si accendono quando il mouse è sul passo corrispondente.
 */
const PATH = "M125 20 C187.5 20 187.5 50 250 50 C312.5 50 312.5 36 375 36 C437.5 36 437.5 60 500 60 C562.5 60 562.5 28 625 28 C687.5 28 687.5 52 750 52 C812.5 52 812.5 20 875 20";
const SEGMENTS = [
  "M125 20 C187.5 20 187.5 50 250 50",
  "M250 50 C312.5 50 312.5 36 375 36 C437.5 36 437.5 60 500 60",
  "M500 60 C562.5 60 562.5 28 625 28 C687.5 28 687.5 52 750 52",
  "M750 52 C812.5 52 812.5 20 875 20",
];

export function TimelineLine() {
  return (
    <motion.svg
      aria-hidden="true"
      className="hiw-line motion-reveal pointer-events-none absolute inset-x-0 top-0 hidden h-20 w-full overflow-visible min-[1100px]:block"
      viewBox="0 0 1000 80"
      preserveAspectRatio="none"
      variants={{
        hidden: { clipPath: "inset(-50% 87.5% -50% 12.5%)" },
        visible: { clipPath: "inset(-50% 12.5% -50% 12.5%)", transition: { duration: DRAW_SECONDS, ease: "linear", delay: 0.15 } },
      }}
    >
      <defs>
        <linearGradient id="hiw-line-gradient" x1="125" y1="0" x2="875" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a7bf6" />
          <stop offset=".38" stopColor="#7a6cf2" />
          <stop offset=".68" stopColor="#a66cf0" />
          <stop offset="1" stopColor="#e07fe0" />
        </linearGradient>
      </defs>
      <path d={PATH} fill="none" stroke="url(#hiw-line-gradient)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {SEGMENTS.map((d, index) => (
        <path
          key={d}
          d={d}
          className={`hiw-seg hiw-seg-${index + 1}`}
          fill="none"
          stroke="url(#hiw-line-gradient)"
          strokeWidth={5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </motion.svg>
  );
}

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: (delay: number) => ({ opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE_OUT, delay } }),
};

/** Nodo numerato: compare quando la linea lo raggiunge. */
export function StepNode({ step, className, children }: { step: number; className?: string; children: ReactNode }) {
  return (
    <motion.span aria-hidden="true" className={cn("motion-reveal", className)} custom={useStepDelay(step)} variants={nodeVariants}>
      {children}
    </motion.span>
  );
}

const lineDownVariants: Variants = {
  hidden: { scaleY: 0 },
  visible: ({ delay, duration }: { delay: number; duration: number }) => ({ scaleY: 1, transition: { duration, ease: EASE_OUT, delay } }),
};

/** Tratteggio dal nodo all'immagine (da 1100px): scende dopo il nodo. */
export function StepConnector({ step, className }: { step: number; className?: string }) {
  const delay = useStepDelay(step) + 0.25;
  return <motion.span aria-hidden="true" className={cn("motion-reveal origin-top", className)} custom={{ delay, duration: 0.45 }} variants={lineDownVariants} />;
}

/** Binario verticale verso il passo successivo (sotto i 1100px): si disegna dopo il nodo. */
export function StepRail({ step, className, style }: { step: number; className?: string; style?: CSSProperties }) {
  const delay = useStepDelay(step) + 0.3;
  return (
    <motion.span
      aria-hidden="true"
      className={cn("motion-reveal origin-top", className)}
      style={style}
      custom={{ delay, duration: 1.1 }}
      variants={lineDownVariants}
    />
  );
}

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT, delay } }),
};

/** Immagine e testi del passo: salgono di poco e compaiono, in quest'ordine. */
export function StepRise({ step, offset = 0, className, children }: { step: number; offset?: number; className?: string; children: ReactNode }) {
  const delay = useStepDelay(step) + 0.3 + offset;
  return (
    <motion.div className={cn("motion-reveal", className)} custom={delay} variants={riseVariants}>
      {children}
    </motion.div>
  );
}
