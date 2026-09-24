import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { FAQ, LANDING_SECTIONS, LOGIN_PATH, OFFICIAL_SITE_URL, SIGNUP_PATH, SOCIAL_LINKS } from "./content";
import { Container, ExternalLink, SectionIntro } from "./primitives";

/** Domande frequenti con <details>: accessibili da tastiera e funzionanti anche senza JavaScript. */
export function FaqSection() {
  return (
    <section aria-labelledby="domande-title" id="domande" className="scroll-mt-20 py-20 lg:py-28">
      <Container className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionIntro
          id="domande-title"
          eyebrow="Domande frequenti"
          title="Tutto quello che vuoi sapere prima di iniziare."
          description="Hai altri dubbi? Ne parliamo insieme durante la consulenza gratuita."
        />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 pr-9 text-[16px] leading-relaxed text-ink-2">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section aria-labelledby="inizia-title" className="pb-20 lg:pb-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-accent-strong px-6 py-14 text-center sm:px-12 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.12)_0%,transparent_65%)]"
          />
          <h2
            id="inizia-title"
            className="relative mx-auto max-w-2xl font-serif text-[34px] leading-[1.1] text-on-ink text-balance sm:text-[46px]"
          >
            Il vero cambiamento parte dalla testa.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-on-ink/85">
            Registrati gratis: ti contattiamo per la consulenza e costruiamo insieme il percorso più adatto a te.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <Link
              href={SIGNUP_PATH}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-paper px-6 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-surface focus-visible:outline-on-ink"
            >
              Inizia ora, è gratis
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href={LOGIN_PATH}
              className="rounded-md px-2 py-2.5 text-[15px] text-on-ink/85 underline underline-offset-4 transition-colors hover:text-on-ink focus-visible:outline-on-ink"
            >
              Hai già un account? Accedi
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-sidebar">
      <Container className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark subtitle="Metodo®" />
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
            Il primo percorso di ri-educazione alimentare e online coaching in Italia. Marchio registrato®.
          </p>
        </div>

        <nav aria-label="Il percorso">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">Il percorso</h2>
          <ul className="mt-3 flex flex-col text-[14px]">
            {LANDING_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink hover:underline">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Il tuo account">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">Il tuo account</h2>
          <ul className="mt-3 flex flex-col text-[14px]">
            <li>
              <Link href={SIGNUP_PATH} className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink hover:underline">
                Registrati
              </Link>
            </li>
            <li>
              <Link href={LOGIN_PATH} className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink hover:underline">
                Accedi
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Seguici">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">Seguici</h2>
          <ul className="mt-3 flex flex-col text-[14px]">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <ExternalLink href={social.href} className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink hover:underline">
                  {social.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-3 py-6 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Metodo FESPA®. Tutti i diritti riservati.</p>
          <ul className="flex flex-wrap gap-x-5">
            <li>
              <ExternalLink href={OFFICIAL_SITE_URL} className="min-h-10 hover:text-ink">
                Sito ufficiale
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href={`${OFFICIAL_SITE_URL}/privacy`} className="min-h-10 hover:text-ink">
                Privacy
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href={`${OFFICIAL_SITE_URL}/termini`} className="min-h-10 hover:text-ink">
                Termini e condizioni
              </ExternalLink>
            </li>
          </ul>
        </Container>
      </div>
    </footer>
  );
}
