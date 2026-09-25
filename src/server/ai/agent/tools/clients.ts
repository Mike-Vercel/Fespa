import "server-only";
import { z } from "zod";
import { attentionReasonsFor, describeAttentionReason } from "@/domain/attention";
import { calendarDateIn } from "@/domain/dates";
import { isAdminRole } from "@/domain/roles";
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
import { formatLongDate } from "@/lib/format";
import { searchArchivedClients } from "@/server/repositories/clients";
import { archiveClient, getArchivedClient, restoreClient } from "@/server/services/client-archive";
import { getClientDetail, listClients } from "@/server/services/clients";
import { defineActionTool, defineReadTool } from "./define";
import {
  ADMINS,
  ALL_STAFF,
  checkinForModel,
  clientLink,
  countLabel,
  followupForModel,
  idSchema,
  noteForModel,
  safeName,
  untrusted,
} from "./shared";

const MAX_SEARCH_RESULTS = 8;
const OVERVIEW_FOLLOWUPS = 5;
const OVERVIEW_NOTES = 3;
const OVERVIEW_CHECKINS = 3;

function shortQuery(query: string): string {
  return query.length > 40 ? `${query.slice(0, 40)}…` : query;
}

export const searchClientsTool = defineReadTool({
  name: "search_clients",
  description:
    "Cerca tra le clienti che l'utente può vedere, per nome, cognome, email o telefono (va bene anche una parte del nome). " +
    "Usalo SEMPRE per identificare una cliente prima di leggerne i dati o preparare un'azione. " +
    "Restituisce id, nome, stato e dati essenziali; 'ambiguous' è true se ci sono più corrispondenze. " +
    "includeArchived=true cerca anche tra le clienti archiviate (solo amministrazione, per ripristinarle).",
  inputSchema: z
    .object({
      query: z.string().trim().min(1).max(80).describe("Testo da cercare, es. 'Sara' o 'Bellini'"),
      includeArchived: z.boolean().describe("true solo per trovare clienti archiviate da ripristinare"),
    })
    .strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "client",
  runningLabel: ({ query }) => `Sto cercando “${shortQuery(query)}”…`,
  run: async (context, { query, includeArchived }) => {
    const list = await listClients(context.auth, { q: query, status: "all", sort: "name" }, context.now);
    const matches = list.rows.slice(0, MAX_SEARCH_RESULTS).map((row) => ({
      clientId: row.id,
      fullName: safeName(row.fullName),
      status: CLIENT_STATUS_LABELS[row.status],
      lastCheckinOn: row.lastCheckinAt ? calendarDateIn(context.timezone, row.lastCheckinAt) : null,
      checkinsToReview: row.pendingReviewCount,
      nextFollowupOn: row.nextFollowupOn,
      attention: row.attention?.reasons.map(describeAttentionReason) ?? [],
    }));
    const archived =
      includeArchived && isAdminRole(context.auth.coach.role) ? await searchArchivedClients(context.auth.db, query) : [];
    const total = matches.length + archived.length;

    return {
      data: {
        matches,
        archivedMatches: archived.map((client) => ({
          clientId: client.id,
          fullName: safeName(client.fullName),
          archivedOn: calendarDateIn(context.timezone, client.archivedAt),
        })),
        ambiguous: total > 1,
        note: total === 0 ? "Nessuna cliente trovata tra quelle accessibili all'utente." : null,
      },
      summary:
        total === 0
          ? `Nessuna cliente trovata per “${shortQuery(query)}”`
          : total === 1
            ? `Cliente trovata: ${matches[0]?.fullName ?? archived[0]?.fullName}`
            : `${total} clienti trovate per “${shortQuery(query)}”`,
      links: list.rows.slice(0, 3).map((row) => clientLink(row.id, row.fullName)),
    };
  },
});

export const getClientOverviewTool = defineReadTool({
  name: "get_client_overview",
  description:
    "Scheda sintetica di UNA cliente: stato, obiettivo, ultimi check-in, follow-up aperti, note recenti e motivi di attenzione. " +
    "Usalo per domande del tipo 'come sta andando Sara?'. Richiede l'id restituito da search_clients.",
  inputSchema: z.object({ clientId: idSchema("Id della cliente (da search_clients)") }).strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "client",
  runningLabel: () => "Sto leggendo la scheda della cliente…",
  run: async (context, { clientId }) => {
    // Il service verifica l'accesso: una cliente non assegnata risponde "non trovata".
    const detail = await getClientDetail(context.auth, clientId, context.now);
    const { client } = detail;
    const attention = attentionReasonsFor(client, { now: context.now, timezone: context.timezone });
    const pendingFollowups = detail.followups.filter((followup) => followup.status === "pending");

    return {
      data: {
        clientId: client.id,
        fullName: safeName(client.fullName),
        status: CLIENT_STATUS_LABELS[client.status],
        goal: untrusted(client.goal, 300),
        startedOn: client.startedOn,
        hasAppAccount: client.hasAccount,
        experienceLevel: detail.profile?.experienceLevel ?? null,
        weeklyAvailability: detail.profile?.weeklyAvailability ?? null,
        notesFromClientAtSignup: untrusted(detail.profile?.notesForCoach, 400),
        // Dati sanitari volutamente esclusi (minimizzazione): la coach li trova nella scheda.
        healthInformationOnFile: detail.health !== null,
        attention: attention.map(describeAttentionReason),
        checkinsTotal: detail.checkins.length,
        latestCheckins: detail.checkins.slice(0, OVERVIEW_CHECKINS).map((checkin) => checkinForModel(checkin, context.timezone)),
        pendingFollowups: pendingFollowups.slice(0, OVERVIEW_FOLLOWUPS).map((followup) => followupForModel(followup, context.today)),
        recentNotes: detail.notes.slice(0, OVERVIEW_NOTES).map((note) => noteForModel(note, context.timezone)),
      },
      summary: `Scheda di ${client.fullName}: ${countLabel(detail.checkins.length, "check-in", "check-in")}, ${countLabel(pendingFollowups.length, "follow-up aperto", "follow-up aperti")}`,
      links: [clientLink(client.id, client.fullName)],
    };
  },
});

