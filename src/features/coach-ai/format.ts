import { calendarDateIn, daysBetween } from "@/domain/dates";
import { formatCalendarDate } from "@/lib/format";

/*
 * Orari di Coach AI, sempre nel fuso dell'app (passato dal server).
 * Lista chat: ora per l'ultima settimana, data per le più vecchie (come nel design di riferimento).
 */

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function timeOf(instant: string, timezone: string): string {
  let formatter = timeFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("it-IT", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
    timeFormatters.set(timezone, formatter);
  }
  return formatter.format(new Date(instant));
}

function daysAgo(instant: string, now: Date, timezone: string): number {
  return daysBetween(calendarDateIn(timezone, instant), calendarDateIn(timezone, now));
}

export function formatListTime(instant: string, now: Date, timezone: string): string {
  return daysAgo(instant, now, timezone) <= 7 ? timeOf(instant, timezone) : formatCalendarDate(calendarDateIn(timezone, instant));
}

export function formatMessageTime(instant: string, now: Date, timezone: string): string {
  return daysAgo(instant, now, timezone) === 0
    ? timeOf(instant, timezone)
    : `${formatCalendarDate(calendarDateIn(timezone, instant))}, ${timeOf(instant, timezone)}`;
}

export function formatUpdatedAt(instant: string, now: Date, timezone: string): string {
  const days = daysAgo(instant, now, timezone);
  const time = timeOf(instant, timezone);
  if (days === 0) return `oggi alle ${time}`;
  if (days === 1) return `ieri alle ${time}`;
  return `il ${formatCalendarDate(calendarDateIn(timezone, instant))} alle ${time}`;
}
