"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadTrialAction, resumeTrialAction, retryTrialEmailAction, sendTrialMessageAction, submitTrialLeadAction } from "./actions";
import type { TrialActionResult, TrialPublicError, TrialView } from "./types";

/*
 * Stato della chat nel browser. Non decide nulla sul limite: mostra ciò che il server restituisce.
 * Il messaggio appena scritto compare subito (in attesa di conferma); se il server non lo registra,
 * torna nel campo di testo per poterlo reinviare.
 */

export type TrialBusy = "loading" | "send" | "lead" | "resume" | "email" | null;

const NETWORK_ERROR: TrialPublicError = {
  kind: "internal",
  message: "Connessione assente o instabile. Controlla la rete e riprova.",
  retryable: true,
};

const POLL_INTERVAL_MS = 2_500;
const MAX_POLLS = 24;

export function useTrialChat() {
  const [view, setView] = useState<TrialView | null>(null);
  const [busy, setBusy] = useState<TrialBusy>("loading");
  const [error, setError] = useState<TrialPublicError | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const busyRef = useRef(false);
  const polls = useRef(0);

  const apply = useCallback((result: TrialActionResult) => {
    if (result.view) setView(result.view);
    setError(result.error);
  }, []);

  /** Esegue un'azione alla volta: un secondo clic durante l'attesa non parte. */
  const perform = useCallback(
    async (kind: Exclude<TrialBusy, null>, action: () => Promise<TrialActionResult>): Promise<TrialActionResult | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(kind);
      try {
        const result = await action();
        apply(result);
        return result;
      } catch {
        setError(NETWORK_ERROR);
        return null;
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    [apply],
  );

  useEffect(() => {
    let active = true;
    loadTrialAction()
      .then((result) => {
        if (active) apply(result);
      })
      .catch(() => {
        if (active) setError(NETWORK_ERROR);
      })
      .finally(() => {
        if (active) setBusy(null);
      });
    return () => {
      active = false;
    };
  }, [apply]);

  // Una risposta è in preparazione in un'altra richiesta (altra scheda, retry): si aggiorna da soli.
  useEffect(() => {
    if (!view?.pending || busy !== null || polls.current >= MAX_POLLS) return;
    const timer = window.setTimeout(() => {
      polls.current += 1;
      loadTrialAction().then(apply).catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [view, busy, apply]);

  /** true se il server ha registrato il messaggio (il campo si può svuotare). */
  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return false;
      setPendingText(trimmed);
      setError(null);
      const before = view?.remaining ?? 3;
      const result = await perform("send", () => sendTrialMessageAction({ clientMessageId: crypto.randomUUID(), text: trimmed }));
      setPendingText(null);
      polls.current = 0;
      return result?.view != null && result.view.remaining < before;
    },
    [perform, view],
  );

  const submitLead = useCallback(
    (lead: { name: string; email: string; privacyConsent: boolean }) => perform("lead", () => submitTrialLeadAction(lead)),
    [perform],
  );

  const resume = useCallback(() => perform("resume", resumeTrialAction), [perform]);
  const retryEmail = useCallback(() => perform("email", retryTrialEmailAction), [perform]);

  return { view, busy, error, pendingText, send, submitLead, resume, retryEmail };
}
