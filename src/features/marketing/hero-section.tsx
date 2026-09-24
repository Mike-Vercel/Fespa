import { ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { HomePreview, ReplyToast } from "./app-previews";
import { PRESS_MENTIONS, PROOF_STATS, SIGNUP_PATH } from "./content";
import { Container, CTA_PRIMARY, CTA_SECONDARY } from "./primitives";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Alone decorativo dietro l'anteprima: statico, nessuna animazione continua. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(circle,var(--color-accent-soft)_0%,transparent_65%)]"
      />

      <Container className="relative grid grid-cols-1 items-center gap-14 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="animate-rise-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2">
            <BadgeCheck aria-hidden="true" className="size-4 text-accent" strokeWidth={1.75} />
            Online coaching per donne · marchio registrato
          </p>

          <h1
            id="hero-title"
            className="mt-6 font-serif text-[42px] leading-[1.04] tracking-[-0.02em] text-ink text-balance sm:text-[58px] lg:text-[66px]"
          >
            Rimodella il tuo corpo, <em className="text-accent-strong">senza diete restrittive.</em>
          </h1>

          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2 text-pretty">
            Senza eliminare i carboidrati e senza ore di palestra: un percorso di ri-educazione alimentare e
            consapevolezza, con una coach che ti segue passo dopo passo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={SIGNUP_PATH} className={CTA_PRIMARY}>
              Inizia con la consulenza gratuita
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a href="#come-funziona" className={CTA_SECONDARY}>
              Come funziona
            </a>
          </div>
          <p className="mt-3 text-[13px] text-ink-3">Registrazione gratuita e senza impegno.</p>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
            {PROOF_STATS.map((stat) => (
              // column-reverse: il valore sopra l'etichetta, ma nel DOM <dt> resta prima di <dd>.
              <div key={stat.label} className="flex flex-col-reverse justify-end gap-1">
                <dt className="text-[13px] leading-snug text-ink-3">{stat.label}</dt>
                <dd className="tabular font-serif text-[28px] leading-none text-ink sm:text-[34px]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex justify-center lg:justify-end">
          {/* La notifica è ancorata al telefono, non alla colonna: resta vicina a ogni larghezza. */}
          <div className="relative">
            <HomePreview className="rotate-[1.5deg]" />
            <ReplyToast className="absolute -left-40 top-16 hidden md:flex" />
          </div>
        </div>
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
