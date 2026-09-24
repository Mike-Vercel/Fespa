import "server-only";
import { z } from "zod";
import { calendarDateIn } from "@/domain/dates";
import { firstNameOf } from "@/domain/greeting";
import { summarizeCheckin, summarizeFollowup, summarizeNote } from "@/server/ai/context/summaries";
import { sanitizeUntrustedText } from "@/server/ai/untrusted";
import { NotFoundError } from "@/server/errors";
import { listCheckinsForClient } from "@/server/repositories/checkins";
import { findClientOverview } from "@/server/repositories/clients";
import { listFollowupsForClient } from "@/server/repositories/followups";
import { listNotesForClient } from "@/server/repositories/notes";
import { defineReadTool } from "./types";

/*
 * Tool di sola lettura del Coach Copilot.
 * Nessuno accetta un clientId: lavorano sempre sulla cliente fissata dal server (context.clientId)
 * e con il client Supabase della coach, quindi anche la RLS limita cosa possono leggere.
 * I limiti sugli input contengono quanti dati finiscono al provider (minimizzazione).
 */

const MAX_PREVIOUS_CHECKINS = 6;
const MAX_NOTES = 10;
const MAX_FOLLOWUPS = 10;

export const getClientProfileTool = defineReadTool({
  name: "get_client_profile",
  description: "Profilo essenziale della cliente selezionata: nome proprio, stato e inizio del percorso, obiettivo.",
  inputSchema: z.object({}).strict(),
  execute: async (_input, context) => {
    const client = await findClientOverview(context.auth.db, context.clientId);
    if (!client) throw new NotFoundError("Cliente non trovata.");
    return {
      tool: "get_client_profile",
      profile: {
        firstName: firstNameOf(client.fullName),
        status: client.status,
        startedOn: client.startedOn,
        goal: client.goal ? sanitizeUntrustedText(client.goal, 300) : null,
        lastCheckinOn: client.lastCheckinAt ? calendarDateIn(context.timezone, client.lastCheckinAt) : null,
      },
    };
  },
});

export const getLatestCheckinTool = defineReadTool({
  name: "get_latest_checkin",
  description: "L'ultimo check-in inviato dalla cliente: punteggi 1-5, allenamenti, testi della cliente, stato di revisione.",
  inputSchema: z.object({}).strict(),
  execute: async (_input, context) => {
    const [latest] = await listCheckinsForClient(context.auth.db, context.clientId, 1);
    return {
      tool: "get_latest_checkin",
      checkin: latest ? summarizeCheckin(latest, context.sources, context.timezone) : null,
    };
  },
});

export const getPreviousCheckinsTool = defineReadTool({
  name: "get_previous_checkins",
  description:
    "I check-in precedenti all'ultimo, dal più recente. Usalo per confronti con lo storico o temi ricorrenti.",
  inputSchema: z
    .object({
      limit: z.number().int().min(1).max(MAX_PREVIOUS_CHECKINS).describe(`Quanti check-in precedenti (1-${MAX_PREVIOUS_CHECKINS})`),
    })
    .strict(),
  execute: async ({ limit }, context) => {
    const checkins = await listCheckinsForClient(context.auth.db, context.clientId, limit + 1);
    return {
      tool: "get_previous_checkins",
      checkins: checkins.slice(1).map((checkin) => summarizeCheckin(checkin, context.sources, context.timezone)),
    };
  },
});

export const getCoachNotesTool = defineReadTool({
  name: "get_coach_notes",
  description: "Le note più recenti scritte dalle coach su questa cliente (osservazioni, accordi, preferenze).",
  inputSchema: z
    .object({
      limit: z.number().int().min(1).max(MAX_NOTES).describe(`Quante note recenti (1-${MAX_NOTES})`),
    })
    .strict(),
  execute: async ({ limit }, context) => {
    const notes = await listNotesForClient(context.auth.db, context.clientId, context.auth.coach.id, limit);
    return {
      tool: "get_coach_notes",
      notes: notes.map((note) => summarizeNote(note, context.sources, context.timezone)),
    };
  },
});

export const getFollowupsTool = defineReadTool({
  name: "get_followups",
  description: "I follow-up della cliente con scadenza e stato. Utile per sapere cosa è in programma o quando è stato l'ultimo.",
  inputSchema: z
    .object({
      status: z.enum(["pending", "completed", "cancelled", "all"]).describe("Filtra per stato; 'all' per tutti"),
      limit: z.number().int().min(1).max(MAX_FOLLOWUPS).describe(`Quanti follow-up (1-${MAX_FOLLOWUPS})`),
    })
    .strict(),
  execute: async ({ status, limit }, context) => {
    const followups = await listFollowupsForClient(context.auth.db, context.clientId);
    const matching = status === "all" ? followups : followups.filter((followup) => followup.status === status);
    const mostRecentFirst = [...matching].sort((a, b) => b.dueOn.localeCompare(a.dueOn));
    return {
      tool: "get_followups",
      followups: mostRecentFirst.slice(0, limit).map((followup) => summarizeFollowup(followup, context.sources, context.timezone)),
    };
  },
});
