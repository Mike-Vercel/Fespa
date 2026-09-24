import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AppError, toPublicError } from "@/server/errors";
import { logger } from "@/server/logger";
import type { ActionResult } from "@/types/results";

/**
 * Unico punto in cui le Server Action trasformano un'eccezione in un risultato per il client.
 * - Errori attesi (AppError): il client riceve codice e messaggio sicuro.
 * - Errori imprevisti: messaggio generico, dettaglio solo nei log.
 * - redirect()/notFound() di Next vengono lasciati passare.
 */
export async function runAction<TData>(operation: string, handler: () => Promise<TData>): Promise<ActionResult<TData>> {
  try {
    return { ok: true, data: await handler() };
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof AppError && error.httpStatus < 500) {
      logger.warn("action.rejected", { operation, code: error.code });
    } else {
      logger.error("action.failed", { operation, error });
    }
    return { ok: false, error: toPublicError(error) };
  }
}
