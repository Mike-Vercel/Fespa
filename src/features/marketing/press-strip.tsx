import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { PRESS_MENTIONS } from "./content";

/*
 * "Ne hanno parlato": i loghi delle testate scorrono senza fine (solo CSS, vedi .press-marquee in globals.css).
 * La lista è ripetuta 4 volte: il nastro scorre di metà della sua lunghezza e riparte da capo senza salti,
 * anche sugli schermi più larghi. Solo la prima copia è letta dagli screen reader e raggiungibile con Tab.
 * Il mouse sopra ferma il nastro; con "riduci movimento" resta fermo e i loghi vanno a capo, centrati.
 */

const COPIES = 4;

/** Rapporto larghezza/altezza di riferimento: i loghi più larghi si abbassano, quelli più alti si stringono. */
const REFERENCE_RATIO = 5;

type Mention = (typeof PRESS_MENTIONS)[number];

function PressLogo({ mention, hidden }: { mention: Mention; hidden: boolean }) {
  // Stessa area visiva per tutti: altezza ∝ 1/√(larghezza/altezza).
  const scale = Math.sqrt(REFERENCE_RATIO / (mention.width / mention.height));
  const style = {
    "--logo": `url(${mention.logo})`,
    "--logo-scale": scale.toFixed(3),
    aspectRatio: `${mention.width} / ${mention.height}`,
  } as CSSProperties;
  const logo = <span aria-hidden="true" className="press-logo" style={style} />;

  if (!mention.article) {
    return (
      <span className="press-item">
        {logo}
        <span className="sr-only">{mention.name}</span>
      </span>
    );
  }
  return (
    <a
      href={mention.article.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={hidden ? -1 : undefined}
      className="press-item press-item--link"
    >
      {logo}
      <ArrowUpRight aria-hidden="true" className="press-item__arrow size-4 shrink-0" />
      <span className="sr-only">
        {mention.name}: «{mention.article.title}» (si apre in una nuova scheda)
      </span>
    </a>
  );
}

export function PressStrip() {
  return (
    <section aria-labelledby="press-title" className="press-strip border-b border-line bg-surface py-9 lg:py-11">
      <h2 id="press-title" className="px-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-3">
        Ne hanno parlato
      </h2>
      <div className="press-marquee mt-6 lg:mt-8">
        <div className="press-marquee__track">
          {Array.from({ length: COPIES }, (_, copy) => (
            <ul key={copy} aria-hidden={copy > 0 ? true : undefined} className={cn("press-marquee__list", copy > 0 && "press-marquee__list--copy")}>
              {PRESS_MENTIONS.map((mention) => (
                <li key={mention.name}>
                  <PressLogo mention={mention} hidden={copy > 0} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
