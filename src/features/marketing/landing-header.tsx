import Link from "next/link";
import Image from "next/image";
import { buttonClasses } from "@/components/ui/button";
import { LANDING_SECTIONS, LOGIN_PATH, SIGNUP_PATH } from "./content";
import { Container } from "./primitives";

/** Barra superiore fissa: la CTA di registrazione resta sempre a portata di mano. */
export function LandingHeader() {
  return (
    <header className="landing-header sticky top-0 z-30 border-b border-line/70 bg-white">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center rounded-md py-1" aria-label="FESPA Coach AI, torna all'inizio">
          <Image src="/images/brand/logo-homepage.webp" alt="FESPA Coach AI" width={92} height={46} className="h-11 w-[88px] object-contain" priority />
        </Link>

        <nav aria-label="Sezioni della pagina" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LANDING_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="landing-nav-link rounded-md px-3 py-2 text-[13px] font-medium text-ink-2 transition-colors duration-200 hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href={LOGIN_PATH} className={buttonClasses("ghost", "md", "px-3 text-[13px]")}>
            Accedi
          </Link>
          <Link href={SIGNUP_PATH} className={buttonClasses("primary", "md", "rounded-full px-5 text-[13px] shadow-[0_8px_20px_-12px_rgb(31_29_26/0.7)]")}>
            Inizia
          </Link>
        </div>
      </Container>
    </header>
  );
}
