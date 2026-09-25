"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import GlyphPortal, { type GlyphPortalStyle } from "./glyph-portal";

/** Il font del sito (Schibsted Grotesk, variabile fino a 900) al posto di Arial Black. */
const PORTAL_FONT = "var(--font-schibsted)";
const PORTAL_WEIGHT = 900;
/** Altezza dell'header della home (h-16 + bordo): la scena resta sotto la barra. */
const LANDING_HEADER_HEIGHT = 65;

/** Colori del logo FESPA: indaco profondo → blu → viola → lilla rosato. */
const FIELD_BACKGROUND = [
  "radial-gradient(circle at 84% 12%, rgba(240,176,224,.55), transparent 38%)",
  "radial-gradient(circle at 10% 90%, rgba(80,128,255,.45), transparent 42%)",
  "radial-gradient(circle at 50% 48%, rgba(88,70,228,.4), transparent 62%)",
  // Stop finali non troppo chiari: il testo bianco resta sopra 4,5:1 (WCAG AA).
  "linear-gradient(140deg, #2a22b8 0%, #4238d8 40%, #5d49e6 72%, #7a57ea 100%)",
].join(", ");

const PORTAL_STYLE: GlyphPortalStyle = {
  "--gp-paper": "#ffffff",
  "--gp-ink": "#1f1d1a",
  // Tinta unita di riserva (senza JavaScript o con riduzione del movimento).
  "--gp-field": "#4a3fe0",
  "--gp-foreground": "#ffffff",
};

/** Da che punto dello scroll il contenuto dentro la lettera è visibile (il portale lo mostra tra 0,78 e 0,9). */
const REVEAL_AT = 0.82;
/** Sotto questa soglia si torna "nascosti": riscendendo, l'animazione d'ingresso si ripete. */
const REVEAL_RESET = 0.7;
/** Se il portale resta statico (riduzione del movimento, font non disponibile) il contenuto è già visibile. */
const STATIC_CHECK_MS = 800;

const PortalRevealContext = createContext(false);

/** True quando il contenuto dentro la lettera è visibile: serve per far partire le animazioni d'ingresso. */
export function usePortalRevealed(): boolean {
  return useContext(PortalRevealContext);
}

/**
 * Hero della home: la parola FESPA in viola; scorrendo, la "camera" entra in una lettera
 * e il suo colore diventa lo sfondo su cui compare il messaggio principale.
 */
export function HeroPortal({ front, children }: { front: ReactNode; children: ReactNode }) {
  // Il portale misura le lettere quando si monta e resta statico se un font della lista non è
  // pronto: la variabile di next/font include anche il font di riserva ("… Fallback").
  // A font caricato si passa solo il nome reale e il portale si rimonta.
  const [family, setFamily] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const first = getComputedStyle(document.documentElement).getPropertyValue("--font-schibsted").split(",")[0]?.trim();
    if (!first) return;
    void document.fonts
      .load(`${PORTAL_WEIGHT} 100px ${first}`, "FESPA")
      .catch(() => [])
      .then(() => document.fonts.ready)
      .then(() => {
        if (alive && document.fonts.check(`${PORTAL_WEIGHT} 100px ${first}`, "FESPA")) setFamily(first);
      });
    return () => {
      alive = false;
    };
  }, []);

  const [revealed, setRevealed] = useState(false);
  // Chiamato a ogni fotogramma di scroll: lo stato cambia solo quando si attraversa una soglia.
  const handleProgress = useCallback((progress: number) => {
    setRevealed((current) => (current ? progress > REVEAL_RESET : progress >= REVEAL_AT));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const portal = document.querySelector<HTMLElement>(".hero-portal");
      if (portal && portal.dataset.gpMotion !== "on") setRevealed(true);
    }, STATIC_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [family]);

  return (
    <GlyphPortal
      key={family ?? "font-loading"}
      onProgress={handleProgress}
      word="FESPA"
      fontFamily={family ?? PORTAL_FONT}
      fontWeight={PORTAL_WEIGHT}
      topOffset={LANDING_HEADER_HEIGHT}
      scrollLength={2.4}
      enterLabel="Scopri il metodo"
      // hero-portal--final: montato con il font vero, misure definitive (l'intro della home parte da qui).
      className={family ? "hero-portal hero-portal--final font-sans" : "hero-portal font-sans"}
      style={PORTAL_STYLE}
      front={front}
      outro={<div className="hero-portal-outro" />}
      background={
        <div aria-hidden="true" className="absolute inset-0" style={{ background: FIELD_BACKGROUND, transform: "scale(var(--gp-field-scale,1))" }} />
      }
    >
      <PortalRevealContext value={revealed}>{children}</PortalRevealContext>
    </GlyphPortal>
  );
}
