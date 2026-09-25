import { BarChart3, Check, ClipboardCheck, Dumbbell, MessageCircleMore, ShieldCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { FeatureItem, FeatureList, FloatIn, PhoneEntrance } from "./app-motion";
import { APP_FEATURES, type AppFeatureIcon } from "./content";
import { MotionNoScript, Reveal } from "./reveal";

/*
 * "L'app del Metodo FESPA": sfondo scuro, telefono protagonista a sinistra (asset reale
 * public/images/homepage/section_3/mobile_app.webp, fondo quasi nero come la sezione),
 * testo e funzioni a destra. Le schede attorno al telefono illustrano l'interfaccia: sono
 * decorative (aria-hidden). In fondo un'onda crema porta alla Prova FESPA.
 */

const FEATURE_ICONS: Record<AppFeatureIcon, LucideIcon> = {
  checkin: ClipboardCheck,
  reply: MessageCircleMore,
  progress: BarChart3,
  privacy: ShieldCheck,
};

/** Colore di ogni passo lungo il gradiente FESPA (blu → viola → rosa). */
const STEP_COLORS = ["#4f7cf6", "#7a6cf2", "#a468ef", "#d774d9"] as const;

const GLASS = "rounded-2xl border border-white/12 bg-[#14152a]/70 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)] backdrop-blur-md";

export function FespaAppSection() {
  return (
    <section aria-labelledby="app-title" id="app" className="fespa-app relative isolate scroll-mt-20 overflow-hidden bg-[#07080f] text-white">
      <MotionNoScript />
      {/* Mobile: titolo → telefono → funzioni. Desktop: telefono a sinistra su due righe, testo e funzioni a destra. */}
      <div className="mx-auto grid max-w-[1760px] gap-12 px-4 pb-28 pt-16 [grid-template-areas:'intro'_'phone'_'features'] min-[640px]:px-6 min-[1100px]:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] min-[1100px]:grid-rows-[auto_1fr] min-[1100px]:gap-x-[2vw] min-[1100px]:gap-y-[2.2vw] min-[1100px]:px-[5vw] min-[1100px]:pb-[9vw] min-[1100px]:pt-[3.5vw] min-[1100px]:[grid-template-areas:'phone_intro'_'phone_features']">
        <div className="[grid-area:intro] min-[1100px]:pt-[1vw]">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.24em] text-[#e0a47f] min-[1100px]:text-[clamp(0.78rem,0.85vw,0.95rem)]">
              L&apos;app del Metodo FESPA
            </p>
            <h2
              id="app-title"
              className="mt-4 font-serif text-[clamp(2.3rem,10vw,3.6rem)] font-medium leading-[1] tracking-[-0.015em] text-white min-[1100px]:text-[clamp(2.4rem,2.9vw,3.9rem)]"
            >
              <span className="block">La tua coach,</span>{" "}
              <em className="fespa-gradient-text block min-[1100px]:whitespace-nowrap">sempre a portata di mano</em>
            </h2>
            <p className="mt-5 max-w-[36rem] text-[16.5px] leading-relaxed text-white/75 min-[1100px]:text-[clamp(1rem,1.15vw,1.25rem)]">
              Il tuo percorso continua ogni giorno. Check-in, risposte della coach e progressi, tutto in un unico spazio.
            </p>
          </Reveal>
        </div>

        <FeatureList className="app-features flex flex-col gap-7 [grid-area:features] min-[1100px]:gap-[1.6vw]">
            {APP_FEATURES.map((feature, index) => {
              const Icon = FEATURE_ICONS[feature.icon];
              const color = STEP_COLORS[index] ?? STEP_COLORS[0];
              return (
                <FeatureItem key={feature.title} className="app-feature relative grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-4 min-[1100px]:gap-x-[1.4vw]">
                  {index < APP_FEATURES.length - 1 ? (
                    <span aria-hidden="true" className="app-feature__dots" style={{ "--ring": STEP_COLORS[index + 1] } as CSSProperties} />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="app-feature__ring flex size-14 items-center justify-center rounded-full min-[1100px]:size-[clamp(3.5rem,4vw,4.4rem)]"
                    style={{ "--ring": color } as CSSProperties}
                  >
                    <Icon className="size-6 text-white min-[1100px]:size-[42%]" strokeWidth={1.6} />
                  </span>
                  <span aria-hidden="true" className="pt-3 font-sans text-[1.6rem] font-semibold leading-none tracking-[-0.02em] min-[1100px]:text-[clamp(1.6rem,2vw,2.3rem)]" style={{ color }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="pt-1.5">
                    <h3 className="font-serif text-[1.35rem] font-medium leading-tight text-white min-[1100px]:text-[clamp(1.3rem,1.55vw,1.8rem)]">{feature.title}</h3>
                    <p className="mt-1.5 max-w-[30rem] text-[15px] leading-relaxed text-white/70 min-[1100px]:text-[clamp(0.92rem,1vw,1.1rem)]">
                      {feature.description}
                    </p>
                  </div>
                </FeatureItem>
              );
            })}
        </FeatureList>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] [grid-area:phone] min-[1100px]:aspect-auto min-[1100px]:max-w-none">
          {/* Riquadro con le proporzioni dell'immagine (2:3): la sfumatura dei bordi cade sui bordi veri. */}
          <PhoneEntrance className="app-phone absolute left-1/2 top-1/2 aspect-[2/3] h-[118%] -translate-x-1/2 -translate-y-1/2 min-[1100px]:h-[132%]">
            <Image
              src="/images/homepage/section_3/mobile_app.webp"
              alt="L'app FESPA sul telefono: il check-in settimanale con energia, sonno e stress"
              fill
              quality={90}
              sizes="(min-width: 1100px) 50vw, 100vw"
              className="object-contain"
            />
          </PhoneEntrance>

          <FloatIn delay={0.5} className={cn(GLASS, "absolute left-[-3%] top-[29%] hidden w-[36%] max-w-[15rem] items-start gap-3 p-4 min-[1100px]:flex")}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6d7cf6] to-[#a468ef]">
              <Check className="size-5 text-white" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-white">Check-in inviato!</span>
              <span className="mt-1 block text-[13px] leading-snug text-white/70">La tua coach lo leggerà e ti risponderà presto.</span>
            </span>
          </FloatIn>

          <FloatIn delay={0.7} className={cn(GLASS, "absolute left-[3%] top-[55%] hidden w-[30%] max-w-[13.5rem] p-4 min-[1100px]:block")}>
            <span className="flex items-center gap-2.5 text-[14px] font-medium text-white">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#5b63f2]">
                <BarChart3 className="size-4 text-white" strokeWidth={2} />
              </span>
              I tuoi progressi
            </span>
            <span className="mt-3 block font-sans text-[2rem] font-semibold leading-none text-white">+12%</span>
            <span className="mt-2 block text-[13px] leading-snug text-white/70">Rispetto alla scorsa settimana</span>
          </FloatIn>

          <FloatIn delay={0.9} className={cn(GLASS, "absolute right-[-4%] top-[17%] hidden w-[34%] max-w-[15rem] p-4 min-[1100px]:block")}>
            <span className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f3b5cf] to-[#a468ef] text-[15px] font-semibold text-white">M</span>
              <span>
                <span className="block text-[15px] font-semibold text-white">Martina</span>
                <span className="block text-[12.5px] text-white/65">Coach FESPA</span>
              </span>
            </span>
            <span className="mt-3 block text-[14px] leading-snug text-white/90">Ottimo lavoro questa settimana! 💜 Continuiamo così.</span>
            <span className="mt-2 block text-right text-[11px] text-white/50">10:24</span>
          </FloatIn>

          <FloatIn delay={1.1} className={cn(GLASS, "absolute right-[-2%] top-[57%] hidden w-[33%] max-w-[15rem] items-center gap-3 p-4 min-[1100px]:flex")}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d774d9] to-[#a468ef]">
              <Dumbbell className="size-5 text-white" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-white">Piano personalizzato</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-white/65">Aggiornato in base ai tuoi check-in</span>
            </span>
          </FloatIn>
        </div>
      </div>

      {/* Onda crema: la sezione scura finisce in una curva che sale, non con un taglio. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[clamp(4rem,9vw,9rem)] w-full"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="app-wave-glow" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#8f9cf8" stopOpacity=".55" />
            <stop offset=".45" stopColor="#b69cf2" stopOpacity=".35" />
            <stop offset="1" stopColor="#e3a6ea" stopOpacity=".2" />
          </linearGradient>
          <filter id="app-wave-blur" x="-5%" y="-50%" width="110%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <path d="M0 58 C220 18 460 8 720 40 C980 72 1210 96 1440 66 L1440 140 L0 140 Z" fill="url(#app-wave-glow)" filter="url(#app-wave-blur)" />
        <path d="M0 64 C220 26 460 16 720 48 C980 80 1210 104 1440 74 L1440 140 L0 140 Z" fill="#fbf8f5" />
      </svg>
    </section>
  );
}
