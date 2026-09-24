import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { UserDirectory } from "@/features/admin/user-directory";
import { GROUP_ICONS, GROUP_TITLES, GROUP_TONES } from "@/features/admin/user-groups";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getUsersOverview } from "@/server/services/users";

export const metadata: Metadata = { title: "Utenti registrati" };

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
          const Icon = GROUP_ICONS[group.role];
          return (
            <div key={group.role} className={cn("rounded-lg border border-line border-t-4 bg-surface p-4 shadow-raised", GROUP_TONES[group.role])}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-ink-3">{GROUP_TITLES[group.role]}</span>
                <Icon aria-hidden="true" className="size-4 text-ink-3" strokeWidth={1.8} />
              </div>
              <p className="tabular mt-2 font-serif text-3xl leading-none text-ink">{group.users.length}</p>
            </div>
          );
        })}
      </section>

      <UserDirectory
        groups={groups}
        canManageRoles={canManageRoles}
        currentUserId={currentUserId}
        now={now}
        timezone={timezone}
      />
    </div>
  );
}
