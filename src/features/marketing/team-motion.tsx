"use client";

import { motion, MotionConfig, stagger, type Transition } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Ingressi della sezione "Chi ti segue" (team-section.tsx): le card entrano da sinistra a destra,
 * una dopo l'altra, e le fotografie si assestano da un leggerissimo ingrandimento.
 * Solo trasformazioni e opacità sulle card: il loro mix-blend-mode resta valido anche durante l'animazione.
 */

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

export function TeamGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.ul
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(0.12, { startDelay: 0.15 }) } } }}
      >
        {children}
      </motion.ul>
    </MotionConfig>
  );
}

export function TeamItem({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <motion.li
      className={cn("motion-reveal", className)}
      style={style}
      variants={{
        hidden: { opacity: 0, y: 26 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
      }}
    >
      {children}
    </motion.li>
  );
}

/** Fotografia: si assesta da un ingrandimento appena percettibile. */
export function TeamPhoto({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn("motion-reveal", className)}
      variants={{
        hidden: { scale: 1.06 },
        visible: { scale: 1, transition: { duration: 1.3, ease: EASE_OUT } },
      }}
    >
      {children}
    </motion.div>
  );
}
