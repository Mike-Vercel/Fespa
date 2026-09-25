import { addDays } from "./dates";

/**
 * Andamenti delle KPI della dashboard (le piccole linee nelle card), calcolati dai dati reali.
 * Funzioni pure: ricevono giorni di calendario ("2026-09-24") già nel fuso della coach.
 */

/** Ampiezza delle linee di andamento. */
export const TREND_DAYS = 14;
/** Periodo su cui si misura la crescita delle clienti attive ("+12%"). */
export const GROWTH_WINDOW_DAYS = 30;

/** Gli ultimi `count` giorni fino a `today` compreso, dal più vecchio. */
export function lastDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - (count - 1)));
}

/** Quanti eventi cadono in ciascun giorno; gli eventi fuori dall'intervallo si ignorano. */
export function countPerDay(eventDays: string[], days: string[]): number[] {
  const counts = new Map(days.map((day) => [day, 0]));
  for (const day of eventDays) {
    const current = counts.get(day);
    if (current !== undefined) counts.set(day, current + 1);
  }
  return days.map((day) => counts.get(day) ?? 0);
}

/** Clienti attive oggi che, giorno per giorno, avevano già iniziato il percorso. */
export function activeClientsPerDay(startDays: string[], days: string[]): number[] {
  return days.map((day) => startDays.filter((start) => start <= day).length);
}

/**
 * Crescita delle clienti attive rispetto a `windowDays` giorni fa, in percentuale intera.
 * Si basa sulla data di inizio del percorso di chi è attiva oggi. Null se allora non ce n'erano.
 */
export function growthPercent(startDays: string[], today: string, windowDays: number): number | null {
  const before = startDays.filter((start) => start <= addDays(today, -windowDays)).length;
  if (before === 0) {
    return null;
  }
  return Math.round(((startDays.length - before) / before) * 100);
}

/** Somma giorno per giorno di più serie della stessa lunghezza. */
export function sumSeries(...series: number[][]): number[] {
  return series[0].map((_, index) => series.reduce((sum, values) => sum + (values[index] ?? 0), 0));
}
