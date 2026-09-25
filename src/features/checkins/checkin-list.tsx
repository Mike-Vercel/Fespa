import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeInstant } from "@/lib/format";
import type { CheckinWithClient } from "@/types/domain";
import { CheckinStatusBadge } from "./checkin-status-badge";
import { checkinExcerpt, CheckinScores } from "./score-meter";

type CheckinListProps = {
  checkins: CheckinWithClient[];
  now: Date;
  timezone: string;
  /** Azione per riga (es. "Segna come revisionato" nell'inbox). */
  renderAction?: (checkin: CheckinWithClient) => ReactNode;
};

/*
 * Disposizione della riga, dalla più stretta:
 *   mobile:        chi | stato        tablet (sm):  chi | stato        da 1280px:   chi | testo | punteggi | stato
 *                  testo                            testo                                                 | azione
 *                  punteggi 2×2                     punteggi | azione
 *                  azione                                            da 1536px:   chi | testo | punteggi | stato | azione
 */
const ROW_LAYOUT = [
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-3",
  "[grid-template-areas:'who_status''text_text''scores_scores''action_action']",
  "sm:[grid-template-areas:'who_status''text_text''scores_action']",
  "xl:grid-cols-[11rem_minmax(0,1fr)_auto_auto] xl:items-center xl:gap-x-6 xl:gap-y-2 xl:[grid-template-areas:'who_text_scores_status''who_text_scores_action']",
  "2xl:grid-cols-[13rem_minmax(0,1fr)_auto_auto_auto] 2xl:[grid-template-areas:'who_text_scores_status_action']",
].join(" ");

/** Lista trasversale di check-in (inbox, dashboard): chi, cosa ha scritto, come sta, stato e azione. */
export function CheckinList({ checkins, now, timezone, renderAction }: CheckinListProps) {
  return (
    <ul className="divide-y divide-line/80">
      {checkins.map((checkin) => {
        const excerpt = checkinExcerpt(checkin.answers, 180);
        const action = renderAction?.(checkin);
        return (
          <li key={checkin.id} className={`${ROW_LAYOUT} py-4`}>
            <div className="flex min-w-0 items-center gap-3.5 [grid-area:who]">
              <Avatar name={checkin.clientName} className="size-[42px] text-[14px]" />
              <div className="min-w-0">
                <Link
                  href={`/clients/${checkin.clientId}?tab=checkins#checkin-${checkin.id}`}
                  className="block truncate text-[16px] font-semibold leading-snug text-ink underline-offset-4 hover:underline"
                >
                  {checkin.clientName}
                </Link>
                <p className="mt-0.5 text-[14px] text-ink-3">Inviato {formatRelativeInstant(checkin.submittedAt, now, timezone)}</p>
              </div>
            </div>

            <p className="line-clamp-3 max-w-[26rem] text-[14px] leading-relaxed text-pretty text-ink-2 [grid-area:text]">
              {excerpt ?? <span className="text-ink-3">Nessun commento testuale.</span>}
            </p>

            <div className="[grid-area:scores]">
              {checkin.answers ? (
                <CheckinScores answers={checkin.answers} />
              ) : (
                <p className="text-[13px] text-ink-3">Risposte in un formato non riconosciuto.</p>
              )}
            </div>

            <div className="flex items-center justify-end self-start [grid-area:status] xl:self-end 2xl:self-center 2xl:border-l 2xl:border-line/80 2xl:py-2 2xl:pl-5">
              <CheckinStatusBadge reviewedAt={checkin.reviewedAt} />
            </div>

            {action ? (
              <div className="flex items-center [grid-area:action] sm:justify-end xl:self-start 2xl:self-center [&>button]:w-full sm:[&>button]:w-auto">
                {action}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
