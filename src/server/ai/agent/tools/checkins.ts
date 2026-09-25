import "server-only";
import { z } from "zod";
import { calendarDateIn, daysBetween } from "@/domain/dates";
import { firstNameOf } from "@/domain/greeting";
import { findClientOverview } from "@/server/repositories/clients";
import { listCheckinsForClient } from "@/server/repositories/checkins";
import { assertClientAccess } from "@/server/services/access";
import { getAccessibleCheckin, getCheckinInbox, reviewCheckin } from "@/server/services/checkins";
import { NotFoundError, ValidationError } from "@/server/errors";
import { COACH_REPLY_MAX_LENGTH } from "@/validation/checkin-review";
import { defineActionTool, defineDraftTool, defineReadTool, type AgentContext } from "./define";
import { ALL_STAFF, checkinForModel, clientLink, countLabel, describeCheckinDay, idSchema, safeName } from "./shared";

const REPLY_MIN_LENGTH = 20;

const replyText = z
  .string()
  .trim()
  .min(REPLY_MIN_LENGTH, { error: `La risposta deve avere almeno ${REPLY_MIN_LENGTH} caratteri.` })
  .max(COACH_REPLY_MAX_LENGTH, { error: `La risposta può avere al massimo ${COACH_REPLY_MAX_LENGTH} caratteri.` });

export const getPendingCheckinsTool = defineReadTool({
  name: "get_pending_checkins",
  description:
    "Check-in ancora da revisionare delle clienti accessibili all'utente, dal più recente, con punteggi e testi essenziali. " +
    "Usalo per 'fammi vedere i check-in da revisionare'.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(20).describe("Quanti check-in (1-20)") }).strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "checkin",
  runningLabel: () => "Sto controllando i check-in da revisionare…",
  run: async (context, { limit }) => {
    const inbox = await getCheckinInbox(context.auth, "pending");
    const checkins = inbox.checkins.slice(0, limit);
    return {
      data: {
        totalToReview: inbox.pendingCount,
        checkins: checkins.map((checkin) => ({
          clientId: checkin.clientId,
          clientName: safeName(checkin.clientName),
          waitingDays: daysBetween(calendarDateIn(context.timezone, checkin.submittedAt), context.today),
          ...checkinForModel(checkin, context.timezone),
        })),
      },
      summary: `${countLabel(inbox.pendingCount, "check-in", "check-in")} da revisionare`,
      links: [{ label: "Apri i check-in", href: "/checkins" }],
    };
  },
});

export const getClientCheckinsTool = defineReadTool({
  name: "get_client_checkins",
  description:
    "Gli ultimi check-in di UNA cliente, dal più recente: punteggi 1-5, allenamenti, testi della cliente, stato di revisione e risposta. " +
    "Serve anche per trovare il checkinId a cui rispondere.",
  inputSchema: z
    .object({
      clientId: idSchema("Id della cliente (da search_clients)"),
      limit: z.number().int().min(1).max(8).describe("Quanti check-in (1-8)"),
    })
    .strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "checkin",
  runningLabel: () => "Sto leggendo gli ultimi check-in…",
  run: async (context, { clientId, limit }) => {
    const validClientId = await assertClientAccess(context.auth, clientId);
    const [client, checkins] = await Promise.all([
      findClientOverview(context.auth.db, validClientId),
      listCheckinsForClient(context.auth.db, validClientId, limit),
    ]);
    const name = client?.fullName ?? "la cliente";
    return {
      data: { clientId: validClientId, clientName: safeName(name), checkins: checkins.map((checkin) => checkinForModel(checkin, context.timezone)) },
      summary: `${countLabel(checkins.length, "check-in analizzato", "check-in analizzati")}`,
      links: client ? [clientLink(client.id, client.fullName, "checkins")] : [],
    };
  },
});

/** Check-in accessibile + nome della cliente, per anteprime e verifiche. */
async function loadCheckinWithClient(context: AgentContext, checkinId: string) {
  const checkin = await getAccessibleCheckin(context.auth, checkinId);
  const client = await findClientOverview(context.auth.db, checkin.clientId);
  if (!client) {
    throw new NotFoundError("Check-in non trovato o non accessibile.");
  }
  return { checkin, client };
}

