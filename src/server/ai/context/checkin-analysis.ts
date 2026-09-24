import "server-only";
import { SourceRegistry } from "@/server/ai/sources";
import { untrustedBlock } from "@/server/ai/untrusted";
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
import type { CheckinItem, ClientStatus, NoteItem } from "@/types/domain";
import { renderCheckinForPrompt, summarizeCheckin, summarizeNote, type CheckinSummary, type NoteSummary } from "./summaries";

/** Minimizzazione: bastano pochi check-in precedenti e poche note recenti per un confronto utile. */
export const ANALYSIS_PREVIOUS_CHECKINS = 3;
export const ANALYSIS_RECENT_NOTES = 3;

export type CheckinAnalysisContext = {
  today: string;
  client: { status: ClientStatus; startedOn: string; goal: string | null };
  current: CheckinSummary;
  previous: CheckinSummary[];
  notes: NoteSummary[];
};

type CheckinAnalysisInput = {
  today: string;
  timezone: string;
  client: { status: ClientStatus; startedOn: string; goal: string | null };
  checkin: CheckinItem;
  previousCheckins: CheckinItem[];
  notes: NoteItem[];
};

/**
 * Costruisce ESPLICITAMENTE il contesto dell'analisi: niente nome della cliente
 * (non serve per analizzare), niente ID interni, storico limitato.
 */
export function buildCheckinAnalysisPrompt(input: CheckinAnalysisInput): {
  context: CheckinAnalysisContext;
  userContent: string;
} {
  const sources = new SourceRegistry();
  const context: CheckinAnalysisContext = {
    today: input.today,
    client: input.client,
    current: summarizeCheckin(input.checkin, sources, input.timezone),
    previous: input.previousCheckins
      .slice(0, ANALYSIS_PREVIOUS_CHECKINS)
      .map((checkin) => summarizeCheckin(checkin, sources, input.timezone)),
    notes: input.notes.slice(0, ANALYSIS_RECENT_NOTES).map((note) => summarizeNote(note, sources, input.timezone)),
  };

  const sections = [
    "<contesto_applicativo>",
    "Richiesta: analisi di un check-in settimanale inviato dalla cliente.",
    `Data di oggi: ${context.today}`,
    `Stato del percorso: ${CLIENT_STATUS_LABELS[context.client.status]}, iniziato il ${context.client.startedOn}`,
    context.client.goal ? untrustedBlock("obiettivo del percorso", context.client.goal) : "Obiettivo: non indicato",
    "</contesto_applicativo>",
    "",
    renderCheckinForPrompt(context.current, "check_in_da_analizzare"),
    "",
    "<storico_check_in>",
    ...(context.previous.length > 0
      ? context.previous.map((summary) => renderCheckinForPrompt(summary, "check_in_precedente"))
      : ["Nessun check-in precedente disponibile."]),
    "</storico_check_in>",
    "",
    "<note_della_coach>",
    ...(context.notes.length > 0
      ? context.notes.map(
          (note) =>
            `<nota rif="${note.ref}" data="${note.writtenOn}" autrice="${note.author}"><dati_non_affidabili campo="nota">${note.text}</dati_non_affidabili></nota>`,
        )
      : ["Nessuna nota disponibile."]),
    "</note_della_coach>",
    "",
    "Analizza il check-in da analizzare seguendo le regole di sistema e rispondi solo con il JSON richiesto.",
  ];

  return { context, userContent: sections.join("\n") };
}
