import "server-only";
import { AUTOMATION_STEPS } from "@/domain/coach-ai";
import type { AuthenticatedContext } from "@/server/auth/session";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  findAutomation,
  listAutomations,
  setAutomationEnabled as setEnabled,
  upsertAutomation,
  type AutomationRecord,
} from "@/server/repositories/ai-automations";
import type { AutomationView } from "@/types/coach-ai";

/*
 * Regole di automazione di Coach AI (standing instructions persistenti).
 * Oggi è implementata una sola combinazione: NEW_CHECKIN → GENERATE_REPLY_DRAFT.
 * Per costruzione (vincoli nel database) una regola prepara bozze e non invia mai nulla.
 */

const AUTOMATION_NOT_FOUND_MESSAGE = "Automazione non trovata.";

export function toAutomationView(record: AutomationRecord): AutomationView {
  return {
    id: record.id,
    trigger: "new_checkin",
    action: "generate_reply_draft",
    enabled: record.enabled,
    description: AUTOMATION_STEPS.new_checkin.title,
    lastRunAt: record.lastRunAt,
    lastStatus: record.lastStatus,
  };
}

export async function listOwnAutomations(context: AuthenticatedContext): Promise<AutomationView[]> {
  const records = await listAutomations(context.db);
  return records.map(toAutomationView);
}

export async function getOwnAutomation(context: AuthenticatedContext, automationId: string): Promise<AutomationView> {
  const record = await findAutomation(context.db, automationId);
  if (!record) {
    throw new NotFoundError(AUTOMATION_NOT_FOUND_MESSAGE);
  }
  return toAutomationView(record);
}

/** Crea (o riattiva) la regola "bozza di risposta a ogni nuovo check-in". */
export async function enableCheckinReplyDrafts(context: AuthenticatedContext): Promise<AutomationView> {
  const { record, created } = await upsertAutomation(context.db, {
    ownerId: context.coach.id,
    trigger: "new_checkin",
    action: "generate_reply_draft",
  });
  logger.info("automations.enabled", { automationId: record.id, created });
  return toAutomationView(record);
}

export async function setAutomationEnabled(context: AuthenticatedContext, automationId: string, enabled: boolean): Promise<void> {
  const updated = await setEnabled(context.db, automationId, enabled);
  if (!updated) {
    throw new NotFoundError(AUTOMATION_NOT_FOUND_MESSAGE);
  }
  logger.info("automations.toggled", { automationId, enabled });
}
