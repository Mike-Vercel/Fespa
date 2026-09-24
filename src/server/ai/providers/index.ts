import "server-only";
import { resolveAIConfig } from "@/server/ai/config";
import { AIProviderError } from "@/server/errors";
import { createAnthropicProvider } from "./anthropic";
import { createMockProvider } from "./mock";
import type { AIProvider } from "./types";

// La configurazione arriva dall'env, letto una volta per processo: il provider si crea una volta sola.
let cachedProvider: AIProvider | undefined;

/**
 * Restituisce il provider configurato nelle variabili d'ambiente.
 * Senza configurazione lancia AIProviderError("not_configured"): l'app resta utilizzabile
 * e la UI mostra "AI provider non configurato."
 */
export function getAIProvider(): AIProvider {
  const config = resolveAIConfig();
  if (config.kind === "none") {
    throw new AIProviderError("not_configured");
  }
  cachedProvider ??= config.kind === "anthropic" ? createAnthropicProvider(config) : createMockProvider();
  return cachedProvider;
}
