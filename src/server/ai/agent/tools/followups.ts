import "server-only";
import { z } from "zod";
import { daysBetween } from "@/domain/dates";
import { dueBucketOf } from "@/domain/followups";
import { FOLLOWUP_STATUS_LABELS } from "@/lib/labels";
import { ValidationError } from "@/server/errors";
import { findClientOverview } from "@/server/repositories/clients";
import { listFollowupsForClient } from "@/server/repositories/followups";
import { assertClientAccess } from "@/server/services/access";
import {
  changeFollowupStatus,
  createFollowup,
  getAccessibleFollowup,
  getFollowupsOverview,
  updateFollowup,
} from "@/server/services/followups";
import type { FollowupItem } from "@/types/domain";
import {
  FOLLOWUP_DESCRIPTION_MAX_LENGTH,
  FOLLOWUP_MAX_DAYS_AHEAD,
  FOLLOWUP_TITLE_MAX_LENGTH,
} from "@/validation/followups";
import { defineActionTool, defineReadTool, type AgentContext } from "./define";
import { ALL_STAFF, clientLink, countLabel, describeDueDate, followupForModel, idSchema, isoDateSchema } from "./shared";

const title = z
  .string()
  .trim()
  .min(3)
  .max(FOLLOWUP_TITLE_MAX_LENGTH)
  .describe("Titolo operativo breve, es. 'Controllo andamento sonno'");
const description = z
  .string()
  .trim()
  .max(FOLLOWUP_DESCRIPTION_MAX_LENGTH)
  .nullable()
  .describe("Dettagli facoltativi (null se non servono)")
  // Un campo svuotato dalla coach in "Modifica" arriva come stringa vuota.
  .transform((value) => (value ? value : null));
const dueOn = isoDateSchema("Data di scadenza YYYY-MM-DD, calcolata rispetto alla data di oggi del contesto");

/** Stesse regole del service (che le ricontrolla alla conferma): dirlo subito aiuta il modello a correggersi. */
function assertDueDateAllowed(date: string, today: string): void {
  const days = daysBetween(today, date);
  if (days < 0) throw new ValidationError({ dueOn: ["La data non può essere nel passato."] });
  if (days > FOLLOWUP_MAX_DAYS_AHEAD) {
    throw new ValidationError({ dueOn: [`La data deve essere entro ${FOLLOWUP_MAX_DAYS_AHEAD} giorni.`] });
  }
}

type Scope = "overdue" | "today" | "upcoming" | "all_pending" | "recently_closed";

function matchesScope(followup: FollowupItem, scope: Scope, today: string): boolean {
  if (scope === "recently_closed") return followup.status !== "pending";
  if (followup.status !== "pending") return false;
  if (scope === "all_pending") return true;
  return dueBucketOf(followup.dueOn, today) === scope;
}

const SCOPE_SUMMARY: Record<Scope, [string, string]> = {
  overdue: ["follow-up scaduto", "follow-up scaduti"],
  today: ["follow-up per oggi", "follow-up per oggi"],
  upcoming: ["follow-up in arrivo", "follow-up in arrivo"],
  all_pending: ["follow-up da fare", "follow-up da fare"],
  recently_closed: ["follow-up chiuso di recente", "follow-up chiusi di recente"],
};

