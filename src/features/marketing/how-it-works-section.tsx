import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { JOURNEY_STEPS, SIGNUP_PATH } from "./content";
import { StepConnector, StepItem, StepNode, StepRail, StepRise, StepsSequence, TimelineLine } from "./how-it-works-motion";
import { MotionNoScript, Reveal } from "./reveal";

/*
 * "Come funziona": dal primo clic alla coach, in quattro passi.
 * Da 1100px: timeline orizzontale ondulata (SVG) con i nodi sulle creste e i passi in quattro colonne.
 * Sotto: timeline verticale, nodo a sinistra e binario a gradiente tra un passo e l'altro.
 * Qui si usano solo varianti min-[…]: mescolate con sm:/lg: Tailwind le ordinerebbe prima dei breakpoint del tema.
 *
 * Asset (public/images/homepage/section_2):
 * - sfondo.svg: i nastri FESPA ricostruiti in vettoriale dal PNG (1671×941), che ingrandito si sgranava;
 * - card_1…4.webp: ridimensionate da next/image alla misura mostrata (qualità 90). A 1536px lasciate
 *   rimpicciolire al browser si sgranavano. Hanno il fondo bianco, che sparisce con mix-blend-mode: multiply
 *   (.hiw-visual in globals.css): le illustrazioni si posano sullo sfondo senza riquadri.
 */

const BACKGROUND = "/images/homepage/section_2/sfondo.svg";
const MUTED = "text-[#5d5f6e]";

/** Per ogni passo: altezza del nodo sulla linea (creste dell'SVG) e colore del bagliore, dal blu al rosa. */
const STEP_STYLES = [
  { nodeY: "20px", glow: "74 123 246", next: "111 108 243" },
  { nodeY: "36px", glow: "111 108 243", next: "155 108 240" },
  { nodeY: "28px", glow: "155 108 240", next: "224 127 224" },
  { nodeY: "20px", glow: "224 127 224", next: "224 127 224" },
] as const;

