import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calendarDateIn } from "@/domain/dates";
import { HealthProfileSummary, PersonalProfileList } from "@/features/clients/client-profile-blocks";
import { capitalize, formatCalendarDate } from "@/lib/format";
import type { RegistrationRecord, StaffMember } from "@/server/repositories/client-accounts";
import { RegistrationDecision } from "./registration-decision";

type RegistrationCardProps = {
  registration: RegistrationRecord;
  staff: StaffMember[];
  today: string;
  timezone: string;
};

export function RegistrationCard({ registration, staff, today, timezone }: RegistrationCardProps) {
  const { profile, health } = registration;
  const isRejected = registration.approvalStatus === "rejected";
  const titleId = `registration-${registration.id}`;

  return (
    <details className="group overflow-hidden rounded-lg border border-line bg-surface shadow-raised">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-sunken sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 id={titleId} className="font-serif text-xl text-ink">
            {profile.fullName}
          </h3>
          <p className="mt-1 text-[13px] text-ink-3">
            {profile.onboardingCompletedAt
              ? `Iscritta il ${formatCalendarDate(calendarDateIn(timezone, profile.onboardingCompletedAt), { withYear: true })}`
              : "Iscrizione non completata"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isRejected ? <Badge tone="rust">Rifiutata</Badge> : <Badge tone="amber">Da approvare</Badge>}
          <ChevronDown aria-hidden="true" className="size-5 text-ink-3 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-line px-4 pb-5 sm:px-5">
        {profile.goal ? (
          <p className="mt-4 text-[15px] text-pretty text-ink-2">
          <span className="text-ink-3">Obiettivo · </span>
          {capitalize(profile.goal)}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-8 pt-1 lg:grid-cols-2">
          <section aria-label="Dati personali">
            <PersonalProfileList profile={profile} today={today} />
          </section>
          <section aria-label="Infortuni e traumi">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-ink-3">Infortuni e traumi</h4>
            <HealthProfileSummary health={health} />
          </section>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <RegistrationDecision
            clientId={registration.id}
            fullName={profile.fullName}
            staff={staff}
            canReject={!isRejected}
            isRestore={isRejected}
          />
        </div>
      </div>
    </details>
  );
}
