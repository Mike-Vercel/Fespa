import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ageOn } from "@/domain/dates";
import { formatCalendarDate } from "@/lib/format";
import { CONTACT_CHANNEL_LABELS, EXPERIENCE_LEVEL_LABELS, QUESTIONS_SOURCE_LABELS } from "@/lib/labels";
import type { ClientPersonalProfile, HealthProfile } from "@/types/domain";

/** Dati compilati dalla cliente nel questionario di ingresso. */
export function PersonalProfileList({ profile, today }: { profile: ClientPersonalProfile; today: string }) {
  const rows: Array<[string, string | null]> = [
    ["Email", profile.email],
    ["Telefono", profile.phone],
    [
      "Età",
      profile.birthDate ? `${ageOn(profile.birthDate, today)} anni (${formatCalendarDate(profile.birthDate, { withYear: true })})` : null,
    ],
    ["Esperienza", profile.experienceLevel ? EXPERIENCE_LEVEL_LABELS[profile.experienceLevel].label : null],
    ["Disponibilità", profile.weeklyAvailability ? `${profile.weeklyAvailability} giorni a settimana` : null],
    ["Contatto preferito", profile.preferredContact ? CONTACT_CHANNEL_LABELS[profile.preferredContact] : null],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-3">{label}</dt>
            <dd className={value ? "break-words text-ink" : "text-ink-3"}>{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      {profile.notesForCoach ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-3">Note per la coach</p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-pretty text-ink-2">{profile.notesForCoach}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Infortuni e traumi dichiarati dalla cliente. Sono dati sensibili: si mostrano solo allo staff
 * con accesso alla cliente, così come scritti, senza interpretazioni.
 */
export function HealthProfileSummary({ health }: { health: HealthProfile | null }) {
  if (!health) {
    return <p className="text-sm text-ink-3">La cliente non ha condiviso informazioni su infortuni o traumi.</p>;
  }
  if (!health.hasInjuries) {
    return <p className="text-sm text-ink-2">Dichiara di non avere infortuni, traumi o dolori rilevanti.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-sm text-ink-3">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber" />
        Informazioni riferite dalla cliente, non una valutazione medica. Per dubbi rimanda a un professionista sanitario.
      </p>
      {health.description ? (
        <blockquote className="border-l-2 border-amber pl-4 text-[15px] leading-relaxed text-pretty whitespace-pre-line text-ink">
          {health.description}
        </blockquote>
      ) : null}
      {health.followup.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-3">Approfondimento</p>
            {health.questionsSource ? <Badge tone="muted">{QUESTIONS_SOURCE_LABELS[health.questionsSource]}</Badge> : null}
          </div>
          <dl className="flex flex-col gap-3 text-sm">
            {health.followup.map((item) => (
              <div key={item.question}>
                <dt className="text-ink-3">{item.question}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-pretty text-ink">{item.answer || "Nessuna risposta"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
