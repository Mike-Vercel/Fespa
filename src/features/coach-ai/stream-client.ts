import type { AttachmentView, CoachAIStreamEvent } from "@/types/coach-ai";
import type { ActionResult, PublicError } from "@/types/results";

/*
 * Client HTTP di Coach AI (browser). Non lancia mai: restituisce sempre un risultato,
 * anche per errori di rete, così l'interfaccia può mostrare cosa è successo.
 */

const NETWORK_ERROR: PublicError = { code: "NETWORK_ERROR", message: "Connessione non riuscita. Controlla la rete e riprova." };
const INVALID_RESPONSE: PublicError = { code: "INTERNAL_ERROR", message: "Risposta del server non valida. Riprova tra poco." };

const EVENT_TYPES = new Set<CoachAIStreamEvent["type"]>(["start", "text", "activity", "action", "clarification", "done", "error"]);

function isStreamEvent(value: unknown): value is CoachAIStreamEvent {
  return typeof value === "object" && value !== null && "type" in value && EVENT_TYPES.has((value as { type: CoachAIStreamEvent["type"] }).type);
}

async function readErrorEnvelope(response: Response): Promise<PublicError> {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "error" in payload) {
    // Contratto delle nostre Route Handler: { ok: false, error: PublicError }.
    return (payload as { error: PublicError }).error;
  }
  return INVALID_RESPONSE;
}

export type ChatStreamOutcome = { ok: true } | { ok: false; error: PublicError; aborted: boolean };

/**
 * Invia un messaggio e legge la risposta in streaming (NDJSON: un evento JSON per riga).
 * `signal` interrompe la generazione: il server salva la risposta come "interrotta".
 */
export async function streamChat(
  body: { conversationId: string | null; clientMessageId: string; text: string; attachmentIds: string[] },
  options: { signal: AbortSignal; onEvent: (event: CoachAIStreamEvent) => void },
): Promise<ChatStreamOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/coach-ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR, aborted: options.signal.aborted };
  }

  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("ndjson")) {
    return { ok: false, error: await readErrorEnvelope(response), aborted: false };
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line !== "") {
          const event: unknown = JSON.parse(line);
          if (isStreamEvent(event)) options.onEvent(event);
        }
        newline = buffer.indexOf("\n");
      }
    }
  } catch {
    if (options.signal.aborted) return { ok: false, error: NETWORK_ERROR, aborted: true };
    return { ok: false, error: NETWORK_ERROR, aborted: false };
  }
  return { ok: true };
}

/** Caricamento di un allegato con avanzamento (fetch non espone il progresso dell'upload). */
export function uploadAttachment(
  file: File,
  options: { onProgress: (fraction: number) => void; signal?: AbortSignal },
): Promise<ActionResult<AttachmentView>> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/coach-ai/attachments");
    request.withCredentials = true;
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      const payload: unknown = request.response;
      if (payload && typeof payload === "object" && "ok" in payload) {
        resolve(payload as ActionResult<AttachmentView>);
      } else {
        resolve({ ok: false, error: INVALID_RESPONSE });
      }
    };
    request.onerror = () => resolve({ ok: false, error: NETWORK_ERROR });
    request.onabort = () => resolve({ ok: false, error: { code: "NETWORK_ERROR", message: "Caricamento annullato." } });
    options.signal?.addEventListener("abort", () => request.abort(), { once: true });

    const form = new FormData();
    form.append("file", file);
    request.send(form);
  });
}
