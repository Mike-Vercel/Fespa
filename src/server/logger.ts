import "server-only";

/**
 * Logger strutturato minimo: una riga JSON per evento su stdout/stderr
 * (Vercel e la maggior parte delle piattaforme la indicizzano così com'è).
 *
 * Regole:
 *  - si loggano eventi e metadati, MAI contenuti (check-in, note, prompt, risposte AI);
 *  - i campi con nomi sensibili vengono oscurati automaticamente.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const SENSITIVE_FIELD = /(key|token|secret|password|authorization|cookie|jwt)/i;
const REDACTED = "[REDACTED]";

function sanitize(fields: LogFields): LogFields {
  const sanitized: LogFields = {};
  for (const [name, value] of Object.entries(fields)) {
    if (SENSITIVE_FIELD.test(name)) {
      sanitized[name] = REDACTED;
    } else if (value instanceof Error) {
      sanitized[name] = serializeError(value);
    } else {
      sanitized[name] = value;
    }
  }
  return sanitized;
}

/**
 * Tiene nome, messaggio e codice dell'errore (e della causa), senza campi come
 * `details`/`hint` dei driver database che possono contenere valori delle righe.
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }

  const serialized: Record<string, unknown> = { name: error.name, message: error.message };
  copySafeMetadata(error, serialized);
  if (error.cause !== undefined) serialized.cause = serializeCause(error.cause);
  return serialized;
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) return serializeError(cause);
  if (cause !== null && typeof cause === "object") {
    // Es. PostgrestError come oggetto semplice: solo messaggio e codice.
    const serialized: Record<string, unknown> = { message: Reflect.get(cause, "message") };
    copySafeMetadata(cause, serialized);
    return serialized;
  }
  return String(cause);
}

function copySafeMetadata(source: object, target: Record<string, unknown>): void {
  for (const field of ["code", "status", "operation", "reason"]) {
    const value = Reflect.get(source, field);
    if (typeof value === "string" || typeof value === "number") {
      target[field] = value;
    }
  }
}

function write(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (level === "debug" && process.env.NODE_ENV === "production") {
    return;
  }

  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...sanitize(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => write("debug", event, fields),
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};
