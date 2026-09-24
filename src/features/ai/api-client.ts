import type { ActionResult, PublicError } from "@/types/results";

const NETWORK_ERROR: PublicError = {
  code: "NETWORK_ERROR",
  message: "Connessione non riuscita. Controlla la rete e riprova.",
};

const INVALID_RESPONSE: PublicError = {
  code: "INTERNAL_ERROR",
  message: "Risposta del server non valida. Riprova tra poco.",
};

function isResultEnvelope(value: unknown): value is { ok: boolean } {
  return typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean";
}

/**
 * Chiamata alle Route Handler AI dell'app. Non lancia mai: restituisce lo stesso
 * risultato { ok, data } | { ok, error } delle Server Action, anche per errori di rete.
 */
export async function postJson<TData>(url: string, body: unknown): Promise<ActionResult<TData>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!isResultEnvelope(payload)) {
    return { ok: false, error: INVALID_RESPONSE };
  }
  // Il contratto delle risposte è definito dalle nostre Route Handler (jsonRoute).
  return payload as ActionResult<TData>;
}
