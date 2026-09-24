import "server-only";
import type { DbEnum } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";

/*
 * Audit delle richieste AI: solo metadati (tipo, esito, modello, token, latenza).
 * Nessun prompt, nessuna risposta, nessun dato delle clienti.
 */

export type AIRequestType = DbEnum<"ai_request_type">;

export async function startInteraction(
  db: AppSupabaseClient,
  input: {
    coachId: string;
    clientId: string | null;
    requestType: AIRequestType;
    provider: string;
    model: string;
    isMock: boolean;
  },
): Promise<string> {
  const { data, error } = await db
    .from("ai_interactions")
    .insert({
      coach_id: input.coachId,
      client_id: input.clientId,
      request_type: input.requestType,
      status: "started",
      provider: input.provider,
      model: input.model,
      is_mock: input.isMock,
    })
    .select("id")
    .single();
  if (error) {
    throw new DataAccessError("aiInteractions.start", error);
  }
  return data.id;
}

export async function finishInteraction(
  db: AppSupabaseClient,
  interactionId: string,
  outcome: {
    status: Exclude<DbEnum<"ai_interaction_status">, "started">;
    latencyMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    errorCode?: string;
  },
): Promise<void> {
  const { error } = await db
    .from("ai_interactions")
    .update({
      status: outcome.status,
      latency_ms: outcome.latencyMs ?? null,
      input_tokens: outcome.inputTokens ?? null,
      output_tokens: outcome.outputTokens ?? null,
      error_code: outcome.errorCode ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", interactionId);
  if (error) {
    throw new DataAccessError("aiInteractions.finish", error);
  }
}

/** Richieste AI della coach dall'istante indicato (incluse quelle rifiutate dal rate limit). */
export async function countInteractionsSince(db: AppSupabaseClient, coachId: string, since: string): Promise<number> {
  const { count, error } = await db
    .from("ai_interactions")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .gte("created_at", since)
    .neq("status", "rate_limited");
  if (error) {
    throw new DataAccessError("aiInteractions.countSince", error);
  }
  return count ?? 0;
}
