"use client";

import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/states";
import { groupPendingFollowups, type DueBucket } from "@/domain/followups";
import { CompleteFollowupButton, FollowupSecondaryAction } from "@/features/followups/followup-actions";
import { FollowupRow } from "@/features/followups/followup-row";
import type { FollowupItem } from "@/types/domain";
import { cn } from "@/lib/cn";

const PENDING_SECTIONS: Array<{ bucket: DueBucket; title: string; emptyText: string }> = [
  { bucket: "overdue", title: "Scaduti", emptyText: "Nessun follow-up scaduto." },
  { bucket: "today", title: "Oggi", emptyText: "Nessun follow-up in programma per oggi." },
  { bucket: "upcoming", title: "Prossimi", emptyText: "Nessun follow-up in programma nei prossimi giorni." },
];

type FollowupsViewProps = {
  pending: FollowupItem[];
  recentlyClosed: FollowupItem[];
  today: string;
};

function FollowupList({ followups, today, closed = false }: { followups: FollowupItem[]; today: string; closed?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {followups.map((followup) => (
        <li key={followup.id} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <FollowupRow
              followup={followup}
              today={today}
              action={closed ? undefined : <CompleteFollowupButton followupId={followup.id} title={followup.title} />}
            />
          </div>
          <div className="pt-2.5">
            <FollowupSecondaryAction followupId={followup.id} status={followup.status} />
          </div>
        </li>
      ))}
    </ul>
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
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-raised">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3 sm:px-5">
        <div>
          <p className="font-serif text-xl capitalize text-ink">{monthLabel}</p>
          <p className="text-xs text-ink-3">{pending.length} follow-up in programma</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-hover hover:text-ink" aria-label="Mese precedente">
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => setMonth(today.slice(0, 7))} className="h-9 rounded-md px-2.5 text-xs font-medium text-ink-2 hover:bg-hover hover:text-ink">
            Oggi
          </button>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-hover hover:text-ink" aria-label="Mese successivo">
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line bg-sunken/60">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
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
            <div key={day} className={cn("min-h-28 border-b border-r border-line p-1.5 sm:min-h-32 sm:p-2", !isCurrentMonth && "bg-sunken/45") }>
              <div className="flex justify-end">
                <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", isToday && "bg-accent font-semibold text-on-ink", !isCurrentMonth && "text-ink-3")}>
                  {Number(day.slice(8))}
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {dayItems.slice(0, 3).map((followup) => (
                  <div key={followup.id} className={cn("group rounded-md border px-1.5 py-1", day < today ? "border-rust/25 bg-rust-soft/55" : day === today ? "border-amber/30 bg-amber-soft/60" : "border-accent/20 bg-accent-soft/55")}>
                    <div className="flex items-start gap-1">
                      <CompleteFollowupButton followupId={followup.id} title={followup.title} />
                      <p className="min-w-0 truncate text-[11px] font-medium text-ink" title={followup.title}>{followup.title}</p>
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
  );
}

export function FollowupsView({ pending, recentlyClosed, today }: FollowupsViewProps) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const groups = groupPendingFollowups(pending, today);

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-2">Scegli il modo più comodo per organizzare i tuoi promemoria.</p>
        <div className="inline-flex self-start rounded-md border border-line bg-sunken p-1" aria-label="Vista follow-up">
          <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={cn("inline-flex h-9 items-center gap-2 rounded px-3 text-[13px] font-medium", view === "list" ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}>
            <List aria-hidden="true" className="size-4" />
            Lista
          </button>
          <button type="button" onClick={() => setView("calendar")} aria-pressed={view === "calendar"} className={cn("inline-flex h-9 items-center gap-2 rounded px-3 text-[13px] font-medium", view === "calendar" ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}>
            <CalendarDays aria-hidden="true" className="size-4" />
            Calendario
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        pending.length > 0 ? <CalendarView pending={pending} today={today} /> : <EmptyState icon={CalendarDays} title="Calendario vuoto" description="Non ci sono follow-up aperti da organizzare." />
      ) : pending.length === 0 && recentlyClosed.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nessun follow-up" description="Crea il primo promemoria: una chiamata, un messaggio o una verifica da fare con una cliente." />
      ) : (
        <>
          {PENDING_SECTIONS.map(({ bucket, title, emptyText }) => (
            <section key={bucket} aria-labelledby={`followups-${bucket}`} className={bucket === "overdue" ? "overflow-hidden rounded-lg border border-rust/30 border-t-4 border-t-rust bg-surface shadow-raised" : bucket === "today" ? "overflow-hidden rounded-lg border border-amber/30 border-t-4 border-t-amber bg-surface shadow-raised" : "overflow-hidden rounded-lg border border-line border-t-4 border-t-accent bg-surface shadow-raised"}>
              <div className="px-4 pt-4 sm:px-5">
                <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
                  <h2 id={`followups-${bucket}`} className="font-serif text-xl text-ink">{title} <span className="font-sans text-sm text-ink-3">{groups[bucket].length}</span></h2>
                </div>
              </div>
              {groups[bucket].length > 0 ? <div className="px-4 sm:px-5"><FollowupList followups={groups[bucket]} today={today} /></div> : <p className="px-4 py-4 text-sm text-ink-3 sm:px-5">{emptyText}</p>}
            </section>
          ))}
          {recentlyClosed.length > 0 ? <section aria-labelledby="followups-closed" className="overflow-hidden rounded-lg border border-line bg-surface shadow-raised"><div className="px-4 pt-4 sm:px-5"><div className="border-b border-line pb-2.5"><h2 id="followups-closed" className="font-serif text-xl text-ink">Chiusi di recente</h2><p className="mt-0.5 text-[13px] text-ink-3">Completati o annullati</p></div></div><div className="px-4 sm:px-5"><FollowupList followups={recentlyClosed} today={today} closed /></div></section> : null}
        </>
      )}
    </div>
  );
}