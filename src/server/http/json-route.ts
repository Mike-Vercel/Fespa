import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireCoachOrThrow, type AuthenticatedContext } from "@/server/auth/session";
import { AppError, ForbiddenError, httpStatusOf, RateLimitError, toPublicError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { fieldErrorsOf } from "@/validation/field-errors";

/** Le richieste AI sono piccole (ID e una domanda): un body più grande è un abuso o un errore. */
const MAX_BODY_BYTES = 16 * 1024;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * Le chiamate dal browser arrivano con Origin uguale all'host dell'app.
 * Un POST cross-site (CSRF) viene rifiutato prima di fare qualsiasi lavoro.
 */
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new ForbiddenError("Richiesta non consentita.");
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ValidationError({}, "Formato della richiesta non supportato.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw new ValidationError({}, "Richiesta troppo grande.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ValidationError({}, "Richiesta troppo grande.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError({}, "Richiesta non valida.");
  }
}

function errorResponse(operation: string, error: unknown): Response {
  const status = httpStatusOf(error);
  if (error instanceof AppError && status < 500) {
    logger.warn("api.rejected", { operation, code: error.code, status });
  } else {
    logger.error("api.failed", { operation, status, error });
  }

  const headers: Record<string, string> = { ...NO_STORE_HEADERS };
  if (error instanceof RateLimitError) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }
  return NextResponse.json({ ok: false, error: toPublicError(error) }, { status, headers });
}

/**
 * Route Handler POST JSON con i controlli comuni, nell'ordine:
 * origine → sessione → body (dimensione, JSON, schema Zod) → handler.
 * La risposta ha la stessa forma delle Server Action: { ok, data } | { ok, error }.
 */
export function jsonRoute<TSchema extends z.ZodType, TResult>(options: {
  operation: string;
  schema: TSchema;
  handler: (body: z.output<TSchema>, auth: AuthenticatedContext) => Promise<TResult>;
}) {
  return async function handle(request: Request): Promise<Response> {
    try {
      assertSameOrigin(request);
      const auth = await requireCoachOrThrow();
      const parsed = options.schema.safeParse(await readJsonBody(request));
      if (!parsed.success) {
        throw new ValidationError(fieldErrorsOf(parsed.error));
      }
      const data = await options.handler(parsed.data, auth);
      return NextResponse.json({ ok: true, data }, { headers: NO_STORE_HEADERS });
    } catch (error) {
      return errorResponse(options.operation, error);
    }
  };
}
