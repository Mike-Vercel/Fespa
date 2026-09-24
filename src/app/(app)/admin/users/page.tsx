import { BriefcaseBusiness, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { UserList } from "@/features/admin/user-list";
import { pluralize } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getUsersOverview } from "@/server/services/users";
import type { UserRole } from "@/types/domain";

export const metadata: Metadata = { title: "Utenti registrati" };

const SECTION_TITLES: Record<UserRole, string> = {
  super_admin: "Super admin",
  admin: "Amministrazione",
  coach: "Coach",
  client: "Clienti",
};

const EMPTY_SECTION: Record<UserRole, string> = {
  super_admin: "Nessun super admin.",
  admin: "Nessun account di amministrazione.",
  coach: "Nessuna coach.",
  client: "Nessuna cliente registrata.",
};

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  super_admin: ShieldCheck,
  admin: ShieldCheck,
  coach: BriefcaseBusiness,
  client: UsersRound,
};

const ROLE_TONES: Record<UserRole, string> = {
  super_admin: "border-t-rust",
  admin: "border-t-amber",
  coach: "border-t-accent",
  client: "border-t-sky",
};

export default async function UsersPage() {
  const context = await requireAdmin();
  const { groups, canManageRoles, currentUserId } = await getUsersOverview(context);
  const total = groups.reduce((sum, group) => sum + group.users.length, 0);
  const now = new Date();
  const timezone = getServerEnv().APP_TIMEZONE;

  return (
    <div className="flex max-w-5xl flex-col gap-7 animate-rise-in">
      <PageHeader
        eyebrow="Amministrazione"
        title="Utenti registrati"
        description={
          <>
            {pluralize(total, "account", "account")}. Ogni nuovo account nasce come cliente.{" "}
            {canManageRoles
              ? "Da qui scegli chi è coach, amministrazione o super admin."
              : "Solo un super admin può cambiare i ruoli."}
          </>
        }
      />

      <section aria-label="Riepilogo utenti" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {groups.map((group) => {
          const Icon = ROLE_ICONS[group.role];
          return (
            <div key={group.role} className={`rounded-lg border border-line border-t-4 bg-surface p-4 shadow-raised ${ROLE_TONES[group.role]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-ink-3">{SECTION_TITLES[group.role]}</span>
                <Icon aria-hidden="true" className="size-4 text-ink-3" strokeWidth={1.8} />
              </div>
              <p className="tabular mt-2 font-serif text-3xl leading-none text-ink">{group.users.length}</p>
            </div>
          );
        })}
      </section>

      {groups.map((group) => (
        <section key={group.role} aria-labelledby={`users-${group.role}`} className={`overflow-hidden rounded-lg border border-line border-t-4 bg-surface shadow-raised ${ROLE_TONES[group.role]}`}>
          <SectionHeader
            id={`users-${group.role}`}
            title={SECTION_TITLES[group.role]}
            description={pluralize(group.users.length, "account", "account")}
          />
          {group.users.length > 0 ? (
            <div className="px-4 sm:px-5">
              <UserList
                users={group.users}
                canManageRoles={canManageRoles}
                currentUserId={currentUserId}
                now={now}
                timezone={timezone}
              />
            </div>
          ) : (
            <p className="px-4 py-5 text-sm text-ink-3 sm:px-5">{EMPTY_SECTION[group.role]}</p>
          )}
        </section>
      ))}
    </div>
  );
}