export const getFollowupsTool = defineReadTool({
  name: "get_followups",
  description:
    "Follow-up delle clienti accessibili: scaduti, di oggi, in arrivo, tutti quelli da fare o chiusi di recente. " +
    "Con clientId limita a una cliente. Restituisce followupId, cliente, titolo, scadenza e stato.",
  inputSchema: z
    .object({
      scope: z.enum(["overdue", "today", "upcoming", "all_pending", "recently_closed"]).describe("Quali follow-up"),
      clientId: idSchema("Id della cliente (da search_clients)").nullable().describe("null per tutte le clienti"),
      limit: z.number().int().min(1).max(20).describe("Quanti follow-up (1-20)"),
    })
    .strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "followup",
  runningLabel: () => "Sto controllando i follow-up…",
  run: async (context, { scope, clientId, limit }) => {
    let followups: FollowupItem[];
    let clientName: string | null = null;
    if (clientId) {
      const validClientId = await assertClientAccess(context.auth, clientId);
      const [client, clientFollowups] = await Promise.all([
        findClientOverview(context.auth.db, validClientId),
        listFollowupsForClient(context.auth.db, validClientId),
      ]);
      clientName = client?.fullName ?? null;
      followups = clientFollowups;
    } else {
      const overview = await getFollowupsOverview(context.auth);
      followups = [...overview.pending, ...overview.recentlyClosed];
    }
    const matching = followups.filter((followup) => matchesScope(followup, scope, context.today));
    const [singular, plural] = SCOPE_SUMMARY[scope];
    return {
      data: { scope, total: matching.length, followups: matching.slice(0, limit).map((followup) => followupForModel(followup, context.today)) },
      summary: `${countLabel(matching.length, singular, plural)}${clientName ? ` per ${clientName}` : ""}`,
      links: [clientId && clientName ? clientLink(clientId, clientName, "followups") : { label: "Apri i follow-up", href: "/followups" }],
    };
  },
});

async function clientNameFor(context: AgentContext, clientId: string): Promise<{ id: string; fullName: string }> {
  const validClientId = await assertClientAccess(context.auth, clientId);
  const client = await findClientOverview(context.auth.db, validClientId);
  if (!client) throw new ValidationError({}, "Cliente non trovata o non accessibile.");
  return client;
}

export const createFollowupTool = defineActionTool({
  name: "create_followup",
  description:
    "Programma un nuovo follow-up per una cliente. NON lo crea subito: prepara la richiesta con anteprima e l'utente deve confermare. " +
    "Calcola la data a partire dalla data di oggi indicata nel contesto (es. 'venerdì' = il prossimo venerdì).",
  inputSchema: z
    .object({ clientId: idSchema("Id della cliente (da search_clients)"), title, dueOn, description })
    .strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "followup",
  editableKeys: ["title", "dueOn", "description"],
  runningLabel: () => "Sto preparando il follow-up…",
  prepare: async (context, input) => {
    const client = await clientNameFor(context, input.clientId);
    assertDueDateAllowed(input.dueOn, context.today);
    return {
      title: "Nuovo follow-up",
      fields: [
        { label: "Cliente", value: client.fullName },
        { label: "Data", value: describeDueDate(input.dueOn, context.today) },
        { label: "Titolo", value: input.title },
        ...(input.description ? [{ label: "Dettagli", value: input.description, multiline: true }] : []),
      ],
      warnings: [],
      confirmLabel: "Conferma",
      editable: [
        { key: "title", label: "Titolo", kind: "text", value: input.title, maxLength: FOLLOWUP_TITLE_MAX_LENGTH },
        { key: "dueOn", label: "Data", kind: "date", value: input.dueOn },
        { key: "description", label: "Dettagli", kind: "textarea", value: input.description ?? "", maxLength: FOLLOWUP_DESCRIPTION_MAX_LENGTH },
      ],
      target: { type: "client", id: client.id, label: client.fullName },
      summaryForModel: `Follow-up per ${client.fullName} del ${input.dueOn} preparato: non è stato creato, serve la conferma dell'utente.`,
    };
  },
  commit: async (context, input) => {
    await createFollowup(context.auth, {
      clientId: input.clientId,
      title: input.title,
      description: input.description,
      dueOn: input.dueOn,
      aiAnalysisId: null,
    });
    return { message: "Follow-up creato.", link: clientLink(input.clientId, "Apri i follow-up", "followups") };
  },
  auditSummary: ({ clientId, dueOn: date }) => ({ clientId, dueOn: date }),
});