export const sendCheckinReplyTool = defineActionTool({
  name: "send_checkin_reply",
  description:
    "Invia alla cliente la risposta a un suo check-in (è il canale con cui la coach scrive alla cliente: la legge nella sua area). " +
    "NON invia nulla subito: prepara la richiesta e l'utente deve confermare. Usalo quando l'utente chiede esplicitamente di inviare/rispondere. " +
    "Se l'utente chiede solo di preparare una risposta, usa prepare_checkin_reply.",
  inputSchema: z
    .object({
      checkinId: idSchema("Id del check-in a cui rispondere"),
      text: replyText.describe("Testo completo della risposta, in seconda persona, rivolto alla cliente per nome"),
    })
    .strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "checkin",
  editableKeys: ["text"],
  runningLabel: () => "Sto preparando la risposta…",
  prepare: async (context, { checkinId, text }) => {
    const { checkin, client } = await loadCheckinWithClient(context, checkinId);
    // La cliente potrebbe averla già letta: una risposta non si sostituisce (stessa regola del service).
    if (checkin.coachReply) {
      throw new ValidationError({}, "Questo check-in ha già una risposta: non si può inviarne un'altra.");
    }
    const firstName = firstNameOf(client.fullName);
    return {
      title: `Risposta pronta per ${firstName}`,
      fields: [
        { label: "Cliente", value: client.fullName },
        { label: "Check-in", value: describeCheckinDay(checkin, context.timezone, context.today) },
        { label: "Risposta", value: text, multiline: true },
      ],
      warnings: [
        `${firstName} leggerà la risposta nella sua area personale. Dopo l'invio non si potrà modificare.`,
        ...(checkin.reviewedAt ? [] : ["Il check-in verrà segnato anche come revisionato."]),
      ],
      confirmLabel: "Conferma e invia",
      editable: [{ key: "text", label: "Testo della risposta", kind: "textarea", value: text, maxLength: COACH_REPLY_MAX_LENGTH }],
      copyText: text,
      target: { type: "checkin", id: checkin.id, label: client.fullName },
      summaryForModel: `Risposta al check-in di ${safeName(firstName)} preparata: non è stata inviata, serve la conferma dell'utente.`,
    };
  },
  commit: async (context, { checkinId, text }) => {
    const checkin = await getAccessibleCheckin(context.auth, checkinId);
    await reviewCheckin(context.auth, { checkinId, reply: text });
    return { message: "Risposta inviata alla cliente.", link: clientLink(checkin.clientId, "Apri la scheda", "checkins") };
  },
  auditSummary: ({ checkinId, text }) => ({ checkinId, replyLength: text.length }),
});

export const prepareCheckinReplyTool = defineDraftTool({
  name: "prepare_checkin_reply",
  description:
    "Prepara una BOZZA di risposta a un check-in, senza inviarla: la coach la vede, può modificarla, copiarla o confermarne l'invio. " +
    "Scrivi tu il testo usando i dati letti (nome della cliente, check-in, note). Usalo per 'preparami una risposta per Sara'.",
  inputSchema: z
    .object({
      checkinId: idSchema("Id del check-in a cui rispondere (da get_client_checkins o get_pending_checkins)"),
      text: replyText.describe("Testo completo della bozza, in seconda persona, rivolto alla cliente per nome"),
    })
    .strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "checkin",
  runningLabel: () => "Sto scrivendo la bozza…",
  target: sendCheckinReplyTool,
  toTargetInput: ({ checkinId, text }) => ({ checkinId, text }),
});

export const markCheckinReviewedTool = defineActionTool({
  name: "mark_checkin_reviewed",
  description: "Segna un check-in come revisionato, senza inviare risposte. Richiede la conferma dell'utente.",
  inputSchema: z.object({ checkinId: idSchema("Id del check-in") }).strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "checkin",
  runningLabel: () => "Sto preparando la revisione…",
  prepare: async (context, { checkinId }) => {
    const { checkin, client } = await loadCheckinWithClient(context, checkinId);
    if (checkin.reviewedAt) {
      throw new ValidationError({}, "Questo check-in è già stato revisionato.");
    }
    return {
      title: "Segnare il check-in come revisionato?",
      fields: [
        { label: "Cliente", value: client.fullName },
        { label: "Check-in", value: describeCheckinDay(checkin, context.timezone, context.today) },
      ],
      warnings: ["Non verrà inviata nessuna risposta alla cliente."],
      confirmLabel: "Segna come revisionato",
      target: { type: "checkin", id: checkin.id, label: client.fullName },
      summaryForModel: `Revisione del check-in di ${safeName(client.fullName)} preparata: serve la conferma dell'utente.`,
    };
  },
  commit: async (context, { checkinId }) => {
    const checkin = await getAccessibleCheckin(context.auth, checkinId);
    await reviewCheckin(context.auth, { checkinId });
    return { message: "Check-in segnato come revisionato.", link: clientLink(checkin.clientId, "Apri la scheda", "checkins") };
  },
  auditSummary: ({ checkinId }) => ({ checkinId }),
});
