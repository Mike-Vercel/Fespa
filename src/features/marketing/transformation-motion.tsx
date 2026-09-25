"use client";

import { animate, motion, MotionConfig, stagger, useInView, useReducedMotion, type Transition } from "motion/react";
import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Animazioni d'ingresso della hero "Il tuo percorso": un effetto diverso per ogni elemento.
 * Partono una volta sola, quando l'elemento entra nello schermo.
 * Con "riduci movimento" (reducedMotion="user") niente spostamenti: restano solo le dissolvenze.
 * Ogni elemento con uno stato iniziale nascosto ha la classe "motion-reveal" (vedi MotionNoScript in reveal.tsx).
 */

const VIEWPORT = { once: true, amount: 0.5 } as const;
const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** "Il tuo percorso": ogni parola sale da dietro una linea invisibile, una dopo l'altra. */
export function WordsRise({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <MotionConfig reducedMotion="user">
      <motion.span className="block" initial="hidden" whileInView="visible" viewport={VIEWPORT}>
        {words.map((word, index) => (
          // Lo spazio sta fuori dall'inline-block: dentro, a fine riga, il browser lo scarta.
          <Fragment key={`${word}-${index}`}>
            <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className="motion-reveal inline-block"
                variants={{
                  hidden: { y: "110%", rotate: 4 },
                  visible: { y: "0%", rotate: 0, transition: { duration: 0.9, ease: EASE_OUT, delay: index * 0.09 } },
                }}
              >
                {word}
              </motion.span>
            </span>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </motion.span>
    </MotionConfig>
  );
}

/*
 * Gli effetti con clip-path partono da un elemento completamente ritagliato, che per Chrome
 * non interseca mai lo schermo: la visibilità la osserva un contenitore esterno non ritagliato,
 * che passa lo stato all'elemento interno tramite le variants.
 */

/** "comincia da te": si svela da sinistra uscendo da una sfocatura, poi il gradiente scorre una volta. */
export function AccentSweep({ text, className }: { text: string; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.span className="block" initial="hidden" whileInView="visible" viewport={VIEWPORT}>
        <motion.em
          className={cn("motion-reveal block", className)}
          variants={{
            hidden: { clipPath: "inset(-10% 100% -10% 0%)", filter: "blur(10px)", backgroundPosition: "100% 50%" },
            visible: {
              clipPath: "inset(-10% -2% -10% 0%)",
              filter: "blur(0px)",
              backgroundPosition: "0% 50%",
              transition: {
                clipPath: { duration: 1.1, ease: EASE_OUT, delay: 0.35 },
                filter: { duration: 0.9, ease: "easeOut", delay: 0.35 },
                backgroundPosition: { duration: 2.2, ease: "easeInOut", delay: 0.8 },
              },
            },
          }}
        >
          {text}
        </motion.em>
      </motion.span>
    </MotionConfig>
  );
}

/** Testo che emerge da una sfocatura. */
export function BlurIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={cn("motion-reveal", className)}
      initial={{ opacity: 0, filter: "blur(12px)" }}
      whileInView={{ opacity: 1, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration: 1, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/** Pulsanti: entrano scivolando da sinistra, uno dopo l'altro, con una molla morbida. */
export function SlideInGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.12, { startDelay: 0.75 }) } } }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function SlideInItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn("motion-reveal", className)}
      variants={{
        hidden: { opacity: 0, x: -28 },
        visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 220, damping: 22 } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** "3.407+" → 3407 e "+": il numero conta da zero, il suffisso resta. */
function parseStat(value: string): { target: number; suffix: string } {
  const digits = value.replace(/[^\d]/g, "");
  return { target: Number(digits || 0), suffix: value.replace(/[\d.\s]/g, "") };
}

/** Punto delle migliaia anche a 4 cifre ("3.407", come nel testo), che Intl in italiano omette. */
function formatNumber(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function CountUp({ value, delay }: { value: string; delay: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const reduceMotion = useReducedMotion();
  const { target, suffix } = parseStat(value);

  // Il server mostra il valore finale (SEO, niente JavaScript). Nel browser si riparte da zero
  // finché la sezione non è visibile: è sotto la piega, quindi il cambio non si vede.
  useEffect(() => {
    if (reduceMotion || !ref.current || inView) return;
    ref.current.textContent = `0${suffix}`;
  }, [reduceMotion, inView, suffix]);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(0, target, {
      duration: 1.8,
      delay,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = `${formatNumber(Math.round(latest))}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, reduceMotion, target, suffix, delay]);

  return <span ref={ref}>{value}</span>;
}

/** Numeri che contano e linee divisorie che si disegnano dall'alto. */
export function StatsCountUp({ stats }: { stats: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <MotionConfig reducedMotion="user">
      <dl className="grid grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="motion-reveal relative flex flex-col gap-1.5 px-3 first:pl-0 last:pr-0 sm:px-5 lg:px-6"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.9 + index * 0.15 }}
          >
            {index > 0 ? (
              <motion.span
                aria-hidden="true"
                className="motion-reveal absolute inset-y-0 left-0 w-px origin-top bg-ink/15"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 1 + index * 0.15 }}
              />
            ) : null}
            {/* In una <dl> il termine precede il valore: l'ordine visivo (numero sopra) lo dà "order". */}
            <dt className="order-2 text-[13px] leading-snug text-ink-2 sm:text-[14px] lg:text-[15px]">{stat.label}</dt>
            <dd className="tabular order-1 font-serif text-[clamp(1.55rem,6.4vw,2.1rem)] leading-none tracking-[-0.01em] text-ink lg:text-[clamp(1.6rem,2.4vw,2.6rem)]">
              <CountUp value={stat.value} delay={0.95 + index * 0.15} />
            </dd>
          </motion.div>
        ))}
      </dl>
    </MotionConfig>
  );
}

/**
 * La foto si apre come un sipario dal basso, con un leggero assestamento.
 * Il sipario è un pannello bianco sopra la foto, non un clip-path sulla foto: le immagini lazy
 * dentro un contenitore tutto ritagliato Chrome non le scarica finché il ritaglio non si apre.
 */
export function CurtainReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className={cn("relative", className)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
        <motion.div
          className="motion-reveal size-full"
          variants={{
            hidden: { scale: 1.04 },
            visible: { scale: 1, transition: { duration: 1.6, ease: EASE_OUT, delay: 0.2 } },
          }}
        >
          {children}
        </motion.div>
        <motion.div
          aria-hidden="true"
          // Più largo della foto (che parte al 104%) e con il bordo inferiore sfumato.
          className="motion-curtain pointer-events-none absolute -inset-x-[4%] -top-px bottom-[-14%] z-20 origin-top bg-[linear-gradient(to_bottom,#fff_86%,rgb(255_255_255/0))]"
          variants={{
            hidden: { scaleY: 1 },
            visible: { scaleY: 0, transition: { duration: 1.2, ease: EASE_OUT, delay: 0.2 } },
          }}
        />
      </motion.div>
    </MotionConfig>
  );
}
