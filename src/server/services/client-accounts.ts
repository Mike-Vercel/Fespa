import "server-only";
import { getClientSignupUrl, sendClientAccessLink, type InviteDelivery } from "@/server/auth/client-invites";
import type { AuthenticatedContext } from "@/server/auth/session";
import { NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { createClientByStaff } from "@/server/repositories/client-accounts";
import { findClientOverview } from "@/server/repositories/clients";
import type { NewClientInput } from "@/validation/clients";
import { assertClientAccess, CLIENT_NOT_ACCESSIBLE_MESSAGE } from "./access";

export type InviteOutcome =
  | { delivery: "not_requested" }
  | { delivery: InviteDelivery; email: string; signupUrl: string };

async function inviteClient(email: string, fullName: string): Promise<InviteOutcome> {
  const delivery = await sendClientAccessLink(email, fullName);
  return { delivery, email, signupUrl: await getClientSignupUrl(email) };
}

/**
 * La coach crea una cliente (approvata e assegnata a sé). Con l'email, la cliente riceve
 * subito il link per entrare e completare il profilo. Se l'invio fallisce la scheda resta:
 * la coach può condividere il link a mano o riprovare dalla scheda.
 */
export async function createClientWithInvite(
  context: AuthenticatedContext,
  input: NewClientInput,
): Promise<{ clientId: string; invite: InviteOutcome }> {
  const clientId = await createClientByStaff(context.db, input);
  logger.info("clients.created", { clientId, createdBy: context.coach.id, withInvite: input.email !== null });

  if (!input.email) {
    return { clientId, invite: { delivery: "not_requested" } };
  }
  return { clientId, invite: await inviteClient(input.email, input.fullName) };
}

export async function resendClientInvite(context: AuthenticatedContext, clientId: unknown): Promise<InviteOutcome> {
  const validClientId = await assertClientAccess(context, clientId);
  const client = await findClientOverview(context.db, validClientId);
  if (!client) {
    throw new NotFoundError(CLIENT_NOT_ACCESSIBLE_MESSAGE);
  }
  if (!client.email) {
    throw new ValidationError({}, "Questa cliente non ha un'email a cui inviare l'invito.");
  }
  if (client.hasAccount) {
    throw new ValidationError({}, "La cliente ha già attivato il suo account.");
  }

  logger.info("clients.invite_resent", { clientId: validClientId, requestedBy: context.coach.id });
  return inviteClient(client.email, client.fullName);
}
