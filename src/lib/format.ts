import { calendarDateIn, daysBetween } from "@/domain/dates";

/**
 * Formattazione in italiano con Intl (nessuna libreria di date).
 * I testi relativi ("ieri", "2 ore fa") dipendono da "adesso": vanno calcolati sul server,
 * al momento del render, e passati ai componenti già pronti.
 */

const LOCALE = "it-IT";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAYS_SHOWN_AS_RELATIVE = 6;

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1);
}

/** Data di calendario ("2026-09-24") → "24 set" o "24 set 2026". Nessuno spostamento di fuso. */
export function formatCalendarDate(calendarDate: string, options: { withYear?: boolean; withWeekday?: boolean } = {}) {
  const date = new Date(`${calendarDate}T12:00:00Z`);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: options.withYear ? "numeric" : undefined,
    weekday: options.withWeekday ? "long" : undefined,
  }).format(date);
}

/** "Giovedì 24 settembre" per le intestazioni. */
export function formatLongDate(calendarDate: string): string {
  const date = new Date(`${calendarDate}T12:00:00Z`);
  return capitalize(
    new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(date),
  );
}

/** Istante → "24 set, 18:30" nel fuso della coach. */
export function formatDateTime(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant));
}

/** Scadenza rispetto a oggi: "oggi", "domani", "ieri", "tra 3 giorni" o la data. */
export function formatRelativeDay(calendarDate: string, today: string): string {
  const days = daysBetween(today, calendarDate);
  if (Math.abs(days) <= DAYS_SHOWN_AS_RELATIVE) {
    return relativeFormatter.format(days, "day");
  }
  return formatCalendarDate(calendarDate, { withYear: calendarDate.slice(0, 4) !== today.slice(0, 4) });
}

/** Istante passato rispetto ad adesso: "adesso", "20 minuti fa", "3 ore fa", "ieri", "4 giorni fa", data. */
export function formatRelativeInstant(instant: string, now: Date, timezone: string): string {
  const elapsed = now.getTime() - new Date(instant).getTime();
  if (elapsed < MINUTE_MS) {
    return "adesso";
  }
  if (elapsed < HOUR_MS) {
    return relativeFormatter.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  }

  const days = daysBetween(calendarDateIn(timezone, instant), calendarDateIn(timezone, now));
  if (days === 0) {
    return relativeFormatter.format(-Math.floor(elapsed / HOUR_MS), "hour");
  }
  if (days <= DAYS_SHOWN_AS_RELATIVE) {
    return relativeFormatter.format(-days, "day");
  }
  const instantDay = calendarDateIn(timezone, instant);
  return formatCalendarDate(instantDay, { withYear: instantDay.slice(0, 4) !== calendarDateIn(timezone, now).slice(0, 4) });
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
