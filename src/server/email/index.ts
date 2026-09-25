import "server-only";
import { getServerEnv } from "@/server/env";

/*
 * Email transazionali dell'app. Il resto del codice conosce solo EmailSender:
 * cambiare provider significa scrivere un altro adattatore qui.
 * Oggi: Resend (API HTTP, nessuna libreria), configurato con RESEND_API_KEY ed EMAIL_FROM.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stessa chiave = stessa email: un retry dopo un timeout non la invia due volte. */
  idempotencyKey: string;
};

export interface EmailSender {
  readonly provider: string;
  /** Risolve solo quando il provider conferma di aver preso in carico l'invio. */
  send(message: EmailMessage): Promise<{ id: string }>;
}

/** Invio non riuscito: il dettaglio tecnico resta nei log, all'utente arriva un messaggio generico. */
export class EmailDeliveryError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null, cause?: unknown) {
    super(message, { cause });
    this.name = "EmailDeliveryError";
    this.status = status;
  }
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 12_000;

export function createResendSender(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): EmailSender {
  return {
    provider: "resend",
    async send(message) {
      let response: Response;
      try {
        response = await fetchImpl(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": message.idempotencyKey,
          },
          body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });
      } catch (error) {
        throw new EmailDeliveryError("provider non raggiungibile", null, error);
      }
      if (!response.ok) {
        throw new EmailDeliveryError(`provider ha risposto ${response.status}`, response.status);
      }
      const body: unknown = await response.json().catch(() => null);
      const id = body && typeof body === "object" && "id" in body && typeof body.id === "string" ? body.id : null;
      if (!id) {
        throw new EmailDeliveryError("risposta del provider senza id", response.status);
      }
      return { id };
    },
  };
}

/** Provider configurato, oppure null: chi invia deve dichiarare l'invio come non riuscito. */
export function getEmailSender(): EmailSender | null {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return null;
  }
  return createResendSender(env.RESEND_API_KEY, env.EMAIL_FROM);
}
