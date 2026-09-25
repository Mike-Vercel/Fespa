import { METHOD_PILLARS } from "./content";
import { HeroPillars } from "./hero-pillars";
import { HeroPortal } from "./hero-portal";

/**
 * Hero: FESPA in viola, "portale" nelle lettere allo scroll (vedi hero-portal.tsx);
 * dentro la lettera, sul viola del logo, i tre principi del metodo.
 */
export function HeroSection() {
  return (
    <HeroPortal
      front={
        <>
          <p
            className="absolute inset-x-0 px-4 text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-brand sm:text-xs"
            style={{ top: "calc(var(--gp-word-top, 30%) - 3.25rem)" }}
          >
            Metodo FESPA®
          </p>
          <p
            className="absolute inset-x-0 px-6 text-center font-serif text-[clamp(1.2rem,2.6vw,2rem)] italic leading-snug text-ink-2 text-balance"
            style={{ top: "calc(var(--gp-word-bottom, 70%) + 1.5rem)" }}
          >
            Il metodo per tornare a sentirti bene
          </p>
        </>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="sr-only">Metodo FESPA®: online coaching e ri-educazione alimentare per donne</h1>
        {/* I tre principi su una riga, separati da linee verticali; su telefono uno sotto l'altro. */}
        <HeroPillars pillars={METHOD_PILLARS} />
      </div>
    </HeroPortal>
  );
}
