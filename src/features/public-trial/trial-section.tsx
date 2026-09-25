import { FileText, Heart, Zap, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { MotionNoScript, Reveal } from "@/features/marketing/reveal";
import { TrialChat } from "./trial-chat";

/*
 * "Prova FESPA": subito sotto l'app, parte dall'onda crema in cui finisce la sezione scura.
 * A sinistra il testo, a destra la chat reale con FESPA AI (trial-chat.tsx, server/trial).
 */

const BENEFITS: { Icon: LucideIcon; title: string; detail: string }[] = [
  { Icon: Zap, title: "Risposte personalizzate", detail: "in base a ciò che racconti" },
  { Icon: FileText, title: "Un piccolo riepilogo", detail: "via email al termine" },
  { Icon: Heart, title: "Senza impegno", detail: "e senza registrazione iniziale" },
];

export function FespaTrialSection() {
  return (
    <section aria-labelledby="prova-title" id="prova" className="relative isolate scroll-mt-20 overflow-hidden bg-[#fbf8f5]">
      <MotionNoScript />
      {/* Nastri FESPA leggerissimi, soprattutto in basso a destra. */}
      <div aria-hidden="true" className="trial-ribbons absolute inset-0 -z-10">
        <Image src="/images/homepage/section_1/sfondo_1.svg" alt="" fill unoptimized sizes="100vw" className="object-cover object-[80%_100%]" />
      </div>

      <div className="mx-auto grid max-w-[1760px] gap-10 px-4 pb-16 pt-6 min-[640px]:px-6 min-[1100px]:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] min-[1100px]:items-center min-[1100px]:gap-[3vw] min-[1100px]:px-[5vw] min-[1100px]:pb-[4.5vw] min-[1100px]:pt-[1vw]">
        <Reveal>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.24em] text-[#6a4fe0] min-[1100px]:text-[clamp(0.78rem,0.85vw,0.95rem)]">
            Prova FESPA
          </p>
          <h2
            id="prova-title"
            className="mt-4 font-serif text-[clamp(2.2rem,9.4vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.015em] text-[#15172b] min-[1100px]:text-[clamp(2.8rem,3.8vw,4.8rem)]"
          >
            <span className="block">Vuoi capire da dove</span>{" "}
            <em className="fespa-gradient-text block">potresti iniziare?</em>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[#2b2d3d] min-[1100px]:text-[clamp(1.05rem,1.25vw,1.35rem)]">
            Parla per qualche minuto con FESPA AI.
            <br />3 messaggi gratuiti · Nessuna registrazione richiesta.
          </p>

          <ul className="mt-8 grid justify-start gap-x-6 gap-y-4 min-[560px]:grid-cols-[repeat(3,auto)] min-[1100px]:mt-[2.4vw]">
            {BENEFITS.map(({ Icon, title, detail }) => (
              <li key={title} className="flex items-center gap-2.5">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ece8fb] text-[#5b3fc8]">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <span className="text-[13.5px] leading-snug">
                  <span className="block whitespace-nowrap font-semibold text-[#15172b]">{title}</span>
                  <span className="block text-[#5d5f6e]">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15} y={24}>
          <TrialChat />
        </Reveal>
      </div>
    </section>
  );
}
