import type { Metadata } from "next";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
import { PageHeader } from "@/components/shell/page-header";
import { UserDirectory } from "@/features/admin/user-directory";
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
    <>
      <PageAtmosphere variant="soft" />
      <div className="flex flex-col gap-7 animate-rise-in">
        <PageHeader
          variant="display"
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

        <UserDirectory
          groups={groups}
          canManageRoles={canManageRoles}
          currentUserId={currentUserId}
          now={now}
          timezone={timezone}
        />
      </div>
    </>
  );
}
