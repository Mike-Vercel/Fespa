import Image from "next/image";
import { FAQ } from "./content";
import { FaqAccordion } from "./faq-accordion";
import { MotionNoScript, Reveal } from "./reveal";

/*
 * Domande frequenti: la sezione scura che spezza quelle chiare, prima del footer (stesso nero #0c0c11).
 * Sfondo: public/images/homepage/section_6/sfondo.webp (dal PNG originale), glow viola/rosa agli angoli.
 * Desktop: titolo a sinistra (fermo mentre scorrono le domande), accordion a destra. Mobile: una colonna.
 */

const BACKGROUND = "/images/homepage/section_6/sfondo.webp";

export function FaqSection() {
  return (
    <section aria-labelledby="domande-title" id="domande" className="faq-section relative isolate scroll-mt-20 overflow-hidden bg-[#0c0c11] text-white">
      <MotionNoScript />
      {/* Senza JavaScript le risposte restano tutte visibili. */}
      <noscript>
        <style>{".faq-panel{grid-template-rows:1fr!important;opacity:1!important;visibility:visible!important}.faq-icon{display:none}"}</style>
      </noscript>
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* Da 1024px l'immagine copre la sezione. Sotto (sezione alta e stretta) solo gli angoli in alto e in basso,
            con le proporzioni originali: i nastri restano ai bordi e non passano sul titolo. */}
        <Image src={BACKGROUND} alt="" fill unoptimized sizes="100vw" className="hidden object-cover min-[1024px]:block" />
        <div className="faq-bg-top absolute inset-x-0 top-0 aspect-[1672/941] min-[1024px]:hidden">
          <Image src={BACKGROUND} alt="" fill unoptimized sizes="100vw" className="object-cover object-top" />
        </div>
        <div className="faq-bg-bottom absolute inset-x-0 bottom-0 aspect-[1672/941] min-[1024px]:hidden">
          <Image src={BACKGROUND} alt="" fill unoptimized sizes="100vw" className="object-cover object-bottom" />
        </div>
        {/* Velatura leggera per la leggibilità, poi sfuma nel nero del footer. */}
        <div className="absolute inset-0 bg-[#0c0c11]/25" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#0c0c11]" />
      </div>

      <div className="mx-auto grid max-w-[1760px] gap-10 px-4 pb-20 pt-20 min-[640px]:px-6 min-[1024px]:grid-cols-[minmax(0,41fr)_minmax(0,59fr)] min-[1024px]:gap-[4vw] min-[1024px]:px-[7.5vw] min-[1024px]:pb-[11vw] min-[1024px]:pt-[10.5vw]">
        <Reveal className="min-[1024px]:sticky min-[1024px]:top-28 min-[1024px]:self-start min-[1024px]:pt-[1vw]">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.3em] text-[#a99af6] min-[1024px]:text-[clamp(0.78rem,0.9vw,0.98rem)]">Domande frequenti</p>
          <h2
            id="domande-title"
            className="font-editorial mt-4 text-[clamp(2.5rem,11vw,3.6rem)] font-normal leading-[0.98] tracking-[-0.02em] text-[#f7f4ee] min-[1024px]:mt-[1.4vw] min-[1024px]:text-[clamp(3.4rem,5.1vw,6.6rem)]"
          >
            <span className="block">Tutto quello</span> <span className="block">che vuoi sapere</span>{" "}
            <em className="faq-accent block">prima di iniziare</em>
          </h2>
          <p className="mt-6 max-w-[26rem] text-[16.5px] leading-relaxed text-[#e4e0ea] min-[1024px]:mt-[2vw] min-[1024px]:text-[clamp(1.02rem,1.3vw,1.4rem)]">
            Hai altri dubbi? Ne parliamo insieme durante la consulenza gratuita.
          </p>
          <svg aria-hidden="true" viewBox="0 0 170 22" className="mt-5 h-5 w-[10rem] min-[1024px]:mt-[1.8vw]" fill="none">
            <defs>
              <linearGradient id="faq-flourish" x1="0" y1="0" x2="170" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f08fcf" />
                <stop offset=".55" stopColor="#c7a4f5" />
                <stop offset="1" stopColor="#c7a4f5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 16C22 6 42 5 62 11s40 10 62 4 34-10 44-12" stroke="url(#faq-flourish)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </Reveal>

        <Reveal delay={0.15} y={20}>
          <FaqAccordion items={FAQ} />
        </Reveal>
      </div>
    </section>
  );
}
