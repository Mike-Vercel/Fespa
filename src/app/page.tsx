import type { Metadata } from "next";
import { AppSection } from "@/features/marketing/app-section";
import { ClosingCta, FaqSection, LandingFooter } from "@/features/marketing/closing-sections";
import { HeroSection, PressStrip } from "@/features/marketing/hero-section";
import { JourneySection } from "@/features/marketing/journey-section";
import { LandingHeader } from "@/features/marketing/landing-header";
import { MethodSection } from "@/features/marketing/method-section";
import { TeamSection, TestimonialsSection } from "@/features/marketing/people-sections";

export const metadata: Metadata = {
  title: { absolute: "Metodo FESPA® · Online coaching e ri-educazione alimentare per donne" },
  description:
    "Rimodella il tuo corpo senza diete restrittive, senza eliminare i carboidrati e senza ore di palestra. Registrati gratis e parti dalla consulenza gratuita.",
  // L'indicizzazione resta disattivata (impostazione del layout) finché questo prototipo
  // affianca il sito ufficiale: da riattivare quando la home andrà in produzione.
};

/**
 * Home pubblica: racconta il metodo e porta alla registrazione (funnel).
 * Pagina statica, uguale per tutti: chi ha già un account passa da "Accedi" e il proxy
 * lo porta direttamente nella sua area.
 */
export default function HomePage() {
  return (
    <div className="landing-page">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-on-ink"
      >
        Vai al contenuto
      </a>
      <LandingHeader />
      <main id="contenuto">
        <HeroSection />
        <PressStrip />
        <MethodSection />
        <JourneySection />
        <AppSection />
        <TeamSection />
        <TestimonialsSection />
        <FaqSection />
        <ClosingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
