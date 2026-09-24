import { KeyRound, Mail, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { calendarDateIn } from "@/domain/dates";
import { canManageRoles } from "@/domain/roles";
import { EmailForm } from "@/features/profile/email-form";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { SettingsSection } from "@/features/profile/settings-section";
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
    { label: "Nel team dal", value: formatCalendarDate(calendarDateIn(timezone, account.createdAt), { withYear: true }) },
    { label: "Ultimo accesso", value: account.lastSignInAt ? formatRelativeInstant(account.lastSignInAt, now, timezone) : "—" },
    { label: "Stato email", value: account.pendingEmail ? "Cambio in attesa" : "Confermata" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 animate-rise-in">
      <PageHeader title="Profilo" description="I tuoi dati e l'accesso all'app: puoi cambiarli da qui." />

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Scheda della persona: resta visibile mentre si scorrono i form a destra. */}
        <aside
          aria-label="Il tuo account"
          className="overflow-hidden rounded-xl border border-line bg-surface shadow-raised lg:sticky lg:top-24"
        >
          <div
            aria-hidden="true"
            className="h-24 bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-sky-soft)_55%,var(--color-amber-soft))]"
          />
          <div className="flex flex-col items-center px-6 pb-6 text-center">
            <Avatar name={coach.fullName} size="xl" className="-mt-10 ring-4 ring-surface" />
            <p className="mt-3 font-serif text-2xl leading-tight text-ink">{coach.fullName}</p>
            <p className="mt-1 max-w-full break-all text-sm text-ink-2">{account.email}</p>
            <Badge tone="neutral" className="mt-3">
              {ROLE_LABELS[coach.role]}
            </Badge>
          </div>

          <dl className="flex flex-col gap-3 border-t border-line px-6 py-5 text-sm">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-3">{fact.label}</dt>
                <dd className="text-right font-medium text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-3 border-t border-line px-6 py-5 text-[13px] leading-relaxed text-pretty text-ink-2">
            <p>
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
              Computer condiviso? Chiudi tutte le sessioni da{" "}
              <Link href="/settings" className={INLINE_LINK}>
                Impostazioni
              </Link>
              .
            </p>
          </div>
        </aside>

        <div className="divide-y divide-line rounded-xl border border-line bg-surface shadow-raised">
          <SettingsSection
            id="profile-data"
            icon={UserRound}
            title="Dati personali"
            description="Il nome con cui ti vedono le colleghe e le clienti che segui."
          >
            <ProfileForm initialName={coach.fullName} />
          </SettingsSection>

          <SettingsSection
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
          </SettingsSection>

          <SettingsSection
            id="profile-password"
            icon={KeyRound}
            title="Password"
            description="Serve quella attuale: così chi trova una sessione aperta non può cambiarla al posto tuo."
          >
            <PasswordForm />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
