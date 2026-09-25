"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { runAutomationsAction } from "../actions";

/**
 * Prepara le bozze delle automazioni quando la coach apre l'app e ci sono nuovi check-in in coda.
 * Nessun polling: parte solo se il server segnala eventi in attesa, e lavora con la sessione della coach.
 */
export function AutomationRunner({ pending }: { pending: number }) {
  const router = useRouter();

  useEffect(() => {
    if (pending <= 0) return;
    let cancelled = false;
    void runAutomationsAction().then((result) => {
      if (!cancelled && result.ok && result.data.processed > 0) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [pending, router]);

  return null;
}
