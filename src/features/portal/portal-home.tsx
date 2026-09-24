import { CalendarClock, ClipboardPen, Hourglass, MessageCircleHeart, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { calendarDateIn } from "@/domain/dates";
import { firstNameOf } from "@/domain/greeting";
import { CompactScores } from "@/features/checkins/score-meter";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import type { PortalOverview } from "@/server/services/portal";
import type { CheckinItem } from "@/types/domain";

type ActiveOverview = Extract<PortalOverview, { stage: "active" }>;

function CheckinReplyBadge({ checkin }: { checkin: Pick<CheckinItem, "coachReply" | "reviewedAt"> }) {
  if (checkin.coachReply) return <Badge tone="accent">Risposta ricevuta</Badge>;
  if (checkin.reviewedAt) return <Badge tone="neutral">Visto dalla coach</Badge>;
  return <Badge tone="muted">Inviato</Badge>;
}

export function PendingApproval({ fullName }: { fullName: string }) {
  return (
    <EmptyState
      icon={Hourglass}
      title={`Grazie ${firstNameOf(fullName)}, la tua richiesta è in revisione`}
      description="Il team FESPA sta verificando la tua iscrizione e ti assegnerà una coach. Riceverai accesso completo appena la richiesta sarà approvata: puoi intanto controllare o aggiornare i tuoi dati."
      action={
        <Link href="/area-cliente/profilo" className={buttonClasses("secondary")}>
          Rivedi i tuoi dati
        </Link>
      }
      className="py-20"
    />
  );
}

export function RejectedRegistration() {
  return (
    <EmptyState
      icon={XCircle}
      title="La tua richiesta non è stata approvata"
      description="Per informazioni sulla tua iscrizione contatta direttamente il team FESPA."
      className="py-20"
    />
  );
}

export function ActivePortalHome({ overview, timezone }: { overview: ActiveOverview; timezone: string }) {
  const coachLabel = overview.coachNames.length > 0 ? overview.coachNames.join(" e ") : null;

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">La tua area</p>
        <h1 className="mt-1.5 font-serif text-[32px] leading-tight tracking-[-0.01em] text-ink">
          Ciao, {firstNameOf(overview.fullName)}
        </h1>
        <p className="mt-2 text-[15px] text-ink-2">
          {coachLabel ? `Ti segue ${coachLabel}.` : "A breve ti verrà assegnata una coach."}
        </p>
      </header>

      <section aria-label="Check-in settimanale" className="rounded-lg border border-line bg-surface p-5 sm:p-6">
        {overview.nextCheckinAvailableAt ? (
          <div className="flex items-start gap-4">
            <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
            <div>
              <p className="font-medium text-ink">Check-in inviato</p>
              <p className="mt-1 text-sm text-ink-2">
                Potrai inviare il prossimo da {formatDateTime(overview.nextCheckinAvailableAt, timezone)}.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <ClipboardPen aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
              <div>
                <p className="font-medium text-ink">È il momento del check-in settimanale</p>
                <p className="mt-1 text-sm text-ink-2">Bastano un paio di minuti: la tua coach ti risponderà qui.</p>
              </div>
            </div>
            <Link href="/area-cliente/check-in" className={buttonClasses("primary", "md", "w-full sm:w-auto")}>
              Compila il check-in
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="border-b border-line pb-3 font-serif text-xl text-ink">
          I tuoi check-in
        </h2>
        {overview.checkins.length === 0 ? (
          <EmptyState
            icon={MessageCircleHeart}
            title="Ancora nessun check-in"
            description="Quando invierai il primo, qui troverai anche le risposte della tua coach."
          />
        ) : (
          <ol className="divide-y divide-line">
            {overview.checkins.map((checkin) => (
              <li key={checkin.id} className="flex flex-col gap-3 py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {formatCalendarDate(calendarDateIn(timezone, checkin.submittedAt), { withYear: true })}
                  </p>
                  <CheckinReplyBadge checkin={checkin} />
                </div>
                {checkin.answers ? <CompactScores answers={checkin.answers} /> : null}
                {checkin.coachReply ? (
                  <div className="border-l-2 border-accent pl-4">
                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-accent-strong">
                      {checkin.reviewedByName ? `Risposta di ${checkin.reviewedByName}` : "Risposta della tua coach"}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-pretty text-ink">{checkin.coachReply}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
