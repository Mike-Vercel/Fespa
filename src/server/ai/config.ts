import "server-only";
import { getServerEnv, type ServerEnv } from "@/server/env";
import type { AIStatus } from "@/types/domain";

/**
 * Quale provider AI usare, deciso SOLO dalle variabili d'ambiente:
 *  - DEMO_AI_MODE=true → provider mock (risultati dimostrativi, dichiarati come tali);
 *  - un modello + la chiave del suo provider → provider reale;
 *  - altrimenti → AI non configurata (l'app funziona, le funzioni AI lo dicono).
 *
 * È il MODELLO a decidere il provider: "gpt-…" → OpenAI, "claude-…" → Anthropic.
 *  - Modello: AI_MODEL; se manca, quello del provider indicato in AI_PROVIDER, poi ANTHROPIC_MODEL,
 *    poi OPENAI_MODEL. AI_PROVIDER serve solo se il nome del modello non è riconoscibile.
 *  - Chiave: quella del provider (ANTHROPIC_API_KEY / OPENAI_API_KEY), altrimenti AI_API_KEY.
 * Esempio: AI_MODEL=gpt-5.5 usa OpenAI; togliendolo si torna a ANTHROPIC_MODEL=claude-opus-5.
 */
export type AIProviderConfig =
  | { kind: "anthropic"; apiKey: string; model: string; workspaceId?: string }
  | { kind: "openai"; apiKey: string; model: string }
  | { kind: "mock" }
  | { kind: "none" };

type ProviderKind = "anthropic" | "openai";

export const DEFAULT_MODELS: Record<ProviderKind, string> = { anthropic: "claude-opus-5", openai: "gpt-5.5" };

/** Provider dal nome del modello; null se il nome non è riconoscibile. */
export function providerOfModel(model: string): ProviderKind | null {
  if (/^claude-/i.test(model)) return "anthropic";
  if (/^(gpt-|chatgpt-|o\d)/i.test(model)) return "openai";
  return null;
}

function modelFor(env: ServerEnv, provider: ProviderKind | undefined): string | undefined {
  if (provider === "anthropic") return env.ANTHROPIC_MODEL ?? DEFAULT_MODELS.anthropic;
  if (provider === "openai") return env.OPENAI_MODEL ?? DEFAULT_MODELS.openai;
  return undefined;
}

export function resolveAIConfig(env: ServerEnv = getServerEnv()): AIProviderConfig {
  if (env.DEMO_AI_MODE) {
    return { kind: "mock" };
  }
  const model = env.AI_MODEL ?? modelFor(env, env.AI_PROVIDER) ?? env.ANTHROPIC_MODEL ?? env.OPENAI_MODEL;
  if (!model) {
    return { kind: "none" };
  }
  const provider = providerOfModel(model) ?? env.AI_PROVIDER;
  if (provider === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY ?? env.AI_API_KEY;
    return apiKey ? { kind: "anthropic", apiKey, model, workspaceId: env.AI_WORKSPACE_ID } : { kind: "none" };
  }
  if (provider === "openai") {
    const apiKey = env.OPENAI_API_KEY ?? env.AI_API_KEY;
    return apiKey ? { kind: "openai", apiKey, model } : { kind: "none" };
  }
  return { kind: "none" };
}

const PROVIDER_LABELS = { anthropic: "Anthropic", openai: "OpenAI" } as const;

/** Stato mostrato nell'interfaccia: mai la chiave, solo provider e modello. */
export function getAIStatus(): AIStatus {
  const config = resolveAIConfig();
  switch (config.kind) {
    case "anthropic":
    case "openai":
      return { mode: "live", providerLabel: PROVIDER_LABELS[config.kind], model: config.model };
    case "mock":
      return { mode: "mock" };
    case "none":
      return { mode: "not_configured" };
  }
}
