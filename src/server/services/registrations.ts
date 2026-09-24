import "server-only";
import { isAdminRole } from "@/domain/roles";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { ForbiddenError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  listRegistrations,
  listStaffMembers,
  reviewRegistration,
  type RegistrationRecord,
  type StaffMember,
} from "@/server/repositories/client-accounts";
import type { RegistrationReview } from "@/validation/registrations";

export type RegistrationsOverview = {
  pending: RegistrationRecord[];
  rejected: RegistrationRecord[];
  staff: StaffMember[];
  timezone: string;
};

/** Controllo esplicito oltre alla RLS e alle RPC, che restano l'ultima difesa. */
function assertAdmin(context: AuthenticatedContext): void {
  if (!isAdminRole(context.coach.role)) {
    throw new ForbiddenError();
  }
}

export async function getRegistrationsOverview(context: AuthenticatedContext): Promise<RegistrationsOverview> {
  assertAdmin(context);
  const [pending, rejected, staff] = await Promise.all([
    listRegistrations(context.db, "pending"),
    listRegistrations(context.db, "rejected"),
    listStaffMembers(context.db),
  ]);
  return { pending, rejected, staff, timezone: getServerEnv().APP_TIMEZONE };
}

export async function decideRegistration(context: AuthenticatedContext, review: RegistrationReview): Promise<void> {
  assertAdmin(context);
  const coachId = review.decision === "approved" ? review.coachId || null : null;
  await reviewRegistration(context.db, { clientId: review.clientId, decision: review.decision, coachId });
  logger.info("registrations.reviewed", { clientId: review.clientId, decision: review.decision, reviewedBy: context.coach.id });
}
