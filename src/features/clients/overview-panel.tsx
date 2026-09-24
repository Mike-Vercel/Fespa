import { Inbox, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, ClientStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { buildRecentActivity, type ActivityKind } from "@/domain/activity";
import { calendarDateIn } from "@/domain/dates";
import { cn } from "@/lib/cn";
import { capitalize, formatCalendarDate, formatRelativeInstant, pluralize } from "@/lib/format";
import type { ClientDetail } from "@/server/services/clients";
import { CheckinStatusBadge } from "@/features/checkins/checkin-status-badge";
import { ScoreMeter } from "@/features/checkins/score-meter";
import { CHECKIN_SCALES } from "@/validation/checkin";
import { HealthProfileSummary, PersonalProfileList } from "./client-profile-blocks";
import { ClientTabLink } from "./client-tabs";

const RECENT_ACTIVITY_LIMIT = 6;
const RECENT_NOTES_LIMIT = 2;

const ACTIVITY_DOT: Record<ActivityKind, string> = {
  checkin_received: "bg-ink-3",
  checkin_reviewed: "bg-line-strong",
  note_added: "bg-line-strong",
  followup_completed: "bg-accent",
  ai_analysis: "bg-accent",
};

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
        <h2 className="font-serif text-lg text-ink">{title}</h2>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

export function OverviewPanel({ detail, now }: { detail: ClientDetail; now: Date }) {
  const { client, checkins, notes, followups, analyses, profile, health, today, timezone } = detail;
  const latestCheckin = checkins[0];
  const latestAnswers = latestCheckin?.answers ?? null;
  const latestAnalysis = analyses[0];
  const activity = buildRecentActivity({ checkins, notes, followups, analyses }, RECENT_ACTIVITY_LIMIT);
  const pendingFollowups = followups.filter((followup) => followup.status === "pending").length;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
      <div className="flex flex-col gap-10 lg:col-span-7">
        <Block
          title="Ultimo check-in"
          action={latestCheckin ? <ClientTabLink tab="checkins">Tutti i check-in</ClientTabLink> : undefined}
        >
          {latestCheckin ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink-2">
                  {capitalize(formatRelativeInstant(latestCheckin.submittedAt, now, timezone))} ·{" "}
                  {formatCalendarDate(calendarDateIn(timezone, latestCheckin.submittedAt), { withYear: true })}
                </p>
                <CheckinStatusBadge reviewedAt={latestCheckin.reviewedAt} />
              </div>
              {latestAnswers ? (
                <>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                    {CHECKIN_SCALES.map((scale) => (
                      <ScoreMeter key={scale.key} scaleKey={scale.key} value={latestAnswers[scale.key]} />
                    ))}
                  </div>
                  {latestAnswers.challenges ? (
                    <blockquote className="border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-pretty text-ink-2">
                      {latestAnswers.challenges}
                    </blockquote>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-ink-3">Risposte in un formato non riconosciuto.</p>
              )}
            </div>
          ) : (
            <EmptyState icon={Inbox} title="Nessun check-in" description="Questa cliente non ha ancora inviato check-in." className="py-6" />
          )}
        </Block>

        <Block title="Insight AI recenti">
          {latestAnalysis ? (
            <div className="flex flex-col gap-3 border-l-2 border-accent pl-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                <Sparkles aria-hidden="true" className="size-3.5 text-accent" strokeWidth={2} />
                <span>{capitalize(formatRelativeInstant(latestAnalysis.createdAt, now, timezone))}</span>
                {latestAnalysis.isMock ? <Badge tone="amber">Risultato dimostrativo (mock)</Badge> : null}
              </div>
              <p className="text-[15px] leading-relaxed text-pretty text-ink">{latestAnalysis.summary}</p>
              <ul className="flex flex-wrap gap-1.5" aria-label="Temi emersi">
                {latestAnalysis.topics.map((topic) => (
                  <li key={topic}>
                    <Badge>{topic}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-ink-3">
              Nessuna analisi ancora. Apri un check-in e usa <span className="font-medium text-ink-2">Analizza con AI</span>{" "}
              per ottenere una sintesi da verificare.
            </p>
          )}
        </Block>
      </div>

      <div className="flex flex-col gap-10 lg:col-span-5">
        <Block title="Informazioni">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-ink-3">Stato</dt>
            <dd>
              <ClientStatusBadge status={client.status} />
            </dd>
            <dt className="text-ink-3">In percorso dal</dt>
            <dd className="text-ink">{formatCalendarDate(client.startedOn, { withYear: true })}</dd>
            <dt className="text-ink-3">Check-in ricevuti</dt>
            <dd className="tabular text-ink">{checkins.length}</dd>
            <dt className="text-ink-3">Follow-up aperti</dt>
            <dd className="tabular text-ink">{pendingFollowups}</dd>
          </dl>
        </Block>

        <Block title="Profilo della cliente">
          {profile ? (
            <PersonalProfileList profile={profile} today={today} />
          ) : (
            <p className="text-sm text-ink-3">
              {client.email
                ? "La cliente non ha ancora completato il questionario di ingresso: i suoi dati compariranno qui."
                : "Nessun profilo: questa cliente non ha accesso all'area clienti."}
            </p>
          )}
        </Block>

        {profile ? (
          <Block title="Infortuni e traumi">
            <HealthProfileSummary health={health} />
          </Block>
        ) : null}

        <Block
          title="Note recenti"
          action={notes.length > 0 ? <ClientTabLink tab="notes">Tutte le note</ClientTabLink> : undefined}
        >
          {notes.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {notes.slice(0, RECENT_NOTES_LIMIT).map((note) => (
                <li key={note.id}>
                  <p className="text-xs text-ink-3">
                    {note.isOwn ? "Tu" : note.authorName} · {formatRelativeInstant(note.createdAt, now, timezone)}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm text-pretty text-ink-2">{note.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Nessuna nota. Puoi aggiungerne una dalla tab Note.</p>
          )}
        </Block>

        <Block title="Attività recenti">
          {activity.length > 0 ? (
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {activity.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn("absolute -left-[24px] top-1.5 size-2 rounded-full ring-4 ring-paper", ACTIVITY_DOT[event.kind])}
                  />
                  <p className="text-sm text-ink">{event.description}</p>
                  <p className="text-xs text-ink-3">{capitalize(formatRelativeInstant(event.at, now, timezone))}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-3">Nessuna attività registrata.</p>
          )}
        </Block>

        <p className="text-xs text-ink-3">
          {pluralize(analyses.length, "analisi AI", "analisi AI")} salvate per questa cliente. Ogni analisi riporta modello e data.
        </p>
      </div>
    </div>
  );
}
