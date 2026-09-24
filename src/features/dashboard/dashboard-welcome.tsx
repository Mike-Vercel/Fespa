"use client";

import { useEffect, useRef, useState } from "react";
import { WELCOME_SEEN_COOKIE } from "./welcome-cookie";

/**
 * Benvenuto a tutto schermo dopo l'accesso: data e saluto grandi sopra tutta l'app (sidebar compresa),
 * poi volano esattamente al posto dell'intestazione della dashboard mentre lo sfondo si dissolve.
 *
 * È già nell'HTML del server, così la dashboard non si intravede prima. Se JavaScript non parte,
 * un'animazione CSS di sicurezza lo toglie comunque dopo pochi secondi.
 */

const HOLD_MS = 1000;
const FLIGHT_MS = 900;
// Lo sfondo resta pieno per la prima parte del volo (il saluto grande non passa sopra le card)
// e finisce di dissolversi proprio all'atterraggio; le sezioni entrano insieme a lui.
const BACKDROP_FADE_DELAY_MS = 350;
const BACKDROP_FADE_MS = FLIGHT_MS - BACKDROP_FADE_DELAY_MS;
const FLIGHT_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

type DashboardWelcomeProps = {
  greeting: string;
  name: string;
  date: string;
  /** id dell'intestazione della pagina: data e saluto atterrano sui suoi `data-slot="eyebrow"` e `data-slot="title"`. */
  targetId: string;
};

export function DashboardWelcome({ greeting, name, date, targetId }: DashboardWelcomeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${WELCOME_SEEN_COOKIE}=1; Path=/; SameSite=Lax${secure}`;

    const root = rootRef.current;
    const backdrop = backdropRef.current;
    const eyebrow = eyebrowRef.current;
    const title = titleRef.current;
    const nameElement = nameRef.current;
    const header = document.getElementById(targetId);
    const targetEyebrow = header?.querySelector<HTMLElement>('[data-slot="eyebrow"]');
    const targetTitle = header?.querySelector<HTMLElement>('[data-slot="title"]');
    if (!root || !backdrop || !eyebrow || !title || !nameElement || !header || !targetEyebrow || !targetTitle) {
      setDone(true);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // JavaScript partito tardi: la rete di sicurezza CSS l'ha già tolto, non va rimostrato.
    const alreadyGone = getComputedStyle(root).visibility === "hidden";
    if (reducedMotion || alreadyGone) {
      setDone(true);
      return;
    }

    // Da qui il ritmo lo decide JavaScript: via la rete di sicurezza CSS.
    for (const animation of root.getAnimations()) animation.cancel();

    const landingSpots = [targetEyebrow, targetTitle];
    const animations: Animation[] = [];
    let revealTimer: number | undefined;
    let landingTimer: number | undefined;

    const showLandingSpots = () => {
      for (const element of landingSpots) element.style.removeProperty("visibility");
    };

    const holdTimer = window.setTimeout(() => {
      // Gli originali restano nascosti finché le copie grandi non ci atterrano sopra.
      for (const element of landingSpots) element.style.visibility = "hidden";
      animations.push(
        flyTo(eyebrow, targetEyebrow),
        flyTo(title, targetTitle),
        nameElement.animate({ color: getComputedStyle(targetTitle).color }, flightTiming()),
        backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: BACKDROP_FADE_MS,
          delay: BACKDROP_FADE_DELAY_MS,
          easing: "ease-in-out",
          fill: "forwards",
        }),
      );
      revealTimer = window.setTimeout(() => replayReveals(header), BACKDROP_FADE_DELAY_MS);
      landingTimer = window.setTimeout(() => {
        showLandingSpots();
        setDone(true);
      }, FLIGHT_MS);
    }, HOLD_MS);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(landingTimer);
      for (const animation of animations) animation.cancel();
      showLandingSpots();
    };
  }, [targetId]);

  if (done) return null;

  return (
    <div ref={rootRef} className="dashboard-welcome" aria-hidden="true">
      <div ref={backdropRef} className="dashboard-welcome__backdrop" />
      <div className="dashboard-welcome__content">
        <p ref={eyebrowRef} className="dashboard-welcome__eyebrow">
          {date}
        </p>
        <p ref={titleRef} className="dashboard-welcome__title">
          {greeting} <span ref={nameRef}>{name}</span>
        </p>
      </div>
    </div>
  );
}

function flightTiming(): KeyframeAnimationOptions {
  return { duration: FLIGHT_MS, easing: FLIGHT_EASING, fill: "forwards" };
}

/**
 * Porta `source` (grande, al centro) esattamente sopra `target` con traslazione e scala (FLIP).
 * Si allinea il testo, non i box: un <h1> è largo quanto la pagina, il suo testo no.
 */
function flyTo(source: HTMLElement, target: HTMLElement): Animation {
  const from = textRect(source);
  const to = textRect(target);
  const box = source.getBoundingClientRect();
  const scale = to.width / from.width;
  // Origine della trasformazione nell'angolo in alto a sinistra del box (transform-origin: 0 0 nel CSS).
  const dx = to.left - box.left - scale * (from.left - box.left);
  const dy = to.top - box.top - scale * (from.top - box.top);
  return source.animate(
    [
      { transform: "none", color: getComputedStyle(source).color },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, color: getComputedStyle(target).color },
    ],
    flightTiming(),
  );
}

function textRect(element: HTMLElement): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect();
}

/**
 * Le sezioni della dashboard entrano mentre lo sfondo si dissolve, non nascoste sotto il benvenuto.
 * L'intestazione non si muove (è il punto di atterraggio): compare solo la sua descrizione.
 */
function replayReveals(header: HTMLElement) {
  for (const element of document.querySelectorAll<HTMLElement>(".dashboard-reveal")) {
    if (element === header) continue;
    for (const animation of element.getAnimations()) {
      animation.cancel();
      animation.play();
    }
  }
  header
    .querySelector<HTMLElement>('[data-slot="description"]')
    ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 250, easing: "ease-out", fill: "backwards" });
}
