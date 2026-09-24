import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeInstant } from "@/lib/format";
import type { CheckinWithClient } from "@/types/domain";
import { CheckinStatusBadge } from "./checkin-status-badge";
import { checkinExcerpt, CompactScores } from "./score-meter";

type CheckinListProps = {
  checkins: CheckinWithClient[];
  now: Date;
  timezone: string;
  /** Azione per riga (es. "Segna come revisionato" nell'inbox). */
  renderAction?: (checkin: CheckinWithClient) => ReactNode;
};

/*
 * Disposizione della riga:
 *   mobile/tablet:  chi      | stato          desktop largo:  chi | testo | punteggi | stato
 *                   testo    (piena larghezza)
 *                   punteggi (piena larghezza)
 */
const ROW_LAYOUT =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 [grid-template-areas:'who_status''text_text''scores_scores'] xl:grid-cols-[220px_minmax(0,1fr)_240px_minmax(150px,auto)] xl:items-center xl:[grid-template-areas:'who_text_scores_status']";

/** Lista trasversale di check-in (dashboard, inbox): chi, quando, come sta, stato. */
export function CheckinList({ checkins, now, timezone, renderAction }: CheckinListProps) {
  return (
    <ul className="divide-y divide-line">
      {checkins.map((checkin) => {
        const excerpt = checkinExcerpt(checkin.answers);
        return (
          <li key={checkin.id} className={`${ROW_LAYOUT} py-4`}>
            <div className="flex min-w-0 items-center gap-3 [grid-area:who]">
              <Avatar name={checkin.clientName} size="sm" />
              <div className="min-w-0">
                <Link
                  href={`/clients/${checkin.clientId}?tab=checkins#checkin-${checkin.id}`}
                  className="block truncate font-medium text-ink underline-offset-4 hover:underline"
                >
                  {checkin.clientName}
                </Link>
                <p className="text-xs text-ink-3">Inviato {formatRelativeInstant(checkin.submittedAt, now, timezone)}</p>
              </div>
            </div>

            <p className="line-clamp-2 text-[13px] text-pretty text-ink-2 [grid-area:text]">
              {excerpt ?? <span className="text-ink-3">Nessun commento testuale.</span>}
            </p>

            <div className="[grid-area:scores]">
              {checkin.answers ? (
                <CompactScores answers={checkin.answers} />
              ) : (
                <p className="text-xs text-ink-3">Risposte in un formato non riconosciuto.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 self-start [grid-area:status] xl:self-center">
              <CheckinStatusBadge reviewedAt={checkin.reviewedAt} />
              {renderAction?.(checkin)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
