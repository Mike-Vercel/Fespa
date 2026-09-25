import "server-only";
import { z } from "zod";
import { AUTOMATION_STEPS } from "@/domain/coach-ai";
import { ValidationError } from "@/server/errors";
import {
  enableCheckinReplyDrafts,
  getOwnAutomation,
  listOwnAutomations,
  setAutomationEnabled,
} from "@/server/services/automations";
import { defineActionTool, defineReadTool } from "./define";
import { ALL_STAFF, countLabel, idSchema } from "./shared";

const NEW_CHECKIN_RULE = AUTOMATION_STEPS.new_checkin;

export const getAutomationsTool = defineReadTool({
  name: "get_automations",
  description: "Le automazioni (istruzioni permanenti) dell'utente, con stato e ultima esecuzione.",
  inputSchema: z.object({}).strict(),
  allowedRoles: ALL_STAFF,
  auditTarget: "automation",
  runningLabel: () => "Sto controllando le automazioni…",
  run: async (context) => {
    const automations = await listOwnAutomations(context.auth);
    return {
      data: {
        automations: automations.map((automation) => ({
          automationId: automation.id,
          trigger: automation.trigger,
          action: automation.action,
          description: automation.description,
          enabled: automation.enabled,
          lastRunAt: automation.lastRunAt,
          lastStatus: automation.lastStatus,
          sendsMessagesAutomatically: false,
        })),
        availableRules: [{ trigger: "new_checkin", action: "generate_reply_draft", description: NEW_CHECKIN_RULE.steps.join(" → ") }],
      },
      summary: automations.length === 0 ? "Nessuna automazione attiva" : `${countLabel(automations.length, "automazione", "automazioni")}`,
    };
  },
});

export const createAutomationTool = defineActionTool({
  name: "create_automation",
  description:
    "Crea un'istruzione permanente (automazione). Oggi è disponibile solo: a ogni nuovo check-in di una cliente seguita, " +
    "preparare una BOZZA di risposta, che NON viene mai inviata automaticamente e aspetta la revisione dell'utente. " +
    "Altre automazioni non sono ancora disponibili: dillo all'utente. Richiede la conferma dell'utente.",
  inputSchema: z
    .object({
      trigger: z.enum(["new_checkin"]).describe("Evento: nuovo check-in"),
      action: z.enum(["generate_reply_draft"]).describe("Azione: bozza di risposta, mai inviata automaticamente"),
    })
    .strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "automation",
  runningLabel: () => "Sto preparando l'automazione…",
  prepare: async (context) => {
    const existing = (await listOwnAutomations(context.auth)).find((automation) => automation.trigger === "new_checkin");
    if (existing?.enabled) {
      throw new ValidationError({}, "Questa automazione è già attiva.");
    }
    return {
      title: "Nuova automazione",
      fields: [
        { label: "Regola", value: NEW_CHECKIN_RULE.title },
        { label: "Cosa succede", value: NEW_CHECKIN_RULE.steps.map((step) => `→ ${step}`).join("\n"), multiline: true },
        { label: "Invio alla cliente", value: "Mai automatico: decidi sempre tu" },
      ],
      warnings: [
        "Le bozze vengono preparate quando apri Coach AI (nessuna elaborazione in background) e usano le richieste AI del tuo account.",
      ],
      confirmLabel: existing ? "Riattiva automazione" : "Crea automazione",
      target: null,
      summaryForModel: "Automazione preparata: non è ancora attiva, serve la conferma dell'utente.",
    };
  },
  commit: async (context) => {
    await enableCheckinReplyDrafts(context.auth);
    return {
      message: "Automazione attiva: ai prossimi check-in troverai qui le bozze pronte, mai inviate senza di te.",
      link: null,
    };
  },
  auditSummary: ({ trigger, action }) => ({ trigger, action }),
});

export const setAutomationEnabledTool = defineActionTool({
  name: "set_automation_enabled",
  description: "Sospende (enabled=false) o riattiva (enabled=true) un'automazione dell'utente. Richiede la conferma dell'utente.",
  inputSchema: z
    .object({
      automationId: idSchema("Id dell'automazione (da get_automations)"),
      enabled: z.boolean().describe("true per attivarla, false per sospenderla"),
    })
    .strict(),
  risk: "write",
  allowedRoles: ALL_STAFF,
  auditTarget: "automation",
  runningLabel: () => "Sto preparando la modifica dell'automazione…",
  prepare: async (context, { automationId, enabled }) => {
    const automation = await getOwnAutomation(context.auth, automationId);
    if (automation.enabled === enabled) {
      throw new ValidationError({}, enabled ? "L'automazione è già attiva." : "L'automazione è già sospesa.");
    }
    return {
      title: enabled ? "Riattivare l'automazione?" : "Sospendere l'automazione?",
      fields: [{ label: "Regola", value: automation.description }],
      warnings: enabled ? [] : ["Le bozze già preparate restano disponibili."],
      confirmLabel: enabled ? "Riattiva" : "Sospendi",
      target: { type: "automation", id: automation.id, label: automation.description },
      summaryForModel: "Modifica dell'automazione preparata: serve la conferma dell'utente.",
    };
  },
  commit: async (context, { automationId, enabled }) => {
    await setAutomationEnabled(context.auth, automationId, enabled);
    return { message: enabled ? "Automazione riattivata." : "Automazione sospesa.", link: null };
  },
  auditSummary: ({ automationId, enabled }) => ({ automationId, enabled }),
});
