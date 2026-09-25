"use client";

import { CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, List, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/states";
import { groupPendingFollowups, type DueBucket } from "@/domain/followups";
import { CompleteFollowupButton, FollowupSecondaryAction } from "@/features/followups/followup-actions";
import { FollowupRow } from "@/features/followups/followup-row";
import { cn } from "@/lib/cn";
import type { FollowupItem } from "@/types/domain";

/** Micro-accenti per scadenza (tacca superiore, icona, contatore): il pannello resta bianco caldo. */
const PENDING_SECTIONS: Array<{ bucket: DueBucket; title: string; emptyText: string; accent: string; icon: string; count: string }> = [
  {
    bucket: "overdue",
    title: "Scaduti",
    emptyText: "Nessun follow-up scaduto: sei in pari.",
    accent: "border-t-urgent",
    icon: "text-urgent",
    count: "bg-urgent-soft text-urgent",
  },
  {
    bucket: "today",
    title: "Oggi",
    emptyText: "Nessun follow-up in programma per oggi.",
    accent: "border-t-kpi-orange-ink",
    icon: "text-kpi-orange-ink",
    count: "bg-amber-soft text-amber",
  },
  {
    bucket: "upcoming",
    title: "Nei prossimi giorni",
    emptyText: "Nessun follow-up in programma nei prossimi giorni.",
    accent: "border-t-kpi-green-ink",
    icon: "text-kpi-green-ink",
    count: "bg-kpi-green text-accent-strong",
  },
];

const PANEL = "overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.2)]";

type FollowupsViewProps = {
  pending: FollowupItem[];
  recentlyClosed: FollowupItem[];
  today: string;
  /** Il pulsante "Nuovo follow-up" (dialog reso dal server con le clienti selezionabili). */
  newFollowupAction: ReactNode;
};

function FollowupList({ followups, today, closed = false }: { followups: FollowupItem[]; today: string; closed?: boolean }) {
  return (
    <ul className="divide-y divide-line/80">
      {followups.map((followup) => (
        <li key={followup.id}>
          <FollowupRow
            followup={followup}
            today={today}
            dueVariant="badge"
            action={closed ? undefined : <CompleteFollowupButton followupId={followup.id} title={followup.title} />}
            trailing={<FollowupSecondaryAction followupId={followup.id} status={followup.status} />}
          />
        </li>
      ))}
    </ul>
  );
}

function SectionPanel({
  id,
  title,
  count,
  icon: Icon,
  accent,
  iconTone,
  countTone,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  icon: LucideIcon;
  accent: string;
  iconTone: string;
  countTone: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn(PANEL, "border-t-[3px]", accent)}>
      <div className="px-5 lg:px-6">
        <div className="flex items-center gap-3 border-b border-line/80 py-4">
          <Icon aria-hidden="true" className={cn("size-5 shrink-0", iconTone)} strokeWidth={1.7} />
          <h2 id={id} className="text-[18px] font-semibold text-ink">
            {title}
          </h2>
          {count !== undefined ? (
            <span className={cn("tabular inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[14px] font-semibold", countTone)}>
              {count}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function monthStart(month: string): Date {
  return new Date(`${month}-01T00:00:00Z`);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, amount: number): string {
  const date = monthStart(month);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return monthKey(date);
}

function calendarDays(month: string): string[] {
  const start = monthStart(month);
  const mondayOffset = (start.getUTCDay() + 6) % 7;
  const first = new Date(start);
  first.setUTCDate(first.getUTCDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setUTCDate(first.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

function CalendarView({ pending, today }: { pending: FollowupItem[]; today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const followupsByDate = new Map<string, FollowupItem[]>();
  for (const followup of pending) {
    const items = followupsByDate.get(followup.dueOn) ?? [];
    items.push(followup);
    followupsByDate.set(followup.dueOn, items);
  }

  const days = calendarDays(month);
  const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart(month));

  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between border-b border-line/80 px-5 py-4 lg:px-6">
        <div>
          <p className="font-serif text-[22px] capitalize leading-tight text-ink">{monthLabel}</p>
          <p className="mt-0.5 text-[13px] text-ink-3">{pending.length} follow-up in programma</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken hover:text-ink" aria-label="Mese precedente">
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => setMonth(today.slice(0, 7))} className="h-9 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-sunken hover:text-ink">
            Oggi
          </button>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken hover:text-ink" aria-label="Mese successivo">
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {/* Sette colonne non stanno su un telefono: il calendario scorre dentro il suo riquadro. */}
      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 border-b border-line/80 bg-sunken/50">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayItems = followupsByDate.get(day) ?? [];
              const isCurrentMonth = day.startsWith(month);
              const isToday = day === today;
              return (
                <div key={day} className={cn("min-h-28 border-b border-r border-line/70 p-1.5 sm:min-h-32 sm:p-2", !isCurrentMonth && "bg-sunken/40")}>
                  <div className="flex justify-end">
                    <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", isToday && "bg-brand font-semibold text-white", !isCurrentMonth && "text-ink-3")}>
                      {Number(day.slice(8))}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayItems.slice(0, 3).map((followup) => (
                      <div
                        key={followup.id}
                        className={cn(
                          "rounded-md border px-1.5 py-1",
                          day < today ? "border-urgent/20 bg-urgent-soft/60" : day === today ? "border-amber/25 bg-amber-soft/60" : "border-kpi-green-ink/20 bg-kpi-green/60",
                        )}
                      >
                        <div className="flex items-start gap-1">
                          <CompleteFollowupButton followupId={followup.id} title={followup.title} />
                          <p className="min-w-0 truncate text-[11px] font-medium text-ink" title={followup.title}>
                            {followup.title}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate pl-6 text-[10px] text-ink-3">{followup.clientName}</p>
                      </div>
                    ))}
                    {dayItems.length > 3 ? <p className="px-1 text-[10px] font-medium text-ink-3">+ altri {dayItems.length - 3}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const VIEW_BUTTON =
  "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors sm:flex-none";

export function FollowupsView({ pending, recentlyClosed, today, newFollowupAction }: FollowupsViewProps) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const groups = groupPendingFollowups(pending, today);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        variant="display"
        title="Follow-up"
        description={
          <>
            <p>I promemoria operativi verso le tue clienti, ordinati per scadenza.</p>
            <p className="mt-2 text-ink-3">Scegli il modo più comodo per organizzare i tuoi promemoria.</p>
          </>
        }
        actions={
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:items-end">
            <div className="sm:self-end">{newFollowupAction}</div>
            <div role="group" aria-label="Vista dei follow-up" className="flex rounded-xl border border-line/90 bg-sunken/80 p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={cn(VIEW_BUTTON, view === "list" ? "bg-white text-ink shadow-[0_1px_3px_rgb(31_29_26/0.1)]" : "text-ink-2 hover:text-ink")}
              >
                <List aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
                className={cn(VIEW_BUTTON, view === "calendar" ? "bg-white text-ink shadow-[0_1px_3px_rgb(31_29_26/0.1)]" : "text-ink-2 hover:text-ink")}
              >
                <CalendarDays aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
                Calendario
              </button>
            </div>
          </div>
        }
      />

      {view === "calendar" ? (
        pending.length > 0 ? (
          <CalendarView pending={pending} today={today} />
        ) : (
          <div className={PANEL}>
            <EmptyState icon={CalendarDays} title="Calendario vuoto" description="Non ci sono follow-up aperti da organizzare." />
          </div>
        )
      ) : pending.length === 0 && recentlyClosed.length === 0 ? (
        <div className={PANEL}>
          <EmptyState
            icon={CalendarCheck2}
            title="Nessun follow-up"
            description="Crea il primo promemoria: una chiamata, un messaggio o una verifica da fare con una cliente."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {PENDING_SECTIONS.map(({ bucket, title, emptyText, accent, icon, count }) => (
            <SectionPanel
              key={bucket}
              id={`followups-${bucket}`}
              title={title}
              count={groups[bucket].length}
              icon={CalendarDays}
              accent={accent}
              iconTone={icon}
              countTone={count}
            >
              {groups[bucket].length > 0 ? (
                <FollowupList followups={groups[bucket]} today={today} />
              ) : (
                <p className="py-4 text-[14px] text-ink-3">{emptyText}</p>
              )}
            </SectionPanel>
          ))}
          {recentlyClosed.length > 0 ? (
            <SectionPanel
              id="followups-closed"
              title="Chiusi di recente"
              icon={CalendarCheck2}
              accent="border-t-line-strong"
              iconTone="text-ink-3"
              countTone=""
            >
              <FollowupList followups={recentlyClosed} today={today} closed />
            </SectionPanel>
          ) : null}
        </div>
      )}
    </div>
  );
}