export const getClientTimelineTool = defineReadTool({
  name: "get_client_timeline",
  description:
    "Cronologia recente di UNA cliente (check-in inviati, risposte della coach, note, follow-up), dal più recente. " +
    "Utile per 'cosa è successo con Sara questa settimana?'.",
  inputSchema: z
    .object({
      clientId: idSchema("Id della cliente (da search_clients)"),
      limit: z.number().int().min(1).max(20).describe("Quanti eventi (1-20)"),
    })
    .strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "client",
  runningLabel: () => "Sto ricostruendo la cronologia…",
  run: async (context, { clientId, limit }) => {
    const detail = await getClientDetail(context.auth, clientId, context.now);
    const day = (instant: string) => calendarDateIn(context.timezone, instant);
    const events = [
      ...detail.checkins.map((checkin) => ({
        date: day(checkin.submittedAt),
        kind: "check-in inviato",
        checkinId: checkin.id,
        reviewed: checkin.reviewedAt !== null,
        challenges: untrusted(checkin.answers?.challenges, 300),
      })),
      ...detail.checkins
        .filter((checkin) => checkin.reviewedAt && checkin.coachReply)
        .map((checkin) => ({
          date: day(checkin.reviewedAt ?? checkin.submittedAt),
          kind: "risposta della coach",
          checkinId: checkin.id,
          reply: untrusted(checkin.coachReply, 300),
        })),
      ...detail.notes.map((note) => ({ date: day(note.createdAt), kind: "nota", note: noteForModel(note, context.timezone) })),
      ...detail.followups.map((followup) => ({
        date: followup.completedAt ? day(followup.completedAt) : followup.dueOn,
        kind: followup.status === "completed" ? "follow-up completato" : followup.status === "cancelled" ? "follow-up annullato" : "follow-up in programma",
        followup: followupForModel(followup, context.today),
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);

    return {
      data: { clientId: detail.client.id, fullName: safeName(detail.client.fullName), events },
      summary: `${countLabel(events.length, "evento", "eventi")} nella cronologia di ${detail.client.fullName}`,
      links: [clientLink(detail.client.id, detail.client.fullName)],
    };
  },
});

export const getAttentionListTool = defineReadTool({
  name: "get_attention_list",
  description:
    "Clienti che richiedono attenzione oggi (follow-up scaduti, check-in in attesa da tempo, nessun check-in recente, proposte AI da valutare), " +
    "dalla più urgente. Usalo per 'quali clienti devo controllare oggi?'.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(15).describe("Quante clienti (1-15)") }).strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "client",
  runningLabel: () => "Sto controllando chi richiede attenzione…",
  run: async (context, { limit }) => {
    const list = await listClients(context.auth, { q: "", status: "all", sort: "priority" }, context.now);
    const needingAttention = list.rows.filter((row) => row.attention !== null);
    const selected = needingAttention.slice(0, limit);
    return {
      data: {
        totalNeedingAttention: needingAttention.length,
        clients: selected.map((row) => ({
          clientId: row.id,
          fullName: safeName(row.fullName),
          priority: row.attention?.priority,
          reasons: row.attention?.reasons.map(describeAttentionReason) ?? [],
        })),
      },
      summary:
        needingAttention.length === 0
          ? "Nessuna cliente richiede attenzione"
          : `${countLabel(needingAttention.length, "cliente richiede", "clienti richiedono")} attenzione`,
      links: selected.slice(0, 3).map((row) => clientLink(row.id, row.fullName)),
    };
  },
});

export const archiveClientTool = defineActionTool({
  name: "archive_client",
  description:
    "Archivia una cliente: è l'unica forma di 'eliminazione' del gestionale (soft-delete, reversibile). " +
    "La cliente sparisce da liste, check-in, follow-up e dashboard per tutto lo staff; i dati restano. " +
    "Solo amministrazione. Richiede conferma rafforzata dell'utente.",
  inputSchema: z.object({ clientId: idSchema("Id della cliente (da search_clients)") }).strict(),
  risk: "destructive",
  allowedRoles: ADMINS,
  auditTarget: "client",
  runningLabel: () => "Sto preparando l'archiviazione…",
  prepare: async (context, { clientId }) => {
    const detail = await getClientDetail(context.auth, clientId, context.now);
    const { client } = detail;
    const pending = detail.followups.filter((followup) => followup.status === "pending").length;
    return {
      title: `Archiviare ${client.fullName}?`,
      fields: [
        { label: "Cliente", value: client.fullName },
        { label: "Stato del percorso", value: CLIENT_STATUS_LABELS[client.status] },
        { label: "Dati collegati", value: `${countLabel(detail.checkins.length, "check-in", "check-in")}, ${countLabel(detail.notes.length, "nota", "note")}, ${countLabel(pending, "follow-up aperto", "follow-up aperti")}` },
      ],
      warnings: [
        "La cliente sparirà da liste, check-in, follow-up e dashboard per tutto lo staff.",
        "I dati non vengono cancellati: potrai ripristinarla chiedendo a Coach AI “Ripristina " + client.fullName + "”.",
        ...(client.hasAccount ? ["Il suo account resta attivo: potrà ancora entrare nella sua area personale."] : []),
      ],
      confirmLabel: "Conferma archiviazione",
      typedConfirmation: client.fullName,
      target: { type: "client", id: client.id, label: client.fullName },
      summaryForModel: `Archiviazione di ${safeName(client.fullName)} preparata: serve la conferma rafforzata dell'utente.`,
    };
  },
  commit: async (context, { clientId }) => {
    await archiveClient(context.auth, clientId);
    return { message: "Cliente archiviata. Puoi ripristinarla in qualsiasi momento.", link: null };
  },
  auditSummary: ({ clientId }) => ({ clientId }),
});

export const restoreClientTool = defineActionTool({
  name: "restore_client",
  description:
    "Ripristina una cliente archiviata: torna visibile a chi la segue, con tutti i suoi dati. Solo amministrazione. " +
    "Trova l'id con search_clients e includeArchived=true.",
  inputSchema: z.object({ clientId: idSchema("Id della cliente archiviata (da search_clients con includeArchived=true)") }).strict(),
  risk: "write",
  allowedRoles: ADMINS,
  auditTarget: "client",
  runningLabel: () => "Sto preparando il ripristino…",
  prepare: async (context, { clientId }) => {
    const client = await getArchivedClient(context.auth, clientId);
    return {
      title: `Ripristinare ${client.fullName}?`,
      fields: [
        { label: "Cliente", value: client.fullName },
        { label: "Archiviata il", value: formatLongDate(calendarDateIn(context.timezone, client.archivedAt)) },
      ],
      warnings: ["Tornerà visibile nelle liste, nei check-in e nei follow-up di chi la segue."],
      confirmLabel: "Conferma ripristino",
      target: { type: "client", id: client.id, label: client.fullName },
      summaryForModel: `Ripristino di ${safeName(client.fullName)} preparato: serve la conferma dell'utente.`,
    };
  },
  commit: async (context, { clientId }) => {
    await restoreClient(context.auth, clientId);
    return { message: "Cliente ripristinata.", link: { label: "Apri la scheda", href: `/clients/${clientId}` } };
  },
  auditSummary: ({ clientId }) => ({ clientId }),
});
