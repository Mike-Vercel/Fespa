"use client";

import { animate, useInView, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/*
 * Confronto PRIMA / DOPO con divisore trascinabile.
 *
 * - Le due immagini occupano ESATTAMENTE la stessa area (absolute, inset 0, stesso object-fit e
 *   object-position): cambia solo quanto della foto PRIMA viene rivelato (clip-path), mai la
 *   dimensione o la posizione. Il soggetto non "salta" durante il trascinamento.
 * - Mouse, touch, penna (Pointer Events) e tastiera (role="slider", frecce, Home/Fine).
 * - Su touch `touch-action: pan-y`: lo scroll verticale della pagina resta del browser; il divisore
 *   si muove solo con un gesto orizzontale, e la pagina non viene mai bloccata.
 * - La posizione iniziale arriva dal CSS (anche diversa per breakpoint): nessun salto all'idratazione.
 */

type SliderImage = { src: string; alt: string };

type BeforeAfterSliderProps = {
  before: SliderImage;
  after: SliderImage;
  /** Posizione iniziale (0-100): su telefono e da `lg` in su. */
  initialPosition: { base: number; lg: number };
  beforeLabel: ReactNode;
  afterLabel: ReactNode;
  /** Posizione delle etichette (ferme: non seguono il divisore). */
  beforeLabelClassName?: string;
  afterLabelClassName?: string;
  /** `sizes` di next/image: dipende da quanto spazio occupa il confronto nella pagina. */
  sizes: string;
  /**
   * true: il file originale senza ricompressione. Utile per foto già ottimizzate (es. WebP)
   * mostrate a una dimensione vicina all'originale: una seconda compressione le sgrana.
   */
  unoptimized?: boolean;
  /** Stesso valore per entrambe le immagini (es. "50% 10%"). */
  objectPosition?: string;
  className?: string;
  /** Classi per lo strato delle foto (es. una maschera che le sfuma nello sfondo). */
  imagesClassName?: string;
  labelsClassName?: string;
  ariaLabel?: string;
  /**
   * Alla prima comparsa il divisore fa un breve "assaggio" (destra → sinistra → posizione iniziale)
   * per far capire che si può trascinare. Si ferma al primo tocco; mai con "riduci movimento".
   */
  demoOnView?: boolean;
};

const LG_QUERY = "(min-width: 1024px)";
const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;
/** Sotto questa soglia (px) un gesto touch non è ancora "orizzontale": decide il browser (scroll). */
const TOUCH_INTENT_PX = 6;

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Etichetta della parte che domina: divisore verso destra → si vede soprattutto PRIMA,
 * verso sinistra → soprattutto DOPO. In mezzo restano entrambe.
 */
const BEFORE_DOMINANT_FROM = 58;
const AFTER_DOMINANT_UNTIL = 42;

function dominantSide(position: number): "before" | "after" | "both" {
  if (position >= BEFORE_DOMINANT_FROM) return "before";
  if (position <= AFTER_DOMINANT_UNTIL) return "after";
  return "both";
}

function subscribeToLg(onChange: () => void) {
  const media = window.matchMedia(LG_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function BeforeAfterSlider({
  before,
  after,
  initialPosition,
  beforeLabel,
  afterLabel,
  beforeLabelClassName,
  afterLabelClassName,
  sizes,
  unoptimized = false,
  objectPosition = "50% 50%",
  className,
  imagesClassName,
  labelsClassName,
  ariaLabel = "Confronta prima e dopo",
  demoOnView = false,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; active: boolean } | null>(null);
  // null finché la persona non interagisce: vale la posizione iniziale del CSS (per breakpoint).
  const [position, setPosition] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isLg = useSyncExternalStore(subscribeToLg, () => window.matchMedia(LG_QUERY).matches, () => false);
  const initial = isLg ? initialPosition.lg : initialPosition.base;
  // Posizione dell'assaggio automatico: vale solo finché la persona non tocca lo slider.
  const [demo, setDemo] = useState<number | null>(null);
  const demoControls = useRef<AnimationPlaybackControls | null>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const current = position ?? demo ?? initial;
  const handleId = useId();

  useEffect(() => {
    if (!demoOnView || !inView || reduceMotion || position !== null) return;
    const controls = animate(initial, [initial, initial + 22, initial - 20, initial], {
      duration: 2.6,
      delay: 1.6,
      ease: "easeInOut",
      times: [0, 0.35, 0.75, 1],
      onUpdate: (latest) => setDemo(latest),
      onComplete: () => setDemo(null),
    });
    demoControls.current = controls;
    return () => controls.stop();
    // L'assaggio parte una volta sola, alla prima comparsa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoOnView, inView, reduceMotion]);

  /** Al primo tocco l'assaggio si ferma: da lì in poi comanda la persona. */
  function stopDemo() {
    demoControls.current?.stop();
    demoControls.current = null;
    setDemo(null);
  }

  function positionFromClientX(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return current;
    return clamp(((clientX - rect.left) / rect.width) * 100);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopDemo();
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: event.pointerType !== "touch" };
    if (event.pointerType !== "touch") {
      // Mouse e penna: si può anche cliccare in un punto per spostarci il divisore.
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setPosition(positionFromClientX(event.clientX));
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.active) {
      // Touch: si attiva solo quando il gesto è chiaramente orizzontale.
      const dx = Math.abs(event.clientX - state.startX);
      const dy = Math.abs(event.clientY - state.startY);
      if (dx < TOUCH_INTENT_PX || dx < dy) return;
      state.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    setPosition(positionFromClientX(event.clientX));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const next: Record<string, number> = {
      ArrowLeft: current - step,
      ArrowDown: current - step,
      ArrowRight: current + step,
      ArrowUp: current + step,
      PageDown: current - KEY_STEP_LARGE,
      PageUp: current + KEY_STEP_LARGE,
      Home: 0,
      End: 100,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    stopDemo();
    setPosition(clamp(next[event.key]));
  }

  const override = position ?? demo;
  const style = {
    "--ba-initial": initialPosition.base,
    "--ba-initial-lg": initialPosition.lg,
    ...(override !== null ? { "--ba-pos": override } : {}),
  } as CSSProperties;

  const imageProps = { fill: true, sizes, unoptimized, draggable: false, className: "select-none object-cover", style: { objectPosition } } as const;

  return (
    <div
      ref={containerRef}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "before-after relative isolate touch-pan-y select-none overflow-hidden",
        isDragging ? "cursor-ew-resize" : "cursor-default",
        className,
      )}
    >
      <div aria-hidden="true" className={cn("absolute inset-0", imagesClassName)}>
        <Image src={after.src} alt="" {...imageProps} />
        {/* Stesso box e stessa inquadratura: cambia solo la parte visibile. */}
        <div className="before-after__before absolute inset-0">
          <Image src={before.src} alt="" {...imageProps} />
        </div>
      </div>

      {/* Etichette ferme (non seguono il divisore): resta visibile quella della parte che domina. */}
      <div aria-hidden="true" data-dominant={dominantSide(current)} className={cn("before-after__labels pointer-events-none absolute inset-x-0", labelsClassName)}>
        <span data-ba-label="before" className={cn("absolute transition-opacity duration-300", beforeLabelClassName)}>
          {beforeLabel}
        </span>
        <span data-ba-label="after" className={cn("absolute transition-opacity duration-300", afterLabelClassName)}>
          {afterLabel}
        </span>
      </div>

      <div aria-hidden="true" className="before-after__line pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-white/95 shadow-[0_0_12px_rgb(31_29_26/0.25)]" />

      <div
        id={handleId}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(current)}
        aria-valuetext={`${Math.round(current)}% prima, ${Math.round(100 - current)}% dopo`}
        onKeyDown={handleKeyDown}
        className={cn(
          "before-after__handle absolute top-1/2 inline-flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_22px_-6px_rgb(31_29_26/0.45)] transition-transform duration-150 sm:size-16",
          "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand",
          isDragging ? "scale-105 cursor-grabbing" : "cursor-ew-resize hover:scale-105",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 7-5 5 5 5" />
          <path d="m15 7 5 5-5 5" />
        </svg>
      </div>

      {/* Per gli screen reader: le due foto, descritte una volta sola. */}
      <p className="sr-only">
        {before.alt}. {after.alt}.
      </p>
    </div>
  );
}
