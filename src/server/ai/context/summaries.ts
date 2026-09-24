import "server-only";
import { calendarDateIn } from "@/domain/dates";
import type { SourceRegistry } from "@/server/ai/sources";
import { sanitizeUntrustedText } from "@/server/ai/untrusted";
import type { CheckinItem, FollowupItem, FollowupStatus, NoteItem } from "@/types/domain";

/*
 * Rappresentazioni MINIME dei dati destinate al modello (prompt e risultati dei tool).
 * Niente UUID, niente cognomi, niente campi non necessari: solo ciò che serve a ragionare.
 * I testi liberi sono già neutralizzati (vedi untrusted.ts).
 */

const NOTE_MAX_LENGTH = 600;

export type CheckinSummary = {
  ref: string;
  submittedOn: string;
  reviewed: boolean;
  scores: { energy: number; sleepQuality: number; stress: number; nutritionAdherence: number } | null;
  training: { done: number; planned: number } | null;
  wins: string | null;
  challenges: string | null;
  questionsForCoach: string | null;
};

export type NoteSummary = {
  ref: string;
  writtenOn: string;
  author: "coach corrente" | "collega";
  text: string;
};

export type FollowupSummary = {
  ref: string;
  title: string;
  description: string | null;
  dueOn: string;
  status: FollowupStatus;
  completedOn: string | null;
};

function optionalText(text: string | null | undefined): string | null {
  const sanitized = text ? sanitizeUntrustedText(text) : "";
  return sanitized === "" ? null : sanitized;
}

export function summarizeCheckin(checkin: CheckinItem, sources: SourceRegistry, timezone: string): CheckinSummary {
  const submittedOn = calendarDateIn(timezone, checkin.submittedAt);
  const ref = sources.register("checkin", checkin.id, `Check-in del ${submittedOn}`);
  const { answers } = checkin;
  return {
    ref,
    submittedOn,
    reviewed: checkin.reviewedAt !== null,
    scores: answers
      ? {
          energy: answers.energy,
          sleepQuality: answers.sleepQuality,
          stress: answers.stress,
          nutritionAdherence: answers.nutritionAdherence,
        }
      : null,
    training: answers ? { done: answers.trainingSessionsDone, planned: answers.trainingSessionsPlanned } : null,
    wins: optionalText(answers?.wins),
    challenges: optionalText(answers?.challenges),
    questionsForCoach: optionalText(answers?.questionsForCoach),
  };
}

export function summarizeNote(note: NoteItem, sources: SourceRegistry, timezone: string): NoteSummary {
  const writtenOn = calendarDateIn(timezone, note.createdAt);
  return {
    ref: sources.register("note", note.id, `Nota del ${writtenOn}`),
    writtenOn,
    author: note.isOwn ? "coach corrente" : "collega",
    text: sanitizeUntrustedText(note.content, NOTE_MAX_LENGTH),
  };
}

export function summarizeFollowup(followup: FollowupItem, sources: SourceRegistry, timezone: string): FollowupSummary {
  return {
    ref: sources.register("followup", followup.id, `Follow-up: ${followup.title}`),
    title: sanitizeUntrustedText(followup.title, 160),
    description: optionalText(followup.description),
    dueOn: followup.dueOn,
    status: followup.status,
    completedOn: followup.completedAt ? calendarDateIn(timezone, followup.completedAt) : null,
  };
}

/** Versione testuale di un check-in per i prompt: punteggi come dati strutturati, testi come dati non affidabili. */
export function renderCheckinForPrompt(summary: CheckinSummary, tag: string): string {
  const lines = [`<${tag} rif="${summary.ref}" inviato="${summary.submittedOn}" revisionato="${summary.reviewed ? "sì" : "no"}">`];
  if (summary.scores && summary.training) {
    lines.push(
      `Punteggi 1-5: energia ${summary.scores.energy}, sonno ${summary.scores.sleepQuality}, stress ${summary.scores.stress} (alto = più stress), aderenza al piano alimentare ${summary.scores.nutritionAdherence}`,
      `Allenamenti: ${summary.training.done} fatti su ${summary.training.planned} previsti`,
    );
  } else {
    lines.push("Risposte in formato non riconosciuto: nessun dato strutturato disponibile.");
  }
  const texts: Array<[string, string | null]> = [
    ["cosa è andato bene", summary.wins],
    ["difficoltà", summary.challenges],
    ["domande per la coach", summary.questionsForCoach],
  ];
  for (const [field, text] of texts) {
    if (text) lines.push(`<dati_non_affidabili campo="${field}">${text}</dati_non_affidabili>`);
  }
  lines.push(`</${tag}>`);
  return lines.join("\n");
}
