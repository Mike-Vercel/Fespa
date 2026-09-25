"use client";

import { motion, MotionConfig, stagger, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Ingressi discreti delle sezioni della home: partono una volta sola, quando l'elemento entra nello schermo.
 * Con "riduci movimento" (reducedMotion="user") niente spostamenti: restano solo le dissolvenze.
 * Gli elementi animati hanno una classe "motion-*": senza JavaScript MotionNoScript li mostra nello stato finale
 * (motion-reveal: opacità e trasformazioni; motion-curtain: coperture; motion-open: foto che si aprono; motion-draw: tratti SVG).
 */

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, amount: 0.3 } as const;

/** Senza JavaScript tutto resta visibile (gli stati iniziali di motion sono stili inline). */
export function MotionNoScript() {
  return (
    <noscript>
      <style>
        {".motion-reveal{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important}.motion-curtain{display:none!important}.motion-open{--open:1!important}.motion-draw{stroke-dasharray:none!important;stroke-dashoffset:0!important}"}
      </style>
    </noscript>
  );
}

type RevealProps = { children: ReactNode; className?: string; delay?: number; y?: number };

/** Dissolvenza con una leggera salita. */
export function Reveal({ children, className, delay = 0, y = 16 }: RevealProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={cn("motion-reveal", className)}
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.9, ease: EASE_OUT, delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/** Elenco i cui elementi compaiono uno dopo l'altro, salendo di poco. */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.ul
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.1, { startDelay: 0.1 }) } } }}
      >
        {children}
      </motion.ul>
    </MotionConfig>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li
      className={cn("motion-reveal", className)}
      variants={{
        hidden: { opacity: 0, y: 22 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
      }}
    >
      {children}
    </motion.li>
  );
}
