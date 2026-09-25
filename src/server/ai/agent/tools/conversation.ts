import "server-only";
import { z } from "zod";
import { defineControlTool } from "./define";
import { ALL_STAFF, idSchema } from "./shared";

/*
 * Strumenti di conversazione: non toccano i dati del gestionale. Li esegue il runtime,
 * perché servono la conversazione e il messaggio correnti.
 */

export const clarificationSchema = z
  .object({
    question: z.string().trim().min(5).max(300).describe("Domanda breve e chiara per l'utente"),
    options: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(80).describe("Testo del pulsante, es. 'Marco Rossi'"),
            description: z.string().trim().max(160).nullable().describe("Dettaglio che aiuta a distinguere (es. email), o null"),
            reply: z.string().trim().min(1).max(300).describe("Messaggio inviato a nome dell'utente se sceglie questa opzione"),
          })
          .strict(),
      )
      .min(2)
      .max(6)
      .describe("Da 2 a 6 opzioni"),
  })
  .strict();

export const askClarificationTool = defineControlTool({
  name: "ask_clarification",
  description:
    "Chiedi all'utente di scegliere quando la richiesta è ambigua (es. due clienti con lo stesso nome, data non chiara) " +
    "prima di preparare un'azione. Mostra pulsanti con le opzioni; il turno finisce e riprendi quando l'utente sceglie. " +
    "Non indovinare mai su operazioni che modificano dati.",
  inputSchema: clarificationSchema,
  risk: "read",
  control: "ask_clarification",
  allowedRoles: ALL_STAFF,
  auditTarget: null,
  runningLabel: () => "Mi serve un chiarimento…",
});

export const presentActionTool = defineControlTool({
  name: "present_action_for_confirmation",
  description:
    "Ripresenta all'utente, per la conferma, un'azione o una bozza già preparata in questa conversazione " +
    "(vedi 'azioni aperte' nel contesto), es. quando dice 'inviala'. Non esegue nulla: solo l'utente può confermare.",
  inputSchema: z.object({ actionRequestId: idSchema("Id dell'azione aperta (dal contesto)") }).strict(),
  risk: "draft",
  control: "present_action",
  allowedRoles: ALL_STAFF,
  auditTarget: null,
  runningLabel: () => "Sto preparando la conferma…",
});
