import "server-only";
import { isAdminRole } from "@/domain/roles";
import type { AuthenticatedContext } from "@/server/auth/session";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";
import { clientExists, isClientAssignedTo } from "@/server/repositories/clients";
import { parseUuid } from "@/validation/common";

export const CLIENT_NOT_ACCESSIBLE_MESSAGE = "Questa cliente non esiste o non è assegnata al tuo account.";

/**
 * Verifica che la coach possa accedere alla cliente e restituisce l'ID validato.
 *
 * - L'ID arriva dal browser (URL, form, JSON): non è affidabile finché non passa da qui.
 * - "Non esiste" e "non assegnata" producono la stessa risposta (404): nessuna enumerazione.
 * - È un controllo esplicito in aggiunta alla RLS, che resta l'ultima linea di difesa.
 */
export async function assertClientAccess(context: AuthenticatedContext, clientId: unknown): Promise<string> {
  const validClientId = parseUuid(clientId);
  if (!validClientId) {
    throw new NotFoundError(CLIENT_NOT_ACCESSIBLE_MESSAGE);
  }

  const { coach, db } = context;
  const hasAccess =
    isAdminRole(coach.role)
      ? await clientExists(db, validClientId)
      : await isClientAssignedTo(db, coach.id, validClientId);

  if (!hasAccess) {
    logger.warn("access.client_denied", { coachId: coach.id, clientId: validClientId });
    throw new NotFoundError(CLIENT_NOT_ACCESSIBLE_MESSAGE);
  }
  return validClientId;
}
