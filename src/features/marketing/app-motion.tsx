"use client";

import { motion, MotionConfig, stagger, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Ingressi della sezione "L'app del Metodo FESPA" (fespa-app-section.tsx): il telefono entra con una
 * leggera rotazione, le schede attorno compaiono una alla volta, le funzioni scendono in sequenza.
 * Niente rimbalzi. Con "riduci movimento" restano solo le dissolvenze.
 */

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

export function PhoneEntrance({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={cn("motion-reveal", className)}
        initial={{ opacity: 0, y: 36, rotate: -4 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/** Scheda che fluttua accanto al telefono: compare dopo di lui. */
export function FloatIn({ children, className, delay }: { children: ReactNode; className?: string; delay: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        aria-hidden="true"
        className={cn("motion-reveal", className)}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8, ease: EASE_OUT, delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function FeatureList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.ol
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.14, { startDelay: 0.2 }) } } }}
      >
        {children}
      </motion.ol>
    </MotionConfig>
  );
}

export function FeatureItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li
      className={cn("motion-reveal", className)}
      variants={{
        hidden: { opacity: 0, x: 18 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE_OUT } },
      }}
    >
      {children}
    </motion.li>
  );
}
