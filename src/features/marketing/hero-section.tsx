import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PRESS_MENTIONS, PROOF_STATS, SIGNUP_PATH } from "./content";
import { Container, CTA_PRIMARY, CTA_SECONDARY } from "./primitives";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line bg-white">
      <Container className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center px-4 pb-16 pt-20 text-center sm:px-6 lg:pb-20 lg:pt-24">
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">Il metodo per tornare a sentirti bene</p>

        <h1 id="hero-title" className="mt-5 max-w-5xl font-serif text-[clamp(2.4rem,6.5vw,6.8rem)] leading-[0.96] tracking-[-0.04em] text-ink text-balance">
          Il tuo percorso <em className="text-accent-strong">comincia da te.</em>
        </h1>

        <p className="hero-copy-reveal mt-8 max-w-xl text-[17px] leading-relaxed text-ink-2 text-pretty sm:text-[19px]">
          Dimagrire senza ricominciare ogni lunedì. Impara a costruire abitudini sostenibili, con una coach che ti ascolta e ti accompagna davvero.
        </p>

        <div className="hero-copy-reveal mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href={SIGNUP_PATH} className={CTA_PRIMARY}>
            Inizia dalla consulenza gratuita
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <a href="#come-funziona" className={CTA_SECONDARY}>Scopri il metodo</a>
        </div>

        <dl className="hero-stats-reveal mt-14 grid w-full max-w-2xl grid-cols-3 border-y border-line py-5">
          {PROOF_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 border-r border-line px-3 last:border-r-0">
              <dd className="tabular font-serif text-2xl leading-none text-ink sm:text-3xl">{stat.value}</dd>
              <dt className="text-[11px] leading-snug text-ink-3 sm:text-xs">{stat.label}</dt>
            </div>
          ))}
        </dl>

        <a href="#metodo" aria-label="Scorri per scoprire il metodo" className="hero-scroll-cue mt-10 inline-flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3 hover:text-ink">
          Scopri
          <ArrowDown aria-hidden="true" className="size-4" />
        </a>
      </Container>
    </section>
  );
}

/** Fascia di credibilità: testate che hanno parlato del metodo (dal sito ufficiale). */
export function PressStrip() {
  return (
    <section aria-labelledby="press-title" className="border-y border-line bg-surface">
      <Container className="flex flex-col gap-4 py-7 lg:flex-row lg:items-center lg:gap-10">
        <h2 id="press-title" className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">
          Ne hanno parlato
        </h2>
        <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {PRESS_MENTIONS.map((name) => (
            <li key={name} className="font-serif text-[19px] italic text-ink-2">
              {name}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
