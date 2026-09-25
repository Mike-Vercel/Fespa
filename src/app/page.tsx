import type { Metadata } from "next";
import { cn } from "@/lib/cn";
import { FaqSection } from "@/features/marketing/faq-section";
import { FespaAppSection } from "@/features/marketing/fespa-app-section";
import { landingDisplay, landingSerif } from "@/features/marketing/fonts";
import { HeroSection } from "@/features/marketing/hero-section";
import { HowItWorksSection } from "@/features/marketing/how-it-works-section";
import { LandingFooter } from "@/features/marketing/landing-footer";
import { LandingIntro } from "@/features/marketing/landing-intro";
import { LandingHeader } from "@/features/marketing/landing-header";
import { MethodSection } from "@/features/marketing/method-section";
import { TestimonialsSection } from "@/features/marketing/testimonials-section";
import { TeamSection } from "@/features/marketing/team-section";
import { PressStrip } from "@/features/marketing/press-strip";
import { FespaTrialSection } from "@/features/public-trial/trial-section";
import { TransformationSection } from "@/features/marketing/transformation-section";

// La Prova FESPA (server action nella home) attende la risposta dell'AI e l'invio dell'email.
export const maxDuration = 60;

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
    <LandingIntro>
      <div className={cn("landing-page", landingSerif.variable, landingDisplay.variable)}>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-on-ink"
      >
        Vai al contenuto
      </a>
      <LandingHeader />
      <main id="contenuto">
        <HeroSection />
        <TransformationSection />
        <MethodSection />
        <PressStrip />
        <HowItWorksSection />
        <FespaAppSection />
        <FespaTrialSection />
        <TeamSection />
        <TestimonialsSection />
        <FaqSection />
      </main>
      <LandingFooter />
      </div>
    </LandingIntro>
  );
}
