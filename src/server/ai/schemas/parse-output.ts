import "server-only";
import type { z } from "zod";
import { AIProviderError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * Unico punto in cui l'output di un modello diventa un dato dell'applicazione.
 * Qualunque provider, qualunque garanzia dichiari: l'output viene sempre validato qui.
 * Se non rispetta lo schema, la richiesta fallisce in modo gestito e nulla viene salvato.
 */
export function parseAIOutput<TSchema extends z.ZodType>(
  schema: TSchema,
  rawOutput: unknown,
  purpose: string,
): z.output<TSchema> {
  const parsed = schema.safeParse(rawOutput);
  if (!parsed.success) {
    // Nei log solo i percorsi dei campi e i tipi di errore, mai il contenuto generato.
    logger.warn("ai.output_rejected", {
      purpose,
      issues: parsed.error.issues.slice(0, 5).map((issue) => ({ path: issue.path.join("."), code: issue.code })),
    });
    throw new AIProviderError("invalid_output", parsed.error);
  }
  return parsed.data;
}
