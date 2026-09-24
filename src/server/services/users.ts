import "server-only";
import { canManageRoles, isAdminRole } from "@/domain/roles";
import type { AuthenticatedContext } from "@/server/auth/session";
import { ForbiddenError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  listClientCoachIds,
  listRegisteredUsers,
  listStaffMembers,
  setClientCoaches,
  setUserRole,
  type RegisteredUser,
  type StaffMember,
} from "@/server/repositories/client-accounts";
import type { UserRole } from "@/types/domain";
import type { ClientCoaches, RoleChange } from "@/validation/users";
import { assertClientAccess } from "./access";

/** Ordine delle sezioni nella pagina: dallo staff con più poteri alle clienti. */
const ROLE_ORDER: readonly UserRole[] = ["super_admin", "admin", "coach", "client"];

export type UsersOverview = {
  groups: Array<{ role: UserRole; users: RegisteredUser[] }>;
  canManageRoles: boolean;
  currentUserId: string;
};

function assertAdmin(context: AuthenticatedContext): void {
  if (!isAdminRole(context.coach.role)) {
    throw new ForbiddenError();
  }
}

export async function getUsersOverview(context: AuthenticatedContext): Promise<UsersOverview> {
  assertAdmin(context);
  const users = await listRegisteredUsers(context.db);
  return {
    groups: ROLE_ORDER.map((role) => ({ role, users: users.filter((user) => user.role === role) })),
    canManageRoles: canManageRoles(context.coach.role),
    currentUserId: context.coach.id,
  };
}

/** Cambio di ruolo: solo il super admin, mai sul proprio account (controllato anche nel database). */
export async function changeUserRole(context: AuthenticatedContext, change: RoleChange): Promise<void> {
  if (!canManageRoles(context.coach.role)) {
    throw new ForbiddenError("Solo il super admin può cambiare i ruoli.");
  }
  if (change.userId === context.coach.id) {
    throw new ValidationError({}, "Non puoi modificare il tuo ruolo: chiedilo a un altro super admin.");
  }
  await setUserRole(context.db, change);
  logger.info("users.role_changed", { userId: change.userId, role: change.role, changedBy: context.coach.id });
}

export type CoachAssignment = { staff: StaffMember[]; coachIds: string[] };

/** Coach assegnabili e assegnate per la scheda cliente (solo amministrazione). */
export async function getCoachAssignment(context: AuthenticatedContext, clientId: string): Promise<CoachAssignment> {
  assertAdmin(context);
  const [staff, coachIds] = await Promise.all([listStaffMembers(context.db), listClientCoachIds(context.db, clientId)]);
  return { staff, coachIds };
}

export async function assignClientCoaches(context: AuthenticatedContext, input: ClientCoaches): Promise<void> {
  assertAdmin(context);
  const clientId = await assertClientAccess(context, input.clientId);
  await setClientCoaches(context.db, { clientId, coachIds: input.coachIds });
  logger.info("clients.coaches_assigned", { clientId, coachCount: input.coachIds.length, assignedBy: context.coach.id });
}
