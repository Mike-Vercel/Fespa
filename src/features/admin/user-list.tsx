import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { calendarDateIn } from "@/domain/dates";
import { capitalize, formatCalendarDate, formatRelativeInstant, pluralize } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import type { RegisteredUser } from "@/server/repositories/client-accounts";
import { UserRoleControl } from "./user-role-control";

type UserListProps = {
  users: RegisteredUser[];
  canManageRoles: boolean;
  currentUserId: string;
  now: Date;
  timezone: string;
};

/** Per una cliente: a che punto è (email, questionario, approvazione). */
function ClientStatus({ user }: { user: RegisteredUser }) {
  if (!user.emailConfirmed) return <Badge tone="muted">Email da confermare</Badge>;
  switch (user.approvalStatus) {
    case null:
      return <Badge tone="muted">Questionario da completare</Badge>;
    case "pending":
      return (
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">Approvata: in attesa</Badge>
          <Link href="/admin/registrations" className="text-xs font-medium text-ink underline underline-offset-4">
            Valuta
          </Link>
        </span>
      );
    case "approved":
      return <Badge tone="accent">Approvata: sì</Badge>;
    case "rejected":
      return <Badge tone="rust">Approvata: no</Badge>;
  }
}

export function UserList({ users, canManageRoles, currentUserId, now, timezone }: UserListProps) {
  return (
    <ul className="divide-y divide-line">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        return (
          <li key={user.id} className="flex flex-col gap-4 py-4 transition-colors first:pt-5 last:pb-5 hover:bg-sunken/55 sm:flex-row sm:items-start sm:justify-between sm:px-2">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar name={user.fullName} />
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {user.fullName}
                  {isSelf ? <span className="ml-2 text-xs font-normal text-ink-3">(tu)</span> : null}
                </p>
                <p className="mt-0.5 break-all text-[13px] text-ink-2">{user.email}</p>
                <p className="mt-1 text-xs text-ink-3">
                  Account creato il {formatCalendarDate(calendarDateIn(timezone, user.createdAt), { withYear: true })} · ultimo
                  accesso {user.lastSignInAt ? formatRelativeInstant(user.lastSignInAt, now, timezone) : "mai"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                  {user.role === "client" ? (
                    <ClientStatus user={user} />
                  ) : (
                    <span>{capitalize(pluralize(user.assignedClientCount, "cliente assegnata", "clienti assegnate"))}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 sm:pl-4">
              {canManageRoles && !isSelf ? (
                <UserRoleControl
                  userId={user.id}
                  fullName={user.fullName}
                  role={user.role}
                  assignedClientCount={user.assignedClientCount}
                  hasOpenRegistration={user.approvalStatus === "pending" || user.approvalStatus === "rejected"}
                />
              ) : (
                <Badge tone="neutral">{ROLE_LABELS[user.role]}</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
