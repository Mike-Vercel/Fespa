import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { cn } from "@/lib/cn";
import { PROOF_STATS, SIGNUP_PATH } from "./content";
import { CTA_PRIMARY } from "./primitives";
import {
  AccentSweep,
  BlurIn,
  CurtainReveal,
  SlideInGroup,
  SlideInItem,
  StatsCountUp,
  WordsRise,
} from "./transformation-motion";
import { MotionNoScript } from "./reveal";

/*
 * Hero "Il tuo percorso comincia da te": emerge dal bianco in cui sfuma il portale FESPA
 * (vedi hero-portal.tsx). Server component: solo lo slider PRIMA/DOPO è client.
 * Desktop: foto a sinistra e testo a destra (lg:order). Mobile: prima il testo, poi la foto.
 *
 * Asset (public/images/homepage), usati così come sono: pre-metodo / post-metodo, stessa inquadratura
 * 1024×1536 sovrapposta nello slider. Il nastro FESPA è già nelle foto; attorno solo bianco
 * (gli sfondi fotografici mostravano una seconda stanza dietro la foto).
 */

const PILL = "inline-flex h-9 items-center rounded-full px-4 text-[12px] font-semibold uppercase tracking-[0.16em] sm:h-10 sm:px-5 sm:text-[13px]";

export function TransformationSection() {
  return (
    <section
      aria-labelledby="percorso-title"
      className="transformation-section relative isolate overflow-hidden bg-white lg:grid lg:min-h-[max(40rem,calc(100svh-65px))] lg:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]"
    >
      <MotionNoScript />
      <div className="transformation-copy relative z-10 flex flex-col justify-center px-4 pb-10 pt-16 sm:px-6 lg:order-2 lg:py-16 lg:pl-6 lg:pr-[5vw]">
        <h2 id="percorso-title" className="font-serif text-[clamp(2.4rem,11.4vw,4.3rem)] leading-[0.98] tracking-[-0.035em] text-ink lg:text-[clamp(3rem,5vw,5.6rem)]">
          <WordsRise text="Il tuo percorso" />
          <AccentSweep text="comincia da te" className="transformation-accent pb-[0.08em] pr-[0.06em]" />
        </h2>

        <BlurIn delay={0.55}>
          <p className="mt-6 max-w-[27rem] text-[17px] leading-relaxed text-ink-2 text-pretty lg:mt-8 lg:text-[clamp(1.05rem,1.3vw,1.25rem)]">
            Dimagrire senza ricominciare ogni lunedì. Impara a costruire abitudini sostenibili, con una coach che ti ascolta e ti accompagna
            davvero.
          </p>
        </BlurIn>

        <SlideInGroup className="mt-7 flex flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:gap-10 lg:mt-9">
          <SlideInItem>
            <Link href={SIGNUP_PATH} className={cn(CTA_PRIMARY, "cta-glow h-14 w-full rounded-xl bg-[#11142b] px-7 text-[16px] hover:bg-[#11142b] sm:w-auto")}>
              Inizia dalla consulenza gratuita
              <span aria-hidden="true" className="cta-glow__arrow">
                <ArrowRight className="size-4" />
                <ArrowRight className="size-4" />
              </span>
            </Link>
          </SlideInItem>
          <SlideInItem>
            <a href="#come-funziona" className="discover-link inline-flex items-center gap-3 pb-1.5 text-[16px] text-ink-2">
              Scopri il metodo
              <span aria-hidden="true" className="discover-link__icon">
                <ArrowRight className="size-4" />
              </span>
            </a>
          </SlideInItem>
        </SlideInGroup>

        <div className="mt-10 max-w-[34rem] lg:mt-14">
          <StatsCountUp stats={PROOF_STATS} />
        </div>
      </div>

      {/* Dalla testa a metà coscia (gli originali finiscono a metà stinco): il bordo inferiore sfuma. */}
      <div className="transformation-visual relative z-[6] flex justify-center sm:pb-6 lg:order-1 lg:items-center lg:px-6 lg:py-[4svh]">
        <CurtainReveal className="aspect-[5/6] w-full sm:h-[62svh] sm:w-auto lg:h-[82%]">
          <BeforeAfterSlider
            before={{ src: "/images/homepage/pre-metodo.webp", alt: "Prima: la stessa donna all'inizio del percorso, davanti allo specchio" }}
            after={{ src: "/images/homepage/post-metodo.webp", alt: "Dopo: la stessa donna, nella stessa posa, dopo il percorso FESPA" }}
            initialPosition={{ base: 50, lg: 47 }}
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 55vw, 100vw"
            unoptimized
            objectPosition="50% 0%"
            className="size-full"
            demoOnView
            imagesClassName="transformation-visual__images"
            labelsClassName="top-[8%]"
            beforeLabelClassName="left-[6%]"
            afterLabelClassName="right-[6%]"
            beforeLabel={<span className={cn(PILL, "bg-[#6f6760]/55 text-white backdrop-blur-sm")}>Prima</span>}
            afterLabel={<span className={cn(PILL, "bg-gradient-to-r from-brand-violet to-[#a45cf0] text-white shadow-[0_8px_20px_-10px_rgb(124_92_242/0.9)]")}>Dopo</span>}
          />
        </CurtainReveal>
        <a
          href="#metodo"
          aria-label="Scorri per scoprire il metodo"
          className="absolute bottom-2 left-1/2 z-10 inline-flex size-11 -translate-x-1/2 items-center justify-center rounded-full text-ink-3 hover:text-ink lg:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </div>
    </section>
  );
}
