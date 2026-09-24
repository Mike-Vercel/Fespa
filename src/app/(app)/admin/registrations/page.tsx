import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/states";
import { calendarDateIn } from "@/domain/dates";
import { RegistrationCard } from "@/features/admin/registration-card";
import { pluralize } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { getRegistrationsOverview } from "@/server/services/registrations";

export const metadata: Metadata = { title: "Iscrizioni" };

export default async function RegistrationsPage() {
  const context = await requireAdmin();
  const { pending, rejected, staff, timezone } = await getRegistrationsOverview(context);
  const today = calendarDateIn(timezone);

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <PageHeader
        eyebrow="Amministrazione"
        title="Iscrizioni"
        description="Persone che si sono registrate da sole all'area clienti. Verifica che abbiano un abbonamento attivo, poi approvale assegnando una coach: solo allora potranno inviare i check-in."
      />

      <section aria-labelledby="pending-title" className="flex flex-col gap-5">
        <SectionHeader
          id="pending-title"
          title="Da approvare"
          description={pending.length > 0 ? pluralize(pending.length, "richiesta in attesa", "richieste in attesa") : undefined}
        />
        {pending.length > 0 ? (
          <div className="flex flex-col gap-5">
            {pending.map((registration) => (
              <RegistrationCard key={registration.id} registration={registration} staff={staff} today={today} timezone={timezone} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UserCheck}
            title="Nessuna iscrizione da approvare"
            description="Quando qualcuno si registra dall'area clienti, la richiesta compare qui."
          />
        )}
      </section>

      {rejected.length > 0 ? (
        <section aria-labelledby="rejected-title" className="flex flex-col gap-5">
          <SectionHeader
            id="rejected-title"
            title="Rifiutate"
            description="Puoi riconsiderarle in qualsiasi momento, ad esempio dopo il rinnovo dell'abbonamento."
          />
          <div className="flex flex-col gap-5">
            {rejected.map((registration) => (
              <RegistrationCard key={registration.id} registration={registration} staff={staff} today={today} timezone={timezone} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
