"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, type MouseEvent, type ReactNode } from "react";

/*
 * Passaggio animato login ⇄ registrazione con la View Transitions API del browser.
 *
 * 1. Il browser fotografa la pagina attuale (login).
 * 2. Si naviga con il router di Next; il browser tiene ferma la foto finché la nuova pagina non è montata.
 * 3. AuthVariantReady, dentro la nuova pagina, segnala "pronta": il browser fotografa il "dopo"
 *    e anima i pannelli con le regole CSS di globals.css (classi auth-form e auth-aside).
 *
 * Senza supporto del browser, con "riduci movimento" o con Ctrl/Cmd-click resta la navigazione normale.
 */

export type AuthVariant = "access" | "signup";

/** Oltre questo tempo la transizione si chiude comunque (es. rete lenta): meglio un taglio netto che un blocco. */
const MAX_WAIT_MS = 3000;

let pendingSwap: { target: AuthVariant; resolve: () => void } | null = null;

function waitForVariant(target: AuthVariant): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      pendingSwap = null;
      resolve();
    };
    const timeout = window.setTimeout(finish, MAX_WAIT_MS);
    pendingSwap = { target, resolve: finish };
  });
}

/** Da montare dentro ogni AuthShell: dice alla transizione in corso che la pagina di arrivo è pronta. */
export function AuthVariantReady({ variant }: { variant: AuthVariant }) {
  useLayoutEffect(() => {
    if (pendingSwap?.target === variant) {
      pendingSwap.resolve();
    }
  }, [variant]);
  return null;
}

type AuthSwapLinkProps = {
  href: "/login" | "/registrati";
  /** La variante di AuthShell che la pagina di arrivo mostrerà. */
  target: AuthVariant;
  className?: string;
  children: ReactNode;
};

export function AuthSwapLink({ href, target, className, children }: AuthSwapLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isPlainClick || prefersReducedMotion || typeof document.startViewTransition !== "function") {
      return; // navigazione normale di <Link>
    }

    event.preventDefault();
    document.startViewTransition(() => {
      router.push(href);
      return waitForVariant(target);
    });
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
