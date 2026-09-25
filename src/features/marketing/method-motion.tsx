"use client";

import { motion, MotionConfig, stagger, type Transition, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Ingressi della sezione "Non è una dieta" (method-section.tsx): effetti diversi da quelli del
 * confronto PRIMA/DOPO. Partono una volta sola, quando l'elemento entra nello schermo.
 * Con "riduci movimento" (reducedMotion="user") niente spostamenti: restano solo le dissolvenze.
 * Gli elementi con uno stato iniziale nascosto hanno le classi di MotionNoScript (reveal.tsx).
 */

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, amount: 0.4 } as const;

/** Occhiello: le lettere compaiono una dopo l'altra. Gli screen reader leggono il testo intero. */
export function LetterStagger({ text, className }: { text: string; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.p
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.035) } } }}
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {Array.from(text).map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              className="motion-reveal inline-block whitespace-pre"
              variants={{
                hidden: { opacity: 0, y: "0.7em" },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      </motion.p>
    </MotionConfig>
  );
}

/** Titolo a righe: ogni riga (TitleLine) entra con il proprio effetto, una dopo l'altra. */
export function TitleLines({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.h2
        id={id}
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.16, { startDelay: 0.35 }) } } }}
      >
        {children}
      </motion.h2>
    </MotionConfig>
  );
}

const LINE_EFFECTS = {
  /** La riga si solleva ruotando sul bordo inferiore, come una pagina che si alza. */
  tilt: {
    hidden: { opacity: 0, rotateX: -80, y: "0.2em", transformPerspective: 900 },
    visible: { opacity: 1, rotateX: 0, y: 0, transformPerspective: 900, transition: { duration: 1.1, ease: EASE_OUT } },
  },
  /** Il corsivo scivola da destra e si raddrizza. */
  skew: {
    hidden: { opacity: 0, x: "0.5em", skewX: -16 },
    visible: { opacity: 1, x: 0, skewX: 0, transition: { duration: 1.2, ease: EASE_OUT } },
  },
} satisfies Record<string, Variants>;

export function TitleLine({ effect, italic, className, children }: { effect: keyof typeof LINE_EFFECTS; italic?: boolean; className?: string; children: ReactNode }) {
  const Line = italic ? motion.em : motion.span;
  return (
    <Line className={cn("motion-reveal block origin-bottom", className)} variants={LINE_EFFECTS[effect]}>
      {children}
    </Line>
  );
}

/** Citazione: la linea verticale si disegna dall'alto, poi entrano il testo e la didascalia. */
export function QuoteReveal({ quote, caption, className, captionClassName }: { quote: ReactNode; caption: ReactNode; className?: string; captionClassName?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.figure className={cn("relative pl-[2.1rem]", className)} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
        <motion.span
          aria-hidden="true"
          className="motion-reveal absolute inset-y-[0.2rem] left-0 w-0.5 origin-top rounded-full bg-[linear-gradient(to_bottom,#5b63f2,#8a55ea_55%,#c47bdc)]"
          variants={{ hidden: { scaleY: 0 }, visible: { scaleY: 1, transition: { duration: 0.9, ease: EASE_OUT } } }}
        />
        <motion.blockquote
          className="motion-reveal"
          variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE_OUT, delay: 0.35 } } }}
        >
          {quote}
        </motion.blockquote>
        <motion.figcaption
          className={cn("motion-reveal", captionClassName)}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.8, delay: 0.75 } } }}
        >
          {caption}
        </motion.figcaption>
      </motion.figure>
    </MotionConfig>
  );
}

/** Icona delle statistiche: sboccia ruotando da piccola, con una molla morbida. */
export function IconBloom({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        aria-hidden="true"
        className={cn("motion-reveal", className)}
        initial={{ opacity: 0, scale: 0.4, rotate: -35 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={VIEWPORT}
        transition={{ type: "spring", stiffness: 210, damping: 19, delay }}
      >
        {children}
      </motion.span>
    </MotionConfig>
  );
}

/** Testo che sale dal basso (numero e didascalia delle statistiche, nota in fondo alla card). */
export function RiseIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={cn("motion-reveal", className)}
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.8, ease: EASE_OUT, delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/** Stelle delle recensioni: si accendono una alla volta. */
export function StarsLight({ count = 5, delay = 0, className, star }: { count?: number; delay?: number; className?: string; star: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        aria-hidden="true"
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.09, { startDelay: delay }) } } }}
      >
        {Array.from({ length: count }, (_, index) => (
          <motion.span
            key={index}
            className="motion-reveal inline-flex"
            variants={{
              hidden: { opacity: 0.15, scale: 0.3 },
              visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 16 } },
            }}
          >
            {star}
          </motion.span>
        ))}
      </motion.span>
    </MotionConfig>
  );
}

/** Card: sale dal basso e si posa. */
export function CardRise({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={cn("motion-reveal", className)}
        initial={{ opacity: 0, y: 48, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.15 }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/**
 * Foto della card: si apre seguendo la curva del bordo (la variabile --open cresce da 0 a 1 dentro
 * il clip-path di .method-card__photo) mentre l'immagine si assesta da un leggero ingrandimento.
 * Osserva il contenitore esterno, che non è ritagliato; parte da uno spiraglio aperto, così la foto
 * lazy viene comunque scaricata.
 */
export function PhotoOpen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className={cn("relative", className)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
        <motion.div
          className="method-card__photo motion-open absolute inset-0"
          variants={{
            hidden: { "--open": 0.1 },
            visible: { "--open": 1, transition: { duration: 1.5, ease: EASE_OUT, delay: 0.45 } },
          }}
        >
          <motion.div
            className="motion-reveal relative size-full"
            variants={{ hidden: { scale: 1.14 }, visible: { scale: 1, transition: { duration: 2.2, ease: EASE_OUT, delay: 0.45 } } }}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}

/** Voci della checklist: entrano da sinistra, il cerchio si gonfia e la spunta si disegna. */
export function ChecklistItems({ items, className, itemClassName, circleClassName, titleClassName, descriptionClassName }: {
  items: ReadonlyArray<{ title: string; description: string }>;
  className?: string;
  itemClassName?: string;
  circleClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.ul
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.13, { startDelay: 0.55 }) } } }}
      >
        {items.map((item) => (
          <motion.li
            key={item.title}
            className={cn("motion-reveal", itemClassName)}
            variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE_OUT } } }}
          >
            <motion.span
              aria-hidden="true"
              className={cn("motion-reveal", circleClassName)}
              variants={{ hidden: { scale: 0.5 }, visible: { scale: 1, transition: { type: "spring", stiffness: 260, damping: 18 } } }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <motion.path
                  className="motion-draw"
                  d="M20 6 9 17l-5-5"
                  variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.5, ease: "easeOut", delay: 0.3 } } }}
                />
              </svg>
            </motion.span>
            <div>
              <p className={titleClassName}>{item.title}</p>
              <p className={descriptionClassName}>{item.description}</p>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </MotionConfig>
  );
}
