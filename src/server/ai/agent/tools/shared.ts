import "server-only";
import { z } from "zod";
import { calendarDateIn, daysBetween } from "@/domain/dates";
import { STAFF_ROLES } from "@/domain/roles";
import { sanitizeUntrustedText } from "@/server/ai/untrusted";
import { capitalize, formatLongDate, formatRelativeDay } from "@/lib/format";
import type { EntityLink } from "@/types/coach-ai";
import type { CheckinItem, CoachRole, FollowupItem, NoteItem } from "@/types/domain";
import { uuidSchema } from "@/validation/common";

/*
 * Pezzi comuni ai tool di Coach AI: ruoli, link, schemi e rappresentazioni MINIME per il modello.
 * Niente campi superflui; i testi scritti da clienti o coach sono neutralizzati (sanitizeUntrustedText)
 * e il system prompt li tratta come dati, mai come istruzioni.
 */

export const ALL_STAFF: readonly CoachRole[] = STAFF_ROLES;
export const ADMINS: readonly CoachRole[] = ["admin", "super_admin"];
export const SUPER_ADMINS: readonly CoachRole[] = ["super_admin"];

/**
 * Identificativo validato con `refine`: il controllo resta sul server, e il JSON Schema inviato
 * al modello non ripete a ogni campo la lunga espressione regolare degli UUID (token sprecati).
 */
export const idSchema = (description: string) =>
  z
    .string()
    .refine((value) => uuidSchema.safeParse(value).success, { error: "Identificativo non valido." })
    .describe(description);

export const isoDateSchema = (description: string) =>
  z
    .string()
    .refine((value) => z.iso.date().safeParse(value).success, { error: "Data non valida: usa il formato YYYY-MM-DD." })
    .describe(description);

export const clientLink = (clientId: string, label: string, tab?: "checkins" | "notes" | "followups"): EntityLink => ({
  label,
  href: tab ? `/clients/${clientId}?tab=${tab}` : `/clients/${clientId}`,
});

const TEXT_MAX_LENGTH = 800;

export function untrusted(text: string | null | undefined, maxLength = TEXT_MAX_LENGTH): string | null {
  const sanitized = text ? sanitizeUntrustedText(text, maxLength) : "";
  return sanitized === "" ? null : sanitized;
}

/** Nome della persona come dato: neutralizzato anche lui (un nome può contenere di tutto). */
export function safeName(fullName: string): string {
  return sanitizeUntrustedText(fullName, 120);
}

export function checkinForModel(checkin: CheckinItem, timezone: string) {
  const { answers } = checkin;
  return {
    checkinId: checkin.id,
    submittedOn: calendarDateIn(timezone, checkin.submittedAt),
    reviewed: checkin.reviewedAt !== null,
    hasCoachReply: checkin.coachReply !== null,
    scores1to5: answers
      ? {
          energy: answers.energy,
          sleepQuality: answers.sleepQuality,
          stressHighIsWorse: answers.stress,
          nutritionAdherence: answers.nutritionAdherence,
        }
      : null,
    training: answers ? { done: answers.trainingSessionsDone, planned: answers.trainingSessionsPlanned } : null,
    wins: untrusted(answers?.wins),
    challenges: untrusted(answers?.challenges),
    questionsForCoach: untrusted(answers?.questionsForCoach),
    coachReply: untrusted(checkin.coachReply, 400),
  };
}

export function followupForModel(followup: FollowupItem, today: string) {
  return {
    followupId: followup.id,
    clientId: followup.clientId,
    clientName: safeName(followup.clientName),
    title: untrusted(followup.title, 160),
    description: untrusted(followup.description, 400),
    dueOn: followup.dueOn,
    daysFromToday: daysBetween(today, followup.dueOn),
    status: followup.status,
  };
}

export function noteForModel(note: NoteItem, timezone: string) {
  return {
    noteId: note.id,
    writtenOn: calendarDateIn(timezone, note.createdAt),
    author: note.isOwn ? "utente corrente" : safeName(note.authorName),
    editableByCurrentUser: note.isOwn,
    text: untrusted(note.content, 600),
  };
}

/** "Venerdì 2 ottobre (tra 5 giorni)" per le anteprime; oltre la settimana basta la data. */
export function describeDueDate(dueOn: string, today: string): string {
  const days = Math.abs(daysBetween(today, dueOn));
  return days <= 6 ? `${formatLongDate(dueOn)} (${formatRelativeDay(dueOn, today)})` : formatLongDate(dueOn);
}

export function describeCheckinDay(checkin: CheckinItem, timezone: string, today: string): string {
  const day = calendarDateIn(timezone, checkin.submittedAt);
  return `Inviato ${formatRelativeDay(day, today)} · ${capitalize(formatLongDate(day))}`;
}

export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
