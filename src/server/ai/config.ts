import "server-only";
import { getServerEnv, type ServerEnv } from "@/server/env";
import type { AIStatus } from "@/types/domain";

/**
 * Quale provider AI usare, deciso SOLO dalle variabili d'ambiente:
 *  - DEMO_AI_MODE=true           → provider mock (risultati dimostrativi, dichiarati come tali);
 *  - AI_PROVIDER + AI_API_KEY    → provider reale;
 *  - altrimenti                  → AI non configurata (l'app funziona, le funzioni AI lo dicono).
 */
export type AIProviderConfig =
  | { kind: "anthropic"; apiKey: string; model: string; workspaceId?: string }
  | { kind: "mock" }
  | { kind: "none" };

export function resolveAIConfig(env: ServerEnv = getServerEnv()): AIProviderConfig {
  if (env.DEMO_AI_MODE) {
    return { kind: "mock" };
  }
  if (env.AI_PROVIDER === "anthropic" && env.AI_API_KEY) {
    return { kind: "anthropic", apiKey: env.AI_API_KEY, model: env.AI_MODEL, workspaceId: env.AI_WORKSPACE_ID };
  }
  return { kind: "none" };
}

const PROVIDER_LABELS = { anthropic: "Anthropic" } as const;

/** Stato mostrato nell'interfaccia: mai la chiave, solo provider e modello. */
export function getAIStatus(): AIStatus {
  const config = resolveAIConfig();
  switch (config.kind) {
    case "anthropic":
      return { mode: "live", providerLabel: PROVIDER_LABELS.anthropic, model: config.model };
    case "mock":
      return { mode: "mock" };
    case "none":
      return { mode: "not_configured" };
  }
}
