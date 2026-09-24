import type { ReactNode } from "react";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import type { CheckinItem } from "@/types/domain";
import { calendarDateIn } from "@/domain/dates";
import { CHECKIN_SCALES } from "@/validation/checkin";
import { CheckinStatusBadge } from "./checkin-status-badge";
import { ScoreMeter } from "./score-meter";

type CheckinCardProps = {
  checkin: CheckinItem;
  timezone: string;
  /** Strumenti della coach sotto al check-in (AI, revisione). */
  footer?: ReactNode;
};

/** Il testo scritto dalla cliente è mostrato come testo semplice (React esegue l'escaping). */
function AnswerBlock({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.1em] text-ink-3">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-pretty text-ink">{text}</dd>
    </div>
  );
}

export function CheckinCard({ checkin, timezone, footer }: CheckinCardProps) {
  const { answers } = checkin;
  const submittedDay = calendarDateIn(timezone, checkin.submittedAt);

  return (
    <article id={`checkin-${checkin.id}`} aria-labelledby={`checkin-title-${checkin.id}`} className="scroll-mt-24 py-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`checkin-title-${checkin.id}`} className="font-serif text-xl text-ink">
            Check-in del {formatCalendarDate(submittedDay, { withYear: true })}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Inviato il {formatDateTime(checkin.submittedAt, timezone)}
            {checkin.reviewedAt ? (
              <>
                {" · "}Revisionato{checkin.reviewedByName ? ` da ${checkin.reviewedByName}` : ""} il{" "}
                {formatDateTime(checkin.reviewedAt, timezone)}
              </>
            ) : null}
          </p>
        </div>
        <CheckinStatusBadge reviewedAt={checkin.reviewedAt} />
      </header>

      {answers ? (
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
          <dl className="flex flex-col gap-5">
            <AnswerBlock label="Cosa è andato bene" text={answers.wins} />
            <AnswerBlock label="Difficoltà" text={answers.challenges} />
            <AnswerBlock label="Domande per la coach" text={answers.questionsForCoach} />
          </dl>

          <div className="flex flex-col gap-3.5 self-start rounded-lg bg-sunken p-4">
            {CHECKIN_SCALES.map((scale) => (
              <ScoreMeter key={scale.key} scaleKey={scale.key} value={answers[scale.key]} />
            ))}
            <div className="flex items-baseline justify-between border-t border-line pt-3 text-[13px]">
              <span className="text-ink-3">Allenamenti</span>
              <span className="tabular font-medium text-ink">
                {answers.trainingSessionsDone} di {answers.trainingSessionsPlanned}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-amber-soft px-3.5 py-3 text-sm text-amber">
          Le risposte di questo check-in hanno un formato non riconosciuto e non possono essere mostrate.
        </p>
      )}

      {checkin.coachReply ? (
        <div className="mt-6 border-l-2 border-accent pl-4">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-accent-strong">Risposta inviata</p>
          <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{checkin.coachReply}</p>
        </div>
      ) : null}

      {footer ? <div className="mt-6">{footer}</div> : null}
    </article>
  );
}
