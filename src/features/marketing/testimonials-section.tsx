import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { OFFICIAL_SITE_URL, TESTIMONIALS } from "./content";
import { MagicText } from "./magic-text";
import { MotionNoScript, Reveal, StaggerItem, StaggerList } from "./reveal";

/*
 * Testimonianze: il titolo si accende parola per parola scorrendo (magic-text.tsx), poi compaiono
 * le recensioni (al massimo 6) e il link a tutte le recensioni sul sito ufficiale.
 * Arriva dalla dissolvenza bianca in fondo a "Chi ti segue" e riprende lo stesso sfondo con i nastri.
 */

const VISIBLE_REVIEWS = 6;
const REVIEWS_URL = `${OFFICIAL_SITE_URL}/recensioni`;

function QuoteMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 36" className="h-7 w-9" fill="none">
      <defs>
        <linearGradient id="testimonial-quote" x1="0" y1="0" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f7cf6" />
          <stop offset=".55" stopColor="#8a5cf0" />
          <stop offset="1" stopColor="#d774d9" />
        </linearGradient>
      </defs>
      <path
        d="M0 36V22.6C0 10.5 6.3 2.9 18.2 0l2.4 5.4C13.7 7.7 10.4 11.8 10.1 17.6H19V36H0Zm27 0V22.6C27 10.5 33.3 2.9 45.2 0l2.4 5.4c-6.9 2.3-10.2 6.4-10.5 12.2H46V36H27Z"
        fill="url(#testimonial-quote)"
      />
    </svg>
  );
}

export function TestimonialsSection() {
  return (
    <section aria-labelledby="testimonianze-title" id="testimonianze" className="relative isolate scroll-mt-20 overflow-hidden bg-[linear-gradient(to_bottom,#ffffff,#fcfaf8_30%)]">
      <MotionNoScript />
      {/* Lo stesso sfondo di "Chi ti segue", specchiato: emerge dal bianco scendendo. */}
      <div aria-hidden="true" className="testimonials-ribbons absolute inset-0 -z-10">
        <Image src="/images/homepage/section_2/sfondo.svg" alt="" fill unoptimized sizes="100vw" className="-scale-x-100 object-cover" />
      </div>

      <div className="mx-auto max-w-[1760px] px-4 pb-20 pt-14 min-[640px]:px-6 min-[1200px]:px-[10.5vw] min-[1200px]:pb-[6vw] min-[1200px]:pt-[4vw]">
        <p className="text-center text-[13px] font-medium uppercase tracking-[0.26em] text-[#5d5f6e] min-[1200px]:text-[clamp(0.8rem,0.9vw,0.98rem)]">
          Testimonianze
        </p>
        <MagicText
          id="testimonianze-title"
          className="font-editorial mx-auto mt-5 max-w-[62rem] text-center text-[clamp(1.9rem,7.4vw,2.6rem)] font-medium leading-[1.14] tracking-[-0.015em] text-[#15172b] min-[1200px]:text-[clamp(2.5rem,3.3vw,4.1rem)]"
          segments={[
            { text: "Cosa dicono le donne" },
            { text: "che l'hanno scelto:", accent: true },
            {
              text: "storie vere di chi ha smesso di ricominciare ogni lunedì e ha ritrovato, passo dopo passo, un equilibrio con il cibo e con il proprio corpo.",
            },
          ]}
        />

        <StaggerList className="testimonials-grid mt-14 min-[1200px]:mt-[4vw]">
          {TESTIMONIALS.slice(0, VISIBLE_REVIEWS).map((testimonial) => (
            <StaggerItem key={testimonial.author} className="mb-5 break-inside-avoid min-[1200px]:mb-[1.4vw]">
              <figure className="testimonial-card rounded-[1.4rem] border border-[#15172b]/[0.07] bg-white/85 p-6 backdrop-blur-[2px] min-[1200px]:p-[1.9vw]">
                <QuoteMark />
                <blockquote className="mt-4 font-editorial text-[1.3rem] leading-snug text-[#15172b] text-pretty min-[1200px]:text-[clamp(1.2rem,1.4vw,1.6rem)]">
                  <p>{testimonial.quote}</p>
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 text-[14.5px] font-medium text-[#3b3d4f]">
                  <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-[#4f7cf6] to-[#d774d9]" />
                  {testimonial.author}
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </StaggerList>

        <Reveal y={10} className="mt-10 flex flex-col items-center gap-4 text-center min-[1200px]:mt-[2.6vw]">
          <a
            href={REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="testimonials-all inline-flex min-h-12 items-center gap-2 rounded-full bg-[#11142b] px-7 text-[15.5px] font-medium text-white"
          >
            Visualizzale tutte
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only"> (oltre 2.140 recensioni sul sito ufficiale, si apre in una nuova scheda)</span>
          </a>
          <p className="max-w-[34rem] text-[13px] text-[#6b6d7b]">
            Testimonianze pubblicate sul sito ufficiale del Metodo FESPA. I risultati variano da persona a persona.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
