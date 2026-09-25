import { BookOpen, Heart, Star, Users } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { PROOF_STATS, WITHOUT_LIST } from "./content";
import { CardRise, ChecklistItems, IconBloom, LetterStagger, PhotoOpen, QuoteReveal, RiseIn, StarsLight, TitleLine, TitleLines } from "./method-motion";
import { MotionNoScript, Reveal } from "./reveal";

/*
 * "Non è una dieta": il metodo, subito dopo il confronto PRIMA/DOPO.
 * Server component: solo gli ingressi (method-motion.tsx, reveal.tsx) sono client.
 *
 * Asset (public/images/homepage/section_1):
 * - sfondo_1.svg: le onde FESPA sui bordi, ricostruite in vettoriale dal PNG originale (1672×941),
 *   che sugli schermi grandi veniva ingrandito e perdeva nitidezza;
 * - sfondo_card.webp: la fotografia (1024×1536), convertita dal PNG originale e ridimensionata da
 *   next/image alla misura mostrata (qualità 90): rimpicciolita dal browser si sgranava.
 */

const INK = "text-[#15172b]";
const MUTED = "text-[#5d5f6e]";

export function MethodSection() {
  return (
    <section aria-labelledby="metodo-title" id="metodo" className="method-section relative isolate scroll-mt-20 overflow-hidden bg-[#fdf9f4]">
      <MotionNoScript />
      <div aria-hidden="true" className="method-section__bg absolute inset-x-0 bottom-0 -z-20 xl:top-0">
        <Image src="/images/homepage/section_1/sfondo_1.svg" alt="" fill unoptimized sizes="100vw" className="object-cover object-[80%_100%] xl:object-center" />
      </div>

      <div className="mx-auto grid max-w-[1760px] gap-14 px-4 pb-16 pt-20 sm:px-6 sm:pb-20 md:pt-24 xl:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] xl:gap-[2.8vw] xl:py-[6.6vw] xl:pl-[7.8vw] xl:pr-[4.5vw]">
        <div className="flex flex-col xl:py-[2vw]">
          <LetterStagger text="Il metodo" className={cn("text-[13px] font-medium uppercase tracking-[0.26em] xl:text-[clamp(0.8rem,0.85vw,0.95rem)]", MUTED)} />
          <TitleLines
            id="metodo-title"
            className={cn(
              "mt-4 font-serif text-[clamp(2.25rem,9.8vw,4rem)] font-medium leading-[0.98] tracking-[-0.018em] xl:mt-[1.3vw] xl:text-[clamp(3rem,4vw,5.1rem)]",
              INK,
            )}
          >
            <TitleLine effect="tilt">Non è una dieta</TitleLine>{" "}
            {/* Una riga sola: spezzata in due perderebbe il ritmo del titolo. */}
            <TitleLine effect="skew" italic className="fespa-gradient-text whitespace-nowrap text-[1.05em]">
              È un nuovo modo
            </TitleLine>{" "}
            <TitleLine effect="tilt">di stare bene</TitleLine>
          </TitleLines>

          <Reveal delay={0.7} y={12}>
            <p className={cn("mt-6 max-w-[37rem] text-[17px] leading-[1.65] text-pretty xl:mt-[2.2vw] xl:max-w-[38em] xl:text-[clamp(1rem,1.1vw,1.25rem)] xl:leading-[1.6]", MUTED)}>
              Il Metodo FESPA® nasce per offrire alle donne un modo diverso di rimettersi in forma: basato su principi scientifici,
              educazione alimentare e strategie efficaci, senza rinunce estreme.
            </p>
          </Reveal>

          <QuoteReveal
            className="mt-10 xl:mt-[2.8vw]"
            quote={
              <p className={cn("font-serif text-[clamp(1.5rem,6.4vw,1.85rem)] italic leading-[1.22] xl:text-[clamp(1.5rem,1.75vw,2.05rem)]", INK)}>
                “Il vero cambiamento parte <br className="hidden sm:inline" />
                dalla testa e dura nel tempo.”
              </p>
            }
            caption="Il principio del Metodo FESPA"
            captionClassName={cn("mt-3 text-[12.5px] uppercase tracking-[0.08em] xl:text-[clamp(0.78rem,0.85vw,0.9rem)]", MUTED)}
          />

          <MethodStats />
        </div>

        <RealLifeCard />
      </div>
    </section>
  );
}

const STAT_ICONS = {
  clients: { Icon: Users, className: "bg-[#eeeafd] text-[#6a4fe0]" },
  reviews: { Icon: Star, className: "bg-[#fcecf2] text-[#c8457e]" },
  team: { Icon: Heart, className: "bg-[#e9edfd] text-[#4d5bd8]" },
} as const;

