import type { Metadata } from "next";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/features/profile/profile-form";
import { ROLE_LABELS } from "@/lib/labels";
import { requireCoach } from "@/server/auth/session";

export const metadata: Metadata = { title: "Profilo" };


export default async function ProfilePage() {
  const { coach } = await requireCoach();

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <PageHeader title="Profilo" description="I tuoi dati di accesso e come appari alle colleghe." />

      <div className="flex items-center gap-4">
        <Avatar name={coach.fullName} size="lg" />
        <div>
          <p className="font-serif text-xl text-ink">{coach.fullName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {coach.email}
            <Badge tone="neutral">{ROLE_LABELS[coach.role]}</Badge>
          </p>
        </div>
      </div>

      <section aria-labelledby="profile-data" className="flex max-w-2xl flex-col gap-5">
        <SectionHeader id="profile-data" title="Dati personali" />
        <ProfileForm initialName={coach.fullName} />
      </section>

      <section aria-labelledby="profile-account" className="flex max-w-2xl flex-col gap-3">
        <SectionHeader id="profile-account" title="Account" />
        <p className="text-sm text-pretty text-ink-2">
          Email, password e ruolo sono gestiti dall&apos;amministratore del tuo team: il ruolo non può essere
          modificato da questa pagina né dal browser.
        </p>
      </section>
    </div>
  );
}
