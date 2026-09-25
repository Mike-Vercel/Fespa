/*
 * Stato della Prova FESPA come lo vede il browser: niente token, id interni o dati tecnici.
 * Lo calcola il server (server/trial/service.ts); il client non decide nulla sul limite.
 */

export type TrialPhase =
  /** La persona può scrivere. */
  | "ready"
  /** FESPA AI sta rispondendo (o la risposta va riprovata). */
  | "awaiting_reply"
  /** Prima del terzo messaggio servono nome, email e consenso. */
  | "lead_required"
  /** Tre messaggi usati, riepilogo pronto. */
  | "completed";

export type TrialMessageView = { id: string; role: "user" | "assistant"; content: string };

export type TrialEmailStatus = "not_sent" | "sending" | "sent" | "failed";

export type TrialView = {
  phase: TrialPhase;
  remaining: number;
  /** Una generazione è in corso (per esempio da un'altra scheda): conviene aggiornare tra poco. */
  pending: boolean;
  messages: TrialMessageView[];
  lead: { name: string; email: string } | null;
  result: { insights: string[] } | null;
  email: { status: TrialEmailStatus; canRetry: boolean };
};

export type TrialErrorKind =
  | "unavailable"
  | "rate_limited"
  | "limit_reached"
  | "busy"
  | "lead_required"
  | "validation"
  | "ai_failed"
  | "email_failed"
  | "internal";

export type TrialPublicError = {
  kind: TrialErrorKind;
  message: string;
  /** true: il pulsante "Riprova" ha senso. */
  retryable: boolean;
  fieldErrors?: Record<string, string[]>;
};

/** Esito di ogni azione: lo stato aggiornato (se c'è) anche quando qualcosa è andato storto. */
export type TrialActionResult = { view: TrialView | null; error: TrialPublicError | null };
