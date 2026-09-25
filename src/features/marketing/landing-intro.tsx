"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Intro della home. Niente schermata separata: la pagina è già bianca e la parola FESPA della hero
 * (la stessa del portale: stesso font, colore, grandezza e posizione) si crea lettera per lettera;
 * poi scende la navbar e compaiono i testi della hero.
 *
 * Come: il portale (glyph-portal.tsx) calcola già dove sta ogni lettera. Durante la costruzione il suo
 * riquadro viene ritagliato solo sulle lettere già "nate", ognuna che si riempie dal basso verso l'alto.
 * Nessuna copia della scritta, quindi nessuno scatto quando l'intro finisce.
 *
 * Fasi (attributo data-intro, stili in globals.css):
 *   waiting   → in attesa del portale (font caricato e misure pronte): la parola è nascosta;
 *   building  → le lettere si creano una dopo l'altra;
 *   revealing → navbar e testi della hero entrano;
 *   done      → nessuna regola attiva.
 * Con "riduci movimento", o se il portale resta statico, tutto è subito visibile.
 */

type Phase = "waiting" | "building" | "revealing" | "done";

const LETTER_DURATION_MS = 560;
const LETTER_STAGGER_MS = 115;
const REVEAL_DURATION_MS = 1_100;
/** Oltre questo tempo senza portale pronto (font lento, errori) si mostra tutto. */
const READY_TIMEOUT_MS = 3_000;

type LetterBox = { left: number; width: number };

function letterBoxes(section: HTMLElement): LetterBox[] {
  return Array.from(section.querySelectorAll<HTMLElement>("[data-gp-letter]"))
    .map((button) => ({ left: Number.parseFloat(button.style.left), width: Number.parseFloat(button.style.width) }))
    .filter((box) => Number.isFinite(box.left) && Number.isFinite(box.width))
    .sort((a, b) => a.left - b.left);
}

export function LandingIntro({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    let raf = 0;
    let doneTimer = 0;
    let clippedPin: HTMLElement | null = null;
    const startedAt = performance.now();

    const finish = () => setPhase("done");

    const build = (section: HTMLElement, pin: HTMLElement) => {
      const top = Number.parseFloat(section.style.getPropertyValue("--gp-word-top"));
      const bottom = Number.parseFloat(section.style.getPropertyValue("--gp-word-bottom"));
      const letters = letterBoxes(section);
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || letters.length === 0) {
        finish();
        return;
      }

      window.scrollTo(0, 0);
      clippedPin = pin;
      setPhase("building");
      const pad = Math.max(3, (bottom - top) * 0.05);
      const wordTop = top - pad;
      const wordBottom = bottom + pad;
      const start = performance.now();

      const tick = (now: number) => {
        const shapes: string[] = [];
        let finished = true;
        letters.forEach((letter, index) => {
          const t = Math.min(1, Math.max(0, (now - start - index * LETTER_STAGGER_MS) / LETTER_DURATION_MS));
          if (t < 1) finished = false;
          if (t <= 0) return;
          const eased = 1 - (1 - t) ** 3;
          const y = wordBottom - (wordBottom - wordTop) * eased;
          shapes.push(`M${letter.left - 1} ${y}H${letter.left + letter.width + 1}V${wordBottom}H${letter.left - 1}Z`);
        });
        pin.style.clipPath = shapes.length > 0 ? `path("${shapes.join("")}")` : "inset(0 0 100% 0)";

        if (!finished) {
          raf = requestAnimationFrame(tick);
          return;
        }
        pin.style.clipPath = "";
        clippedPin = null;
        setPhase("revealing");
        doneTimer = window.setTimeout(finish, REVEAL_DURATION_MS);
      };
      raf = requestAnimationFrame(tick);
    };

    const waitForPortal = () => {
      // Solo il portale definitivo: prima del font vero la hero lo rimonta, con misure diverse.
      const section = document.querySelector<HTMLElement>(".hero-portal--final");
      const pin = section?.querySelector<HTMLElement>("[data-gp-pin]");
      if (section && pin && section.dataset.gpMotion === "on") {
        build(section, pin);
        return;
      }
      if (performance.now() - startedAt > READY_TIMEOUT_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(waitForPortal);
    };

    raf = requestAnimationFrame(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
        return;
      }
      waitForPortal();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(doneTimer);
      if (clippedPin) clippedPin.style.clipPath = "";
    };
  }, []);

  return (
    <div className="relative min-h-dvh bg-white" data-intro={phase === "done" ? undefined : phase}>
      {/* Senza JavaScript l'intro non parte: tutto visibile. */}
      <noscript>
        <style>
          {
            "[data-intro] .landing-header,[data-intro] .hero-portal [data-gp-front]>*,[data-intro] .hero-portal [data-gp-caption]{opacity:1!important;transform:none!important;translate:none!important}[data-intro] .hero-portal [data-gp-pin]{clip-path:none!important}html{overflow:auto!important}"
          }
        </style>
      </noscript>
      <div className={cn("landing-content", phase === "done" && "landing-content--ready")}>{children}</div>
    </div>
  );
}
