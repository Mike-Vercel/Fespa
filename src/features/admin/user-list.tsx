import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { calendarDateIn } from "@/domain/dates";
import { capitalize, formatCalendarDate, formatRelativeInstant, pluralize } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import type { RegisteredUser } from "@/server/repositories/client-accounts";
import { UserRoleControl } from "./user-role-control";
import { UserRowActions } from "./user-row-actions";

type UserListProps = {
  users: RegisteredUser[];
  canManageRoles: boolean;
  currentUserId: string;
  now: Date;
  timezone: string;
};

/** Per una cliente: a che punto è (email, questionario, approvazione). Solo stati presenti nei dati. */
function ClientStatus({ user }: { user: RegisteredUser }) {
  if (!user.emailConfirmed) return <Badge tone="warning">Email da confermare</Badge>;
  switch (user.approvalStatus) {
    case null:
      return <Badge tone="muted">Questionario da completare</Badge>;
    case "pending":
      return <Badge tone="warning">Approvata: in attesa</Badge>;
    case "approved":
      return <Badge tone="accent">Approvata: sì</Badge>;
    case "rejected":
      return <Badge tone="rust">Approvata: no</Badge>;
  }
}

/*
 * Riga dell'account, dalla più stretta:
 *   mobile:  chi   | •••         da 1024px:  chi | stato | ruolo | •••
 *            stato
 *            ruolo
 */
const ROW_LAYOUT = [
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3",
  "[grid-template-areas:'who_menu''status_status''role_role']",
  "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_16rem_auto] lg:items-center lg:gap-x-6 lg:[grid-template-areas:'who_status_role_menu']",
].join(" ");

export function UserList({ users, canManageRoles, currentUserId, now, timezone }: UserListProps) {
  return (
    <ul className="divide-y divide-line/80">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const createdOn = formatCalendarDate(calendarDateIn(timezone, user.createdAt), { withYear: true });
        const lastAccess = user.lastSignInAt ? formatRelativeInstant(user.lastSignInAt, now, timezone) : "mai";
        return (
          <li key={user.id} className={`${ROW_LAYOUT} py-4`}>
            <div className="flex min-w-0 items-center gap-4 [grid-area:who]">
              <Avatar name={user.fullName} className="size-[50px] text-[16px]" />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold leading-snug text-ink">
                  {user.fullName}
                  {isSelf ? <span className="ml-2 text-[13px] font-normal text-ink-3">(tu)</span> : null}
                </p>
                <p className="truncate text-[14px] text-ink-2">{user.email}</p>
                <p className="text-[13px] text-pretty text-ink-3">
                  Account creato il {createdOn} · ultimo accesso {lastAccess}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink-2 [grid-area:status]">
              {user.role === "client" ? (
                <ClientStatus user={user} />
              ) : (
                <span>{capitalize(pluralize(user.assignedClientCount, "cliente assegnata", "clienti assegnate"))}</span>
              )}
            </div>

            <div className="[grid-area:role]">
              {canManageRoles && !isSelf ? (
                <UserRoleControl
                  userId={user.id}
                  fullName={user.fullName}
                  role={user.role}
                  assignedClientCount={user.assignedClientCount}
                  hasOpenRegistration={user.approvalStatus === "pending" || user.approvalStatus === "rejected"}
                />
              ) : (
                <p className="flex h-11 items-center lg:justify-start">
                  <Badge tone="neutral">{ROLE_LABELS[user.role]}</Badge>
                  <span className="sr-only">{isSelf ? " (non puoi cambiare il tuo ruolo)" : ""}</span>
                </p>
              )}
            </div>

            <div className="flex items-start justify-end [grid-area:menu] lg:items-center">
              <UserRowActions fullName={user.fullName} email={user.email} clientId={user.clientId} approvalStatus={user.approvalStatus} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