export function HowItWorksSection() {
  const lastStep = JOURNEY_STEPS.length - 1;
  return (
    <section aria-labelledby="come-funziona-title" id="come-funziona" className="hiw relative isolate scroll-mt-20 overflow-hidden bg-[#fdfbfa]">
      <MotionNoScript />
      {/* Da 1100px lo sfondo copre la sezione; sotto (sezione alta e stretta) restano gli angoli con i nastri. */}
      <div aria-hidden="true" className="absolute inset-0 -z-20 hidden min-[1100px]:block">
        <Image src={BACKGROUND} alt="" fill unoptimized sizes="100vw" className="object-cover" />
      </div>
      <div aria-hidden="true" className="hiw-bg-top absolute inset-x-0 top-0 -z-20 h-[80vw] max-h-[36rem] min-[1100px]:hidden">
        <Image src={BACKGROUND} alt="" fill unoptimized sizes="100vw" className="object-cover object-left-top" />
      </div>
      <div aria-hidden="true" className="hiw-bg-bottom absolute inset-x-0 bottom-0 -z-20 h-[80vw] max-h-[36rem] min-[1100px]:hidden">
        <Image src={BACKGROUND} alt="" fill unoptimized sizes="100vw" className="object-cover object-right-bottom" />
      </div>

      <div className="mx-auto max-w-[1760px] px-4 pb-16 pt-16 min-[640px]:px-6 min-[640px]:pt-20 min-[1100px]:px-[5.5vw] min-[1100px]:pb-[2.8vw] min-[1100px]:pt-[2.8vw]">
        <Reveal className="text-center">
          <p className={cn("text-[13px] font-medium uppercase tracking-[0.3em] min-[1100px]:text-[clamp(0.8rem,0.9vw,1rem)]", MUTED)}>Come funziona</p>
          <h2
            id="come-funziona-title"
            className="mt-4 font-serif text-[clamp(2.1rem,9vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.015em] text-[#15172b] min-[1100px]:mt-[1vw] min-[1100px]:text-[clamp(3rem,4.1vw,5.1rem)]"
          >
            <span className="block">Dal primo clic alla tua</span>{" "}
            <em className="fespa-gradient-text mx-auto block text-[1.04em]">coach, in quattro passi</em>
          </h2>
          <p className={cn("mx-auto mt-4 max-w-[34rem] text-[16.5px] leading-relaxed min-[1100px]:mt-[1vw] min-[1100px]:max-w-none min-[1100px]:text-[clamp(1rem,1.15vw,1.3rem)]", MUTED)}>
            Parti da qui: la registrazione è gratuita e non ti impegna a nulla.
          </p>
        </Reveal>

        <StepsSequence className="hiw-steps relative mt-12 min-[1100px]:mt-[2.6vw]">
          <TimelineLine />
          <ol className="grid grid-cols-1 gap-12 min-[1100px]:grid-cols-4 min-[1100px]:gap-0">
            {JOURNEY_STEPS.map((step, index) => {
              const style = STEP_STYLES[index];
              return (
                <StepItem
                  key={step.title}
                  className="hiw-step relative flex flex-col pl-[calc(var(--node-size)+1rem)] min-[1100px]:pl-[1.3vw] min-[1100px]:pr-[1.3vw] min-[1100px]:pt-[100px]"
                  style={{ "--node-y": style?.nodeY, "--glow": style?.glow, "--glow-next": style?.next } as CSSProperties}
                >
                  <StepNode
                    step={index}
                    className="hiw-node absolute left-0 top-0 z-[1] flex size-[var(--node-size)] items-center justify-center rounded-full bg-white font-serif text-[1.35rem] leading-none text-[#15172b] min-[1100px]:left-1/2 min-[1100px]:top-[var(--node-y)] min-[1100px]:-translate-x-1/2 min-[1100px]:-translate-y-1/2 min-[1100px]:text-[clamp(1.55rem,2vw,2.3rem)]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </StepNode>
                  <StepConnector step={index} className="hiw-connector absolute left-1/2 hidden min-[1100px]:block" />
                  {index < lastStep ? <StepRail step={index} className="hiw-rail absolute min-[1100px]:hidden" /> : null}

                  <StepRise step={index} className="hiw-visual order-2 mt-4 min-[1100px]:order-1 min-[1100px]:mt-0">
                    {/* Riquadro con le proporzioni dell'immagine: la sfumatura dei bordi cade sui bordi veri. */}
                    <div
                      className="relative mx-auto w-full max-w-[32rem] min-[1100px]:h-[clamp(12.5rem,15vw,18.5rem)] min-[1100px]:w-auto min-[1100px]:max-w-full"
                      style={{ aspectRatio: `${step.visual.width} / ${step.visual.height}` }}
                    >
                      <Image src={step.visual.src} alt="" fill quality={90} sizes="(min-width: 1100px) 24vw, (min-width: 640px) 32rem, 100vw" className="object-contain" />
                    </div>
                  </StepRise>

                  <StepRise
                    step={index}
                    offset={0.1}
                    className="order-1 flex min-h-[var(--node-size)] items-center min-[1100px]:order-2 min-[1100px]:mt-[1vw] min-[1100px]:min-h-0"
                  >
                    <h3 className="font-serif text-[1.65rem] font-medium leading-tight tracking-[-0.01em] text-[#15172b] min-[1100px]:text-[clamp(1.45rem,1.8vw,2.1rem)]">
                      {step.title}
                    </h3>
                  </StepRise>

                  <StepRise step={index} offset={0.18} className="order-3 mt-3 min-[1100px]:mt-[0.7vw]">
                    <p className={cn("max-w-[34rem] text-[16px] leading-[1.55] min-[1100px]:max-w-[22em] min-[1100px]:text-[clamp(0.95rem,1.02vw,1.15rem)]", MUTED)}>
                      {step.description}
                    </p>
                  </StepRise>
                </StepItem>
              );
            })}
          </ol>
        </StepsSequence>

        <Reveal delay={0.2} className="mt-14 flex flex-col items-center gap-4 text-center min-[1100px]:mt-[2.4vw]">
          <Link
            href={SIGNUP_PATH}
            className="hiw-cta inline-flex h-14 items-center gap-3 rounded-full bg-[#11142b] px-9 text-[17px] font-medium text-white min-[1100px]:h-[clamp(3.5rem,3.4vw,4rem)] min-[1100px]:px-[clamp(2.25rem,3.3vw,3.5rem)] min-[1100px]:text-[clamp(1.05rem,1.1vw,1.25rem)]"
          >
            Inizia dal primo passo
            <ArrowRight aria-hidden="true" className="hiw-cta__arrow size-[1.1em]" />
          </Link>
          <p className={cn("text-[13.5px] min-[1100px]:text-[clamp(0.85rem,0.9vw,1rem)]", MUTED)}>
            Registrazione gratuita · Bastano circa 3 minuti · Nessun impegno
          </p>
        </Reveal>
      </div>
    </section>
  );
}
