import { ClipboardPen, History, MessageCircleHeart, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { CheckinPreview } from "./app-previews";
import { APP_FEATURES, type AppFeatureIcon } from "./content";
import { Container, SectionIntro } from "./primitives";

const FEATURE_ICONS: Record<AppFeatureIcon, LucideIcon> = {
  checkin: ClipboardPen,
  reply: MessageCircleHeart,
  history: History,
  privacy: ShieldCheck,
};

/** Il prodotto che costruiamo noi: l'area clienti e il copilota AI della coach. */
export function AppSection() {
  return (
    <section aria-labelledby="app-title" id="app" className="scroll-mt-20 bg-ink py-20 text-on-ink lg:py-28">
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
        <div>
          <SectionIntro
            id="app-title"
            tone="dark"
            eyebrow="L'app del Metodo FESPA"
            title="La tua coach, sempre a portata di mano."
            description="Un'area personale dove racconti la tua settimana e ricevi le risposte della tua coach. Semplice da usare, anche dal telefono."
          />

          <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
            {APP_FEATURES.map((feature) => {
              const Icon = FEATURE_ICONS[feature.icon];
              return (
                <li key={feature.title}>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-on-ink/10">
                    <Icon aria-hidden="true" className="size-5 text-accent-soft" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-on-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-on-ink/75">{feature.description}</p>
                </li>
              );
            })}
          </ul>

          <div className="mt-12 rounded-2xl border border-on-ink/15 bg-on-ink/5 p-6 sm:p-7">
            <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-soft">
              <Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Il nostro copilota AI
            </p>
            <h3 className="mt-3 font-serif text-[24px] leading-snug text-on-ink">
              Tecnologia al servizio della tua coach, non al suo posto.
            </h3>
            <p className="mt-2 text-[16px] leading-relaxed text-on-ink/75">
              L&apos;intelligenza artificiale aiuta la coach a leggere i check-in e a preparare le risposte. Ogni parola
              che ricevi è scelta e approvata da lei: l&apos;AI propone, la coach decide.
            </p>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <CheckinPreview className="-rotate-[1.5deg] ring-1 ring-on-ink/20" />
        </div>
      </Container>
    </section>
  );
}
