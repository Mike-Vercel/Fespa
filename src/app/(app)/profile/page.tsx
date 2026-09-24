import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { calendarDateIn } from "@/domain/dates";
import { canManageRoles } from "@/domain/roles";
import { EmailForm } from "@/features/profile/email-form";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { formatCalendarDate, formatRelativeInstant } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { requireCoach } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getOwnAccount } from "@/server/services/account";
import { firstParam } from "@/validation/common";

export const metadata: Metadata = { title: "Profilo" };

const INLINE_LINK = "font-medium text-ink underline underline-offset-4 hover:text-ink-hover";

/** Esiti del cambio email, passati da /auth/confirm dopo il clic sui link ricevuti. */
const EMAIL_NOTICES: Record<string, string> = {
  "primo-link": "Primo link confermato. Per completare il cambio apri anche quello che ti abbiamo inviato all'altro indirizzo.",
  aggiornata: "Email aggiornata: da ora accedi con il nuovo indirizzo.",
};

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const context = await requireCoach();
  const [account, params] = await Promise.all([getOwnAccount(context), searchParams]);
  const { coach } = context;
  const timezone = getServerEnv().APP_TIMEZONE;
  const now = new Date();
  const emailNotice = EMAIL_NOTICES[firstParam(params.email) ?? ""];

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <PageHeader title="Profilo" description="I tuoi dati e l'accesso all'app: puoi cambiarli da qui." />

      <div className="flex items-center gap-4">
        <Avatar name={coach.fullName} size="lg" />
        <div className="min-w-0">
          <p className="font-serif text-xl text-ink">{coach.fullName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <span className="truncate">{account.email}</span>
            <Badge tone="neutral">{ROLE_LABELS[coach.role]}</Badge>
          </p>
        </div>
      </div>

      <section aria-labelledby="profile-data" className="flex max-w-2xl flex-col gap-5">
        <SectionHeader id="profile-data" title="Dati personali" />
        <ProfileForm initialName={coach.fullName} />
      </section>

      <section aria-labelledby="profile-email" className="flex max-w-2xl flex-col gap-5">
        <SectionHeader id="profile-email" title="Email di accesso" />
        {emailNotice ? (
          <p role="status" className="max-w-md rounded-md bg-accent-soft px-4 py-3.5 text-sm text-pretty text-accent-strong">
            {emailNotice}
          </p>
        ) : null}
        <EmailForm currentEmail={account.email} initialPendingEmail={account.pendingEmail} />
      </section>

      <section aria-labelledby="profile-password" className="flex max-w-2xl flex-col gap-5">
        <SectionHeader
          id="profile-password"
          title="Password"
          description="Serve quella attuale: così chi trova una sessione aperta non può cambiarla al posto tuo."
        />
        <PasswordForm />
      </section>

      <section aria-labelledby="profile-account" className="flex max-w-2xl flex-col gap-5">
        <SectionHeader id="profile-account" title="Account" />
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 text-sm">
          <dt className="text-ink-3">Ruolo</dt>
          <dd className="flex flex-col gap-1 text-ink">
            <span>{ROLE_LABELS[coach.role]}</span>
            <span className="text-pretty text-ink-3">
              {canManageRoles(coach.role) ? (
                <>
                  Puoi cambiare i ruoli degli altri da{" "}
                  <Link href="/admin/users" className={INLINE_LINK}>
                    Utenti registrati
                  </Link>
                  , non il tuo: così il team non resta mai senza un super admin.
                </>
              ) : (
                "Lo assegna il super admin: non si può cambiare da qui."
              )}
            </span>
          </dd>
          <dt className="text-ink-3">Nel team dal</dt>
          <dd className="text-ink">
            {formatCalendarDate(calendarDateIn(timezone, account.createdAt), { withYear: true })}
          </dd>
          <dt className="text-ink-3">Ultimo accesso</dt>
          <dd className="text-ink">
            {account.lastSignInAt ? formatRelativeInstant(account.lastSignInAt, now, timezone) : "—"}
          </dd>
        </dl>
        <p className="text-sm text-pretty text-ink-3">
          Per chiudere le sessioni aperte su altri dispositivi vai in{" "}
          <Link href="/settings" className={INLINE_LINK}>
            Impostazioni
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
