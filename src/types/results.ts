/**
 * Contratti di errore/risultato condivisi tra server e client.
 * Contengono solo dati sicuri da mostrare: mai messaggi interni o stack trace.
 */

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "AI_NOT_CONFIGURED"
  | "AI_UNAVAILABLE"
  | "AI_PROVIDER_REJECTED"
  | "AI_TIMEOUT"
  | "AI_INVALID_OUTPUT"
  | "AI_REFUSED"
  | "INTERNAL_ERROR"
  /** Solo lato client: la richiesta non ha raggiunto il server. */
  | "NETWORK_ERROR";

export type FieldErrors = Record<string, string[]>;

export type PublicError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
};

/** Risultato di una Server Action: il client non riceve mai eccezioni grezze. */
export type ActionResult<TData = undefined> =
  | { ok: true; data: TData }
  | { ok: false; error: PublicError };
