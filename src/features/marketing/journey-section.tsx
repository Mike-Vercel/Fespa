import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { JOURNEY_STEPS, SIGNUP_PATH } from "./content";
import { Container, CTA_PRIMARY, SectionIntro } from "./primitives";

/** Il funnel reso esplicito: cosa succede dopo il clic, passo per passo. */
export function JourneySection() {
  return (
    <section aria-labelledby="come-funziona-title" id="come-funziona" className="scroll-mt-20 bg-sidebar py-20 lg:py-28">
      <Container>
        <SectionIntro
          id="come-funziona-title"
          eyebrow="Come funziona"
          title="Dal primo clic alla tua coach, in quattro passi."
          description="Parti da qui: la registrazione è gratuita e non ti impegna a nulla."
        />

        <ol className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {JOURNEY_STEPS.map((step, index) => (
            <li key={step.title} className="relative border-t-2 border-line-strong pt-6 first:border-accent">
              <p className="tabular font-serif text-[40px] leading-none text-accent-strong">{index + 1}</p>
              <h3 className="mt-4 text-[18px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Link href={SIGNUP_PATH} className={CTA_PRIMARY}>
            Inizia dal primo passo
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <p className="text-[14px] text-ink-3">Ti servono solo un&apos;email e tre minuti.</p>
        </div>
      </Container>
    </section>
  );
}
