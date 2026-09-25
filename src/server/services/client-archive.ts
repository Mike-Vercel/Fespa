import "server-only";
import { isAdminRole } from "@/domain/roles";
import type { AuthenticatedContext } from "@/server/auth/session";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";
import { archiveClient as archiveClientRecord, restoreClient as restoreClientRecord } from "@/server/repositories/client-accounts";
import { findArchivedClient, type ArchivedClient } from "@/server/repositories/clients";
import { parseUuid } from "@/validation/common";
import { assertClientAccess } from "./access";

/*
 * Archiviazione delle clienti: l'unica forma di "eliminazione" del gestionale (soft-delete).
 * La cliente sparisce dalle liste di tutto lo staff; i dati restano e si può ripristinare.
 * Riservata all'amministrazione: controllo qui, nella funzione RPC e nella RLS.
 */

const ADMIN_ONLY_MESSAGE = "Solo l'amministrazione può archiviare o ripristinare una cliente.";
const ARCHIVED_NOT_FOUND_MESSAGE = "Non trovo una cliente archiviata con questo identificativo.";

function assertAdmin(context: AuthenticatedContext): void {
  if (!isAdminRole(context.coach.role)) {
    throw new ForbiddenError(ADMIN_ONLY_MESSAGE);
  }
}

export async function archiveClient(context: AuthenticatedContext, clientId: string): Promise<void> {
  assertAdmin(context);
  const validClientId = await assertClientAccess(context, clientId);
  await archiveClientRecord(context.db, validClientId);
  logger.info("clients.archived", { clientId: validClientId, archivedBy: context.coach.id });
}

export async function getArchivedClient(context: AuthenticatedContext, clientId: string): Promise<ArchivedClient> {
  assertAdmin(context);
  const validClientId = parseUuid(clientId);
  const client = validClientId ? await findArchivedClient(context.db, validClientId) : null;
  if (!client) {
    throw new NotFoundError(ARCHIVED_NOT_FOUND_MESSAGE);
  }
  return client;
}

export async function restoreClient(context: AuthenticatedContext, clientId: string): Promise<void> {
  const client = await getArchivedClient(context, clientId);
  await restoreClientRecord(context.db, client.id);
  logger.info("clients.restored", { clientId: client.id, restoredBy: context.coach.id });
}
