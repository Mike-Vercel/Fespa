import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { LANDING_SECTIONS, LOGIN_PATH, OFFICIAL_SITE_URL, SIGNUP_PATH, SOCIAL_LINKS } from "./content";
import { Container, ExternalLink } from "./primitives";

/** Footer della home, nero come la sezione Domande che lo precede. */
export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    // theme-dark: testi e link chiari. Stesso nero della sezione Domande (#0c0c11), che ci sfuma dentro.
    <footer className="theme-dark border-t border-white/10 bg-[#0c0c11]">
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

      <div className="border-t border-white/10">
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
