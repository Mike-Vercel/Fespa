/**
 * Date di calendario ("YYYY-MM-DD") e fusi orari, senza librerie esterne.
 *
 * Perché serve: "oggi" per una coach a Roma non coincide con "oggi" in UTC
 * tra mezzanotte e le 2 di notte. Tutti i confronti di scadenza passano da qui.
 */

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

function zonedParts(instant: Date, timezone: string) {
  const parts = partsFormatter(timezone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: read("year"), month: read("month"), day: read("day"), hour: Number(read("hour")) };
}

/** Giorno di calendario di un istante nel fuso indicato, es. "2026-09-24". */
export function calendarDateIn(timezone: string, instant: Date | string = new Date()): string {
  const { year, month, day } = zonedParts(new Date(instant), timezone);
  return `${year}-${month}-${day}`;
}

/** Ora del giorno (0–23) nel fuso indicato. */
export function hourIn(timezone: string, instant: Date = new Date()): number {
  return zonedParts(instant, timezone).hour;
}

function toUtcMidnight(calendarDate: string): number {
  return Date.parse(`${calendarDate}T00:00:00Z`);
}

export function addDays(calendarDate: string, days: number): string {
  return new Date(toUtcMidnight(calendarDate) + days * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

/** Giorni di calendario da `from` a `to` (positivo se `to` è nel futuro). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MILLISECONDS_PER_DAY);
}

export function hoursBetween(from: Date | string, to: Date | string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / MILLISECONDS_PER_HOUR;
}

/** Anni compiuti alla data indicata (entrambe "YYYY-MM-DD"). */
export function ageOn(birthDate: string, onDate: string): number {
  const years = Number(onDate.slice(0, 4)) - Number(birthDate.slice(0, 4));
  // "MM-DD" si confronta come stringa: dice se il compleanno di quell'anno è già passato.
  return onDate.slice(5) >= birthDate.slice(5) ? years : years - 1;
}
