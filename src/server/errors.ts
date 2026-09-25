import "server-only";
import type { ErrorCode, FieldErrors, PublicError } from "@/types/results";

/**
 * Errori applicativi attesi. Ognuno porta:
 *  - un codice stabile per il client,
 *  - lo status HTTP,
 *  - un messaggio in italiano sicuro da mostrare all'utente.
 * Il dettaglio tecnico resta in `cause` e finisce solo nei log.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;

  constructor(options: { code: ErrorCode; httpStatus: number; userMessage: string; cause?: unknown }) {
    super(options.userMessage, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.userMessage = options.userMessage;
  }

  toPublic(): PublicError {
    return { code: this.code, message: this.userMessage };
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors = {}, userMessage = "Alcuni dati non sono validi. Controlla i campi evidenziati.") {
    super({ code: "VALIDATION_FAILED", httpStatus: 400, userMessage });
    this.fieldErrors = fieldErrors;
  }

  override toPublic(): PublicError {
    return { ...super.toPublic(), fieldErrors: this.fieldErrors };
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super({ code: "UNAUTHENTICATED", httpStatus: 401, userMessage: "La sessione è scaduta. Accedi di nuovo." });
  }
}

export class ForbiddenError extends AppError {
  constructor(userMessage = "Non hai i permessi per eseguire questa operazione.") {
    super({ code: "FORBIDDEN", httpStatus: 403, userMessage });
  }
}

export class NotFoundError extends AppError {
  constructor(userMessage = "Elemento non trovato o non accessibile.") {
    super({ code: "NOT_FOUND", httpStatus: 404, userMessage });
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super({
      code: "RATE_LIMITED",
      httpStatus: 429,
      userMessage: "Hai raggiunto il limite di richieste AI. Riprova tra qualche minuto.",
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }

  override toPublic(): PublicError {
    return { ...super.toPublic(), retryAfterSeconds: this.retryAfterSeconds };
  }
}

export type AIFailureReason =
  | "not_configured"
  | "unavailable"
  | "provider_rejected"
  | "timeout"
  | "invalid_output"
  | "refused"
  | "demo_unsupported";

const AI_FAILURES: Record<AIFailureReason, { code: ErrorCode; httpStatus: number; userMessage: string }> = {
  not_configured: {
    code: "AI_NOT_CONFIGURED",
    httpStatus: 503,
    userMessage: "AI provider non configurato.",
  },
  unavailable: {
    code: "AI_UNAVAILABLE",
    httpStatus: 503,
    userMessage: "Il servizio AI è temporaneamente non disponibile. Riprova tra poco.",
  },
  // Rifiuto definitivo del provider (es. credito esaurito, modello inesistente): riprovare non serve.
  provider_rejected: {
    code: "AI_PROVIDER_REJECTED",
    httpStatus: 502,
    userMessage:
      "Il provider AI ha rifiutato la richiesta per un problema di configurazione o di credito dell'account. Contatta l'amministratore.",
  },
  timeout: {
    code: "AI_TIMEOUT",
    httpStatus: 504,
    userMessage: "L'AI ha impiegato troppo tempo a rispondere. Riprova.",
  },
  invalid_output: {
    code: "AI_INVALID_OUTPUT",
    httpStatus: 502,
    userMessage: "L'AI ha prodotto un risultato non valido, quindi non è stato salvato nulla. Riprova.",
  },
  refused: {
    code: "AI_REFUSED",
    httpStatus: 422,
    userMessage: "L'AI non ha potuto elaborare questa richiesta.",
  },
  // Coach AI è un agente reale: il provider dimostrativo non lo simula.
  demo_unsupported: {
    code: "AI_DEMO_UNSUPPORTED",
    httpStatus: 503,
    userMessage:
      "Coach AI richiede un provider AI reale: in modalità dimostrativa l'agente non è attivo. Configura AI_PROVIDER, AI_API_KEY e DEMO_AI_MODE=false.",
  },
};

export class AIProviderError extends AppError {
  readonly reason: AIFailureReason;

  constructor(reason: AIFailureReason, cause?: unknown) {
    super({ ...AI_FAILURES[reason], cause });
    this.reason = reason;
  }
}

/** Errore del database non previsto: all'utente arriva solo un messaggio generico. */
export class DataAccessError extends AppError {
  /** Nome dell'operazione fallita (es. "clients.list"), utile nei log. */
  readonly operation: string;

  constructor(operation: string, cause?: unknown) {
    super({
      code: "INTERNAL_ERROR",
      httpStatus: 500,
      userMessage: "Si è verificato un errore imprevisto. Riprova tra poco.",
      cause,
    });
    this.operation = operation;
  }
}

const UNEXPECTED_ERROR: PublicError = {
  code: "INTERNAL_ERROR",
  message: "Si è verificato un errore imprevisto. Riprova tra poco.",
};

export function toPublicError(error: unknown): PublicError {
  return error instanceof AppError ? error.toPublic() : UNEXPECTED_ERROR;
}

export function httpStatusOf(error: unknown): number {
  return error instanceof AppError ? error.httpStatus : 500;
}
