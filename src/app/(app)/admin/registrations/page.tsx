import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/states";
import { calendarDateIn } from "@/domain/dates";
import { RegistrationCard } from "@/features/admin/registration-card";
import { pluralize } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { getRegistrationsOverview } from "@/server/services/registrations";

export const metadata: Metadata = { title: "Iscrizioni" };

function SectionTitle({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div>
      <h2 id={id} className="font-serif text-[30px] leading-tight text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 text-[16px] text-pretty text-ink-3">{description}</p> : null}
    </div>
  );
}

export default async function RegistrationsPage() {
  const context = await requireAdmin();
  const { pending, rejected, staff, timezone } = await getRegistrationsOverview(context);
  const today = calendarDateIn(timezone);

  return (
    <>
      <PageAtmosphere variant="soft" />

      <div className="flex flex-col gap-12 animate-rise-in">
        <PageHeader
          variant="display"
          eyebrow="Amministrazione"
          title="Iscrizioni"
          description="Persone che si sono registrate da sole all'area clienti. Verifica che abbiano un abbonamento attivo, poi approvale assegnando una coach: solo allora potranno inviare i check-in."
        />

        <section aria-labelledby="pending-title" className="flex flex-col gap-6">
          <SectionTitle
            id="pending-title"
            title="Da approvare"
            description={pending.length > 0 ? pluralize(pending.length, "richiesta in attesa", "richieste in attesa") : undefined}
          />
          {pending.length > 0 ? (
            <div className="flex flex-col gap-3">
              {pending.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} staff={staff} today={today} timezone={timezone} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-line/80 bg-surface">
              <EmptyState
                icon={UserCheck}
                title="Nessuna richiesta da approvare"
                description="Tutte le nuove iscrizioni sono state gestite. Quando qualcuno si registra dall'area clienti, la richiesta compare qui."
              />
            </div>
          )}
        </section>

        {rejected.length > 0 ? (
          <section aria-labelledby="rejected-title" className="flex flex-col gap-6">
            <SectionTitle
              id="rejected-title"
              title="Rifiutate"
              description="Puoi riconsiderarle in qualsiasi momento, ad esempio dopo il rinnovo dell'abbonamento."
            />
            <div className="flex flex-col gap-3">
              {rejected.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} staff={staff} today={today} timezone={timezone} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
