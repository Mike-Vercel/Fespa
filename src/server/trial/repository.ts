import "server-only";
import { z } from "zod";
import type { Json } from "@/server/db/database.types";
import type { TrialServiceClient } from "@/server/db/supabase-service";
import { DataAccessError } from "@/server/errors";

/*
 * Accesso ai dati della Prova FESPA: SOLO le funzioni trial_* della migration public_trial,
 * che applicano le regole (3 messaggi, dati prima del terzo, una generazione alla volta)
 * in modo atomico. Lo stato restituito dal database viene comunque validato.
 */

export const trialStateSchema = z.object({
  messageCount: z.number().int().min(0).max(3),
  leadName: z.string().nullable(),
  leadEmail: z.string().nullable(),
  summary: z.unknown().nullable(),
  completedAt: z.string().nullable(),
  emailStatus: z.enum(["not_requested", "sending", "sent", "failed"]),
  emailAttempts: z.number().int().min(0),
  generationLocked: z.boolean(),
  messages: z.array(
    z.object({
      seq: z.number().int(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
  /** Solo da addUserMessage: false se era un invio già registrato. */
  inserted: z.boolean().optional(),
});

export type TrialState = z.infer<typeof trialStateSchema>;

/** Regola della prova violata (errori FC010–FC014 delle funzioni SQL). */
export type TrialRule = "not_found" | "limit_reached" | "busy" | "lead_required" | "invalid_state";

export class TrialRuleError extends Error {
  readonly rule: TrialRule;

  constructor(rule: TrialRule) {
    super(`regola della prova: ${rule}`);
    this.name = "TrialRuleError";
    this.rule = rule;
  }
}

const RULE_CODES: Record<string, TrialRule> = {
  FC010: "not_found",
  FC011: "limit_reached",
  FC012: "busy",
  FC013: "lead_required",
  FC014: "invalid_state",
};

export interface TrialRepository {
  get(tokenHash: string): Promise<TrialState | null>;
  start(tokenHash: string): Promise<TrialState>;
  addUserMessage(tokenHash: string, clientMessageId: string, content: string): Promise<TrialState>;
  claimGeneration(tokenHash: string): Promise<TrialState>;
  releaseGeneration(tokenHash: string): Promise<TrialState>;
  addAssistantMessage(tokenHash: string, content: string): Promise<TrialState>;
  saveLead(tokenHash: string, lead: { name: string; email: string; privacyConsent: boolean }): Promise<TrialState>;
  complete(tokenHash: string, summary: Json): Promise<TrialState>;
  beginEmail(tokenHash: string): Promise<TrialState>;
  finishEmail(tokenHash: string, sent: boolean): Promise<TrialState>;
  /** Registra una richiesta nel bucket: true se è entro il limite della finestra. */
  hitRateLimit(bucket: string, windowSeconds: number, maxEvents: number): Promise<boolean>;
}

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

function stateFrom(operation: string, result: RpcResult): TrialState {
  if (result.error) {
    const rule = result.error.code ? RULE_CODES[result.error.code] : undefined;
    if (rule) throw new TrialRuleError(rule);
    throw new DataAccessError(operation, result.error);
  }
  const parsed = trialStateSchema.safeParse(result.data);
  if (!parsed.success) {
    throw new DataAccessError(operation, parsed.error);
  }
  return parsed.data;
}

export function createTrialRepository(db: TrialServiceClient): TrialRepository {
  return {
    async get(tokenHash) {
      const result = await db.rpc("trial_get", { p_token_hash: tokenHash });
      if (!result.error && result.data === null) return null;
      return stateFrom("trial.get", result);
    },
    async start(tokenHash) {
      return stateFrom("trial.start", await db.rpc("trial_start", { p_token_hash: tokenHash }));
    },
    async addUserMessage(tokenHash, clientMessageId, content) {
      return stateFrom(
        "trial.add_user_message",
        await db.rpc("trial_add_user_message", { p_token_hash: tokenHash, p_client_message_id: clientMessageId, p_content: content }),
      );
    },
    async claimGeneration(tokenHash) {
      return stateFrom("trial.claim_generation", await db.rpc("trial_claim_generation", { p_token_hash: tokenHash }));
    },
    async releaseGeneration(tokenHash) {
      return stateFrom("trial.release_generation", await db.rpc("trial_release_generation", { p_token_hash: tokenHash }));
    },
    async addAssistantMessage(tokenHash, content) {
      return stateFrom(
        "trial.add_assistant_message",
        await db.rpc("trial_add_assistant_message", { p_token_hash: tokenHash, p_content: content }),
      );
    },
    async saveLead(tokenHash, lead) {
      return stateFrom(
        "trial.save_lead",
        await db.rpc("trial_save_lead", {
          p_token_hash: tokenHash,
          p_name: lead.name,
          p_email: lead.email,
          p_privacy_consent: lead.privacyConsent,
        }),
      );
    },
    async complete(tokenHash, summary) {
      return stateFrom("trial.complete", await db.rpc("trial_complete", { p_token_hash: tokenHash, p_summary: summary }));
    },
    async beginEmail(tokenHash) {
      return stateFrom("trial.begin_email", await db.rpc("trial_begin_email", { p_token_hash: tokenHash }));
    },
    async finishEmail(tokenHash, sent) {
      return stateFrom("trial.finish_email", await db.rpc("trial_finish_email", { p_token_hash: tokenHash, p_sent: sent }));
    },
    async hitRateLimit(bucket, windowSeconds, maxEvents) {
      const result = await db.rpc("trial_rate_limit", { p_bucket: bucket, p_window_seconds: windowSeconds, p_max_events: maxEvents });
      if (result.error) throw new DataAccessError("trial.rate_limit", result.error);
      return result.data === true;
    },
  };
}
