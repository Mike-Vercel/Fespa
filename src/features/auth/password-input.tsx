"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/form-fields";
import { cn } from "@/lib/cn";
import { PasswordHelix } from "./password-helix";

type Sweep = "idle" | "revealing" | "hiding";

/**
 * Campo password con "mostra/nascondi" animato: un nastro viola si avvolge a spirale attorno al campo
 * (davanti, dietro, davanti…) e, dove è già passato, i pallini diventano lettere (da sinistra a destra);
 * nascondendo, fa il percorso inverso e le ricopre.
 *
 * Tecnica: durante il passaggio il campo vero è già di tipo "text"; sopra c'è una sua copia di tipo
 * "password" (solo decorativa: non interattiva, non inviata col form, ignorata dagli screen reader)
 * ritagliata progressivamente con clip-path. Così i pallini sono esattamente quelli del browser.
 * Con "riduci movimento" il cambio è istantaneo.
 */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Solo lettere e cifre: l'id finisce dentro url(#…) dei gradienti SVG.
  const helixId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [isVisible, setIsVisible] = useState(false);
  const [sweep, setSweep] = useState<Sweep>("idle");
  const [maskedValue, setMaskedValue] = useState("");

  function toggle() {
    if (sweep !== "idle") {
      return; // un passaggio alla volta
    }
    const nextVisible = !isVisible;
    const currentValue = inputRef.current?.value ?? "";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (currentValue && !prefersReducedMotion) {
      setMaskedValue(currentValue);
      setSweep(nextVisible ? "revealing" : "hiding");
    }
    setIsVisible(nextVisible);
  }

  // Nascondendo, il testo resta visibile sotto la copia a pallini finché il nastro non ha finito.
  const showsText = isVisible || sweep !== "idle";
  const direction = sweep === "hiding" ? "backward" : "forward";

  return (
    <div className="relative">
      {sweep !== "idle" ? <PasswordHelix layer="back" direction={direction} idPrefix={helixId} /> : null}

      {/* z-10: sopra i tratti "dietro" del nastro, sotto quelli "davanti". */}
      <Input {...props} ref={inputRef} type={showsText ? "text" : "password"} className="relative z-10 pr-11" />

      {sweep !== "idle" ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-md">
            <Input
              type="password"
              value={maskedValue}
              readOnly
              tabIndex={-1}
              autoComplete="off"
              onAnimationEnd={() => setSweep("idle")}
              ref={(mask) => {
                // Se il testo è più lungo del campo, la copia parte dallo stesso punto di scorrimento.
                if (mask && inputRef.current) mask.scrollLeft = inputRef.current.scrollLeft;
              }}
              className={cn("pr-11", sweep === "revealing" ? "password-mask-uncover" : "password-mask-cover")}
            />
          </div>
          <PasswordHelix layer="front" direction={direction} idPrefix={helixId} />
        </>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label={isVisible ? "Nascondi password" : "Mostra password"}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 z-30 inline-flex w-11 items-center justify-center rounded-r-md text-ink-3 transition-colors hover:text-ink"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.75} />
        ) : (
          <Eye aria-hidden="true" className="size-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
