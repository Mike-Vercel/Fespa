import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { LANDING_SECTIONS, LOGIN_PATH, SIGNUP_PATH } from "./content";
import { Container } from "./primitives";

/** Barra superiore fissa: la CTA di registrazione resta sempre a portata di mano. */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md py-1" aria-label="Metodo FESPA, torna all'inizio">
          <LogoMark />
          <Wordmark subtitle="Metodo®" />
        </Link>

        <nav aria-label="Sezioni della pagina" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LANDING_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="rounded-md px-3 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href={LOGIN_PATH} className={buttonClasses("ghost", "md", "px-3")}>
            Accedi
          </Link>
          <Link href={SIGNUP_PATH} className={buttonClasses("primary", "md")}>
            Inizia gratis
          </Link>
        </div>
      </Container>
    </header>
  );
}