/** Numeri del sito ufficiale (PROOF_STATS), in un'unica riga con divisori sottili. */
function MethodStats() {
  return (
    <ul className="mt-12 grid grid-cols-3 xl:mt-auto xl:pt-[3vw]">
      {PROOF_STATS.map((stat, index) => {
        const { Icon, className } = STAT_ICONS[stat.kind];
        return (
          <li
            key={stat.kind}
            className="flex flex-col gap-3 border-l border-[#15172b]/10 px-3 first:border-l-0 first:pl-0 last:pr-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5 xl:gap-[0.8vw] xl:px-[1.1vw]"
          >
            <IconBloom
              delay={0.2 + index * 0.15}
              className={cn("flex size-11 shrink-0 items-center justify-center rounded-full xl:size-[clamp(2.75rem,2.9vw,3.25rem)]", className)}
            >
              <Icon className="size-5 xl:size-[42%]" strokeWidth={1.6} />
            </IconBloom>
            <RiseIn delay={0.35 + index * 0.15} className="flex flex-col gap-1">
              <span className={cn("text-[1.55rem] font-medium leading-none tracking-[-0.02em] xl:text-[clamp(1.6rem,1.8vw,2.1rem)]", INK)}>{stat.value}</span>{" "}
              <span className={cn("text-balance text-[13.5px] leading-snug sm:text-[15px] xl:text-[clamp(0.9rem,0.98vw,1.05rem)]", MUTED)}>{stat.label}</span>
              {stat.kind === "reviews" ? (
                <StarsLight
                  delay={0.9}
                  className="mt-1 flex gap-0.5 text-[#e8b54d]"
                  star={<Star className="size-3.5 fill-current" strokeWidth={0} />}
                />
              ) : null}
            </RiseIn>
          </li>
        );
      })}
    </ul>
  );
}

/** "Pensato per la tua vita reale": testo a sinistra, fotografia con il bordo curvo a destra (sotto, su mobile). */
function RealLifeCard() {
  return (
    <CardRise className="method-card grid overflow-hidden rounded-[1.75rem] border border-[#15172b]/[0.07] bg-[#fffdfa] md:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]">
      <div className="flex flex-col px-6 pb-8 pt-9 sm:px-9 md:pb-8 md:pt-10 xl:pb-[2.2vw] xl:pl-[2.5vw] xl:pr-[2vw] xl:pt-[2.6vw]">
        <h3 className={cn("font-serif text-[clamp(2.1rem,9vw,2.6rem)] font-medium leading-[1.02] tracking-[-0.012em] xl:text-[clamp(2.1rem,2.6vw,3.1rem)]", INK)}>
          <span className="block">Pensato per la tua</span> <em className="fespa-gradient-text block">vita reale</em>
        </h3>

        <ChecklistItems
          items={WITHOUT_LIST}
          className="mt-6 divide-y divide-[#15172b]/[0.08] xl:mt-[1.7vw]"
          itemClassName="flex gap-4 py-4 first:pt-0 xl:gap-[1.1vw] xl:py-[1.05vw] xl:first:pt-0"
          circleClassName="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8efe6] text-[#3d6842] xl:size-[clamp(2.1rem,2.2vw,2.5rem)]"
          titleClassName={cn("text-[16px] font-medium leading-snug xl:text-[clamp(0.98rem,1.08vw,1.2rem)]", INK)}
          descriptionClassName={cn("mt-0.5 text-[14.5px] leading-normal xl:text-[clamp(0.88rem,0.93vw,1.05rem)]", MUTED)}
        />

        <RiseIn delay={1.1} className="mt-2 flex items-start gap-4 border-t border-[#15172b]/[0.08] pt-6 md:mt-auto xl:gap-[1.1vw] xl:pt-[1.6vw]">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#efecfc] text-[#5a52d6] xl:size-[clamp(2.6rem,2.8vw,3.2rem)]">
            <BookOpen className="size-5" strokeWidth={1.6} />
          </span>
          <p className={cn("text-[14px] leading-relaxed xl:text-[clamp(0.85rem,0.9vw,1rem)]", MUTED)}>
            Il primo percorso di ri-educazione alimentare e online coaching in Italia: non una dieta, ma un cambio di paradigma.
          </p>
        </RiseIn>
      </div>

      {/* Fotografia d'atmosfera: il contenuto della card è tutto nel testo, quindi alt vuoto. */}
      <PhotoOpen className="aspect-[4/3] sm:aspect-[16/10] md:aspect-auto">
        <Image
          src="/images/homepage/section_1/sfondo_card.webp"
          alt=""
          fill
          quality={90}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 42vw, 100vw"
          className="object-cover object-[50%_20%] md:object-[64%_30%]"
        />
      </PhotoOpen>
    </CardRise>
  );
}
