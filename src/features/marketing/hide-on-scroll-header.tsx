"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
 * Navbar della home che si nasconde scorrendo verso il basso e ricompare scorrendo verso l'alto.
 * Dentro la hero resta sempre visibile: la scena del portale FESPA è agganciata sotto la barra,
 * e senza la barra resterebbe una striscia vuota sopra di lei.
 * Stili: .landing-header[data-hidden] in globals.css (con il focus da tastiera la barra resta visibile).
 */

/** Pixel da scorrere nella stessa direzione prima di cambiare stato: niente tremolii. */
const DIRECTION_THRESHOLD = 12;

export function HideOnScrollHeader({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let lastY = window.scrollY;
    let travelled = 0;
    let hidden = false;
    let raf = 0;

    const setHidden = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      header.dataset.hidden = String(next);
    };

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      const hero = document.querySelector<HTMLElement>(".hero-portal");
      const inHero = hero ? hero.getBoundingClientRect().bottom > header.offsetHeight : false;
      if (y <= header.offsetHeight || inHero) {
        travelled = 0;
        setHidden(false);
        return;
      }
      // Si accumula lo scorrimento finché la direzione non cambia.
      travelled = Math.sign(delta) === Math.sign(travelled) ? travelled + delta : delta;
      if (travelled > DIRECTION_THRESHOLD) setHidden(true);
      else if (travelled < -DIRECTION_THRESHOLD) setHidden(false);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header ref={ref} className={className}>
      {children}
    </header>
  );
}
