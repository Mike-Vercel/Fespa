import { calendarDateIn, daysBetween } from "./dates";

/*
 * Regole pure di Coach AI (nessun I/O): raggruppamento delle chat, titolo automatico,
 * anteprime e confronto del testo di conferma. Testate in tests/domain/coach-ai.test.ts.
 */

export type ConversationGroupKey = "today" | "yesterday" | "last7" | "older";

export const CONVERSATION_GROUP_LABELS: Record<ConversationGroupKey, string> = {
  today: "Oggi",
  yesterday: "Ieri",
  last7: "7 giorni fa",
  older: "Più vecchie",
};

const GROUP_ORDER: readonly ConversationGroupKey[] = ["today", "yesterday", "last7", "older"];
const LAST_WEEK_DAYS = 7;

/** Gruppo della barra delle chat in base all'ultimo aggiornamento, nel fuso della coach. */
export function conversationGroupOf(updatedAt: string, now: Date, timezone: string): ConversationGroupKey {
  const days = daysBetween(calendarDateIn(timezone, updatedAt), calendarDateIn(timezone, now));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= LAST_WEEK_DAYS) return "last7";
  return "older";
}

/** Gruppi non vuoti, nell'ordine Oggi → Più vecchie. L'ordine interno resta quello ricevuto (updated_at desc). */
export function groupConversations<T extends { updatedAt: string }>(
  conversations: T[],
  now: Date,
  timezone: string,
): Array<{ key: ConversationGroupKey; label: string; items: T[] }> {
  const buckets = new Map<ConversationGroupKey, T[]>();
  for (const conversation of conversations) {
    const key = conversationGroupOf(conversation.updatedAt, now, timezone);
    buckets.set(key, [...(buckets.get(key) ?? []), conversation]);
  }
  return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: CONVERSATION_GROUP_LABELS[key],
    items: buckets.get(key) ?? [],
  }));
}

export const DEFAULT_CONVERSATION_TITLE = "Nuova chat";
const TITLE_MAX_LENGTH = 60;
const PREVIEW_MAX_LENGTH = 140;

/** Testo su una riga, senza la sintassi markdown più comune. */
function plainText(text: string): string {
  return text
    .replace(/[`*_#>|~]/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

/** Titolo automatico dal primo messaggio (modificabile poi dalla coach). */
export function titleFromMessage(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const plain = plainText(firstLine);
  if (plain === "") return DEFAULT_CONVERSATION_TITLE;
  const title = truncateAtWord(plain, TITLE_MAX_LENGTH);
  return title.charAt(0).toLocaleUpperCase("it-IT") + title.slice(1);
}

/** Anteprima di una riga per la lista delle chat. */
export function previewFromText(text: string): string | null {
  const plain = plainText(text);
  return plain === "" ? null : truncateAtWord(plain, PREVIEW_MAX_LENGTH);
}

/** Confronto del testo di conferma: niente differenze per maiuscole, spazi o forme Unicode equivalenti. */
export function normalizeConfirmationText(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("it-IT");
}

export function confirmationTextMatches(typed: string | undefined, expected: string): boolean {
  return typed !== undefined && normalizeConfirmationText(typed) === normalizeConfirmationText(expected);
}

/** "1,2 MB", "340 KB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`;
}

export type AutomationKind = { trigger: "new_checkin"; action: "generate_reply_draft" };

/** Cosa fa una regola, in parole semplici (stesso testo in chat, nell'anteprima e nel pannello). */
export const AUTOMATION_STEPS: Record<AutomationKind["trigger"], { title: string; steps: string[] }> = {
  new_checkin: {
    title: "Bozza di risposta a ogni nuovo check-in",
    steps: [
      "Quando arriva un nuovo check-in di una cliente che segui",
      "analizzo il check-in e recupero il contesto recente",
      "preparo una bozza di risposta",
      "NON invio nulla: la bozza resta pronta per la tua revisione",
    ],
  },
};
