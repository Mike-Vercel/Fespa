"use client";

import { motion, MotionConfig, stagger, type Variants } from "motion/react";
import { usePortalRevealed } from "./hero-portal";

type Pillar = { title: string; description: string };

/** I blocchi entrano uno dopo l'altro ("blop, blop, blop"): molla con un leggero rimbalzo. */
const LIST: Variants = {
  hidden: { transition: { duration: 0 } },
  visible: { transition: { delayChildren: stagger(0.18, { startDelay: 0.08 }) } },
};

const PILLAR: Variants = {
  hidden: { opacity: 0, scale: 0.55, y: 34, transition: { duration: 0.18, ease: "easeIn" } },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 15, mass: 0.9, opacity: { duration: 0.2 } },
  },
};

/** Il numero fa un secondo piccolo "blop" subito dopo il suo blocco. */
const NUMBER: Variants = {
  hidden: { scale: 0, rotate: -12 },
  visible: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 640, damping: 12, delay: 0.12 } },
};

export function HeroPillars({ pillars }: { pillars: readonly Pillar[] }) {
  const revealed = usePortalRevealed();

  return (
    // reducedMotion="user": con "riduci movimento" niente scale né spostamenti, solo dissolvenza.
    <MotionConfig reducedMotion="user">
      {/* Senza JavaScript i blocchi restano visibili (gli stili iniziali sono inline). */}
      <noscript>
        <style>{".hero-pillar,.hero-pillar-number{opacity:1!important;transform:none!important}"}</style>
      </noscript>
      <motion.ul
        variants={LIST}
        initial="hidden"
        animate={revealed ? "visible" : "hidden"}
        className="grid grid-cols-1 divide-y divide-white/25 md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        {pillars.map((pillar, index) => (
          <motion.li
            key={pillar.title}
            variants={PILLAR}
            style={{ transformOrigin: "50% 70%" }}
            className="hero-pillar flex flex-col py-8 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0 lg:px-12"
          >
            <motion.span
              variants={NUMBER}
              className="hero-pillar-number tabular inline-flex h-8 w-fit items-center rounded-full bg-white/15 px-3 text-[13px] font-semibold tracking-[0.18em] text-white ring-1 ring-white/25"
            >
              {String(index + 1).padStart(2, "0")}
            </motion.span>
            <h2 className="mt-4 font-serif text-[clamp(1.65rem,2.5vw,2.35rem)] leading-[1.1] tracking-[-0.015em] text-white text-balance md:min-h-[2.2em]">
              {pillar.title}
            </h2>
            <p className="mt-3 max-w-[34ch] text-[16px] leading-relaxed text-white text-pretty sm:text-[17px]">{pillar.description}</p>
          </motion.li>
        ))}
      </motion.ul>
    </MotionConfig>
  );
}
