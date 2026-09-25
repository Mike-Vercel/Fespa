import { ChevronDown, ClipboardCheck, ClipboardX, Info, Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { calendarDateIn } from "@/domain/dates";
import { HealthProfileSummary, PersonalProfileList } from "@/features/clients/client-profile-blocks";
import { cn } from "@/lib/cn";
import { capitalize, formatCalendarDate } from "@/lib/format";
import type { RegistrationRecord, StaffMember } from "@/server/repositories/client-accounts";
import { RegistrationDecision } from "./registration-decision";

type RegistrationCardProps = {
  registration: RegistrationRecord;
  staff: StaffMember[];
  today: string;
  timezone: string;
};

/*
 * Riga della richiesta (tutta cliccabile: apre il dettaglio), dalla più stretta:
 *   mobile:  chi | stato            tablet:  chi      | stato          da 1280px:  chi | contatti | questionario | stato
 *            contatti                        contatti | questionario
 *            questionario
 */
const SUMMARY_LAYOUT = [
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-4",
  "[grid-template-areas:'who_status''contacts_contacts''form_form']",
  "md:grid-cols-2 md:[grid-template-areas:'who_status''contacts_form']",
  "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] xl:gap-x-0 xl:[grid-template-areas:'who_contacts_form_status']",
].join(" ");

const COLUMN_DIVIDER = "xl:border-l xl:border-line/80 xl:px-8";

export function RegistrationCard({ registration, staff, today, timezone }: RegistrationCardProps) {
  const { profile, health } = registration;
  const isRejected = registration.approvalStatus === "rejected";
  const titleId = `registration-${registration.id}`;
  const registeredOn = profile.onboardingCompletedAt
    ? `Iscritta il ${formatCalendarDate(calendarDateIn(timezone, profile.onboardingCompletedAt), { withYear: true })}`
    : "Iscrizione non completata";
  const questionnaireDone = profile.onboardingCompletedAt !== null;

  return (
    <details className="group rounded-2xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-24px_rgb(31_29_26/0.2)] transition-shadow hover:shadow-[0_1px_2px_rgb(31_29_26/0.04),0_16px_32px_-22px_rgb(31_29_26/0.26)]">
      <summary
        className={cn(
          SUMMARY_LAYOUT,
          "cursor-pointer list-none rounded-2xl px-5 py-5 transition-colors hover:bg-sunken/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:px-6 [&::-webkit-details-marker]:hidden",
        )}
      >
        <div className="flex min-w-0 items-center gap-4 [grid-area:who] xl:pr-8">
          <Avatar name={profile.fullName} className="size-14 text-[19px]" />
          <div className="min-w-0">
            <h3 id={titleId} className="truncate text-[20px] font-semibold leading-snug text-ink">
              {profile.fullName}
            </h3>
            <p className="mt-0.5 text-[15px] text-ink-3">{registeredOn}</p>
          </div>
        </div>

        {/* Solo i contatti che la persona ha davvero indicato: niente segnaposto. */}
        <div className="flex min-w-0 flex-col gap-2 text-[15px] text-ink [grid-area:contacts] xl:px-8">
          {profile.email ? (
            <span className="flex min-w-0 items-center gap-3">
              <Mail aria-hidden="true" className="size-[18px] shrink-0 text-ink-2" strokeWidth={1.6} />
              <span className="sr-only">Email: </span>
              <span className="truncate">{profile.email}</span>
            </span>
          ) : null}
          {profile.phone ? (
            <span className="flex min-w-0 items-center gap-3">
              <Phone aria-hidden="true" className="size-[18px] shrink-0 text-ink-2" strokeWidth={1.6} />
              <span className="sr-only">Telefono: </span>
              <span className="truncate">{profile.phone}</span>
            </span>
          ) : null}
          {!profile.email && !profile.phone ? <span className="text-ink-3">Nessun contatto indicato</span> : null}
        </div>

        <div className={cn("flex min-w-0 items-start gap-3 [grid-area:form]", COLUMN_DIVIDER)}>
          {questionnaireDone ? (
            <ClipboardCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-2" strokeWidth={1.6} />
          ) : (
            <ClipboardX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-2" strokeWidth={1.6} />
          )}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[15px] font-semibold text-ink">Questionario d&apos;ingresso</span>
              {questionnaireDone ? <Badge tone="accent">Completo</Badge> : <Badge tone="warning">Da completare</Badge>}
            </p>
            <p className="mt-1 truncate text-[14px] text-ink-3">
              {profile.goal ? `Obiettivo: ${capitalize(profile.goal)}` : "Obiettivo non indicato"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 [grid-area:status] xl:border-l xl:border-line/80 xl:pl-8">
          {isRejected ? (
            <Badge tone="rust" className="h-9 rounded-xl px-4 text-[15px]">
              Rifiutata
            </Badge>
          ) : (
            <Badge tone="warning" className="h-9 rounded-xl px-4 text-[15px]">
              Da approvare
            </Badge>
          )}
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-ink-2 transition-transform duration-200 group-open:rotate-180"
            strokeWidth={1.75}
          />
        </div>
      </summary>

      <div className="border-t border-line/80 px-5 pb-6 pt-5 lg:px-6">
        {profile.goal ? (
          <p className="text-[15px] text-pretty text-ink-2">
            <span className="text-ink-3">Obiettivo · </span>
            {capitalize(profile.goal)}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section aria-label="Dati personali">
            <PersonalProfileList profile={profile} today={today} />
          </section>
          <section aria-label="Infortuni e traumi">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-ink-3">Infortuni e traumi</h4>
            <HealthProfileSummary health={health} />
          </section>
        </div>

        <div className="mt-6 rounded-xl bg-sunken/60 p-4 ring-1 ring-inset ring-line/70 sm:p-5">
          {isRejected ? null : (
            <p className="mb-4 flex items-start gap-2 text-[14px] text-pretty text-ink-2">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
              L&apos;abbonamento non è registrato nell&apos;app: verificalo prima di approvare.
            </p>
          )}
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