export const updateFollowupTool = defineActionTool({
  name: "update_followup",
  description:
    "Modifica titolo, scadenza o dettagli di un follow-up ancora da fare (passa sempre tutti e tre i valori finali). " +
    "Richiede la conferma dell'utente.",
  inputSchema: z.object({ followupId: idSchema("Id del follow-up (da get_followups)"), title, dueOn, description }).strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "followup",
  editableKeys: ["title", "dueOn", "description"],
  runningLabel: () => "Sto preparando la modifica…",
  prepare: async (context, input) => {
    const followup = await getAccessibleFollowup(context.auth, input.followupId);
    if (followup.status !== "pending") {
      throw new ValidationError({}, "Si possono modificare solo i follow-up ancora da fare.");
    }
    if (input.dueOn !== followup.dueOn) assertDueDateAllowed(input.dueOn, context.today);
    const change = (before: string, after: string) => (before === after ? after : `${before} → ${after}`);
    return {
      title: "Modifica follow-up",
      fields: [
        { label: "Cliente", value: followup.clientName },
        { label: "Titolo", value: change(followup.title, input.title) },
        { label: "Data", value: change(describeDueDate(followup.dueOn, context.today), describeDueDate(input.dueOn, context.today)) },
        ...(input.description ? [{ label: "Dettagli", value: input.description, multiline: true }] : []),
      ],
      warnings: [],
      confirmLabel: "Conferma modifica",
      editable: [
        { key: "title", label: "Titolo", kind: "text", value: input.title, maxLength: FOLLOWUP_TITLE_MAX_LENGTH },
        { key: "dueOn", label: "Data", kind: "date", value: input.dueOn },
        { key: "description", label: "Dettagli", kind: "textarea", value: input.description ?? "", maxLength: FOLLOWUP_DESCRIPTION_MAX_LENGTH },
      ],
      target: { type: "followup", id: followup.id, label: followup.clientName },
      summaryForModel: "Modifica del follow-up preparata: serve la conferma dell'utente.",
    };
  },
  commit: async (context, input) => {
    const followup = await getAccessibleFollowup(context.auth, input.followupId);
    await updateFollowup(context.auth, input);
    return { message: "Follow-up aggiornato.", link: clientLink(followup.clientId, "Apri i follow-up", "followups") };
  },
  auditSummary: ({ followupId, dueOn: date }) => ({ followupId, dueOn: date }),
});

const STATUS_TITLES = { completed: "Completare il follow-up?", cancelled: "Annullare il follow-up?", pending: "Riaprire il follow-up?" } as const;
const STATUS_CONFIRM = { completed: "Segna come completato", cancelled: "Annulla follow-up", pending: "Riapri follow-up" } as const;
const STATUS_DONE = { completed: "Follow-up completato.", cancelled: "Follow-up annullato.", pending: "Follow-up riaperto." } as const;

export const changeFollowupStatusTool = defineActionTool({
  name: "change_followup_status",
  description:
    "Completa (completed), annulla (cancelled) o riapre (pending) un follow-up. Un follow-up non si elimina: si annulla. " +
    "Richiede la conferma dell'utente.",
  inputSchema: z
    .object({
      followupId: idSchema("Id del follow-up (da get_followups)"),
      status: z.enum(["completed", "cancelled", "pending"]).describe("Nuovo stato"),
    })
    .strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "followup",
  runningLabel: () => "Sto preparando l'aggiornamento…",
  prepare: async (context, { followupId, status }) => {
    const followup = await getAccessibleFollowup(context.auth, followupId);
    if (followup.status === status) {
      throw new ValidationError({}, `Il follow-up è già nello stato “${FOLLOWUP_STATUS_LABELS[status]}”.`);
    }
    return {
      title: STATUS_TITLES[status],
      fields: [
        { label: "Cliente", value: followup.clientName },
        { label: "Follow-up", value: followup.title },
        { label: "Scadenza", value: describeDueDate(followup.dueOn, context.today) },
        { label: "Stato", value: `${FOLLOWUP_STATUS_LABELS[followup.status]} → ${FOLLOWUP_STATUS_LABELS[status]}` },
      ],
      warnings: [],
      confirmLabel: STATUS_CONFIRM[status],
      target: { type: "followup", id: followup.id, label: followup.clientName },
      summaryForModel: `Cambio di stato del follow-up preparato (${status}): serve la conferma dell'utente.`,
    };
  },
  commit: async (context, { followupId, status }) => {
    const followup = await getAccessibleFollowup(context.auth, followupId);
    await changeFollowupStatus(context.auth, followupId, status);
    return { message: STATUS_DONE[status], link: clientLink(followup.clientId, "Apri i follow-up", "followups") };
  },
  auditSummary: ({ followupId, status }) => ({ followupId, status }),
});
