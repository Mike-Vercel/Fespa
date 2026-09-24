import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { calendarDateIn } from "@/domain/dates";
import { canManageRoles } from "@/domain/roles";
import { EmailForm } from "@/features/profile/email-form";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { SettingsCard } from "@/features/profile/settings-card";
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

  const facts = [
    { label: "Ruolo", value: ROLE_LABELS[coach.role] },
    { label: "Nel team dal", value: formatCalendarDate(calendarDateIn(timezone, account.createdAt), { withYear: true }) },
    { label: "Ultimo accesso", value: account.lastSignInAt ? formatRelativeInstant(account.lastSignInAt, now, timezone) : "—" },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6 animate-rise-in">
      <PageHeader title="Profilo" description="I tuoi dati e l'accesso all'app: puoi cambiarli da qui." />

      <section aria-label="Il tuo account" className="overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
        <div
          aria-hidden="true"
          className="h-24 bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-sky-soft)_55%,var(--color-amber-soft))] sm:h-28"
        />
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          {/* Solo l'avatar si sovrappone alla fascia colorata; nome ed email restano sul bianco. */}
          <Avatar name={coach.fullName} size="xl" className="-mt-10 ring-4 ring-surface" />
          <div className="mt-3 min-w-0">
            <p className="truncate font-serif text-2xl leading-tight text-ink">{coach.fullName}</p>
            <p className="mt-1 truncate text-sm text-ink-2">{account.email}</p>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-lg bg-sunken px-4 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">{fact.label}</dt>
                <dd className="mt-1 text-[15px] font-medium text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <SettingsCard
        id="profile-data"
        icon={UserRound}
        title="Dati personali"
        description="Il nome con cui ti vedono le colleghe e le clienti che segui."
      >
        <ProfileForm initialName={coach.fullName} />
      </SettingsCard>

      <SettingsCard
        id="profile-email"
        icon={Mail}
        title="Email di accesso"
        description="È anche l'indirizzo a cui arrivano i messaggi dell'app."
      >
        <div className="flex flex-col gap-4">
          {emailNotice ? (
            <p role="status" className="rounded-md bg-accent-soft px-4 py-3.5 text-sm text-pretty text-accent-strong">
              {emailNotice}
            </p>
          ) : null}
          <EmailForm currentEmail={account.email} initialPendingEmail={account.pendingEmail} />
        </div>
      </SettingsCard>

      <SettingsCard
        id="profile-password"
        icon={KeyRound}
        title="Password"
        description="Serve quella attuale: così chi trova una sessione aperta non può cambiarla al posto tuo."
      >
        <PasswordForm />
      </SettingsCard>

      <SettingsCard
        id="profile-security"
        icon={ShieldCheck}
        title="Ruolo e sicurezza"
        description="Cosa puoi fare nell'app e dove chiudere le sessioni aperte."
      >
        <div className="flex flex-col gap-3 text-sm text-pretty text-ink-2">
          <p>
            Sei <span className="font-medium text-ink">{ROLE_LABELS[coach.role]}</span>.{" "}
            {canManageRoles(coach.role) ? (
              <>
                Puoi cambiare i ruoli degli altri da{" "}
                <Link href="/admin/users" className={INLINE_LINK}>
                  Utenti registrati
                </Link>
                , non il tuo: così il team non resta mai senza un super admin.
              </>
            ) : (
              "Il ruolo lo assegna il super admin: non si può cambiare da qui."
            )}
          </p>
          <p>
            Hai usato l&apos;app su un computer condiviso? Chiudi tutte le sessioni da{" "}
            <Link href="/settings" className={INLINE_LINK}>
              Impostazioni
            </Link>
            .
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
