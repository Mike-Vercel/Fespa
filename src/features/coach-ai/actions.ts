"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { cancelAction, confirmAction, editAction } from "@/server/ai/agent/actions";
import { removeUnsentAttachment } from "@/server/ai/agent/attachments";
import { createAgentContext } from "@/server/ai/agent/agent-context";
import { runPendingAutomations, type AutomationRunSummary } from "@/server/ai/automations/engine";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { setAutomationEnabled } from "@/server/services/automations";
import {
  deleteConversation,
  getOlderMessages,
  renameConversation,
  searchConversations,
  setConversationArchived,
} from "@/server/services/coach-ai";
import type { ActionRequestView, ChatMessageView, ConversationSummary } from "@/types/coach-ai";
import type { ActionResult } from "@/types/results";
import {
  actionOperationSchema,
  automationToggleSchema,
  conversationArchiveSchema,
  conversationIdSchema,
  conversationSearchSchema,
  olderMessagesSchema,
  renameConversationSchema,
} from "@/validation/coach-ai";
import { uuidSchema } from "@/validation/common";
import { fieldErrorsOf } from "@/validation/field-errors";

/*
 * Server Action di Coach AI. Raggiungibili anche con POST diretti: validano tutto con Zod
 * e delegano ai service, che rifanno autenticazione, autorizzazione e controlli di proprietà.
 */

function parse<TSchema extends z.ZodType>(schema: TSchema, input: unknown): z.output<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(fieldErrorsOf(parsed.error));
  }
  return parsed.data;
}

export async function searchConversationsAction(input: { query: string; archived: boolean }): Promise<ActionResult<ConversationSummary[]>> {
  return runAction("coachAi.searchConversations", async () => {
    const context = await requireCoachOrThrow();
    const { query, archived } = parse(conversationSearchSchema, input);
    return searchConversations(context, { text: query, archived });
  });
}

export async function loadOlderMessagesAction(input: {
  conversationId: string;
  before: string;
}): Promise<ActionResult<{ messages: ChatMessageView[]; hasMore: boolean }>> {
  return runAction("coachAi.loadOlderMessages", async () => {
    const context = await requireCoachOrThrow();
    const { conversationId, before } = parse(olderMessagesSchema, input);
    return getOlderMessages(context, conversationId, before);
  });
}

export async function renameConversationAction(input: { conversationId: string; title: string }): Promise<ActionResult<ConversationSummary>> {
  return runAction("coachAi.renameConversation", async () => {
    const context = await requireCoachOrThrow();
    const { conversationId, title } = parse(renameConversationSchema, input);
    return renameConversation(context, conversationId, title);
  });
}

export async function archiveConversationAction(input: {
  conversationId: string;
  archived: boolean;
}): Promise<ActionResult<ConversationSummary>> {
  return runAction("coachAi.archiveConversation", async () => {
    const context = await requireCoachOrThrow();
    const { conversationId, archived } = parse(conversationArchiveSchema, input);
    return setConversationArchived(context, conversationId, archived);
  });
}

export async function deleteConversationAction(input: { conversationId: string }): Promise<ActionResult<null>> {
  return runAction("coachAi.deleteConversation", async () => {
    const context = await requireCoachOrThrow();
    const { conversationId } = parse(conversationIdSchema, input);
    await deleteConversation(context, conversationId);
    return null;
  });
}

/** Conferma, annulla o modifica una richiesta di azione preparata da Coach AI. */
export async function actionRequestAction(input: unknown): Promise<ActionResult<ActionRequestView>> {
  return runAction("coachAi.actionRequest", async () => {
    const context = createAgentContext(await requireCoachOrThrow());
    const operation = parse(actionOperationSchema, input);
    let view: ActionRequestView;
    switch (operation.op) {
      case "confirm":
        view = await confirmAction(context, operation.actionId, {
          acknowledged: operation.acknowledged,
          typedConfirmation: operation.typedConfirmation,
        });
        break;
      case "cancel":
        view = await cancelAction(context, operation.actionId);
        break;
      case "edit":
        view = await editAction(context, operation.actionId, operation.fields);
        break;
    }
    // Un'azione eseguita cambia dati mostrati altrove (contatori, liste).
    if (view.status === "succeeded") revalidatePath("/", "layout");
    return view;
  });
}

export async function removeAttachmentAction(attachmentId: string): Promise<ActionResult<null>> {
  return runAction("coachAi.removeAttachment", async () => {
    const context = await requireCoachOrThrow();
    await removeUnsentAttachment(context, parse(uuidSchema, attachmentId));
    return null;
  });
}

export async function toggleAutomationAction(input: { automationId: string; enabled: boolean }): Promise<ActionResult<null>> {
  return runAction("coachAi.toggleAutomation", async () => {
    const context = await requireCoachOrThrow();
    const { automationId, enabled } = parse(automationToggleSchema, input);
    await setAutomationEnabled(context, automationId, enabled);
    return null;
  });
}

/** Elabora gli eventi delle automazioni in attesa (chiamata dal browser quando la coach apre l'app). */
export async function runAutomationsAction(): Promise<ActionResult<AutomationRunSummary>> {
  return runAction("coachAi.runAutomations", async () => {
    const context = await requireCoachOrThrow();
    const summary = await runPendingAutomations(context);
    if (summary.drafts > 0) revalidatePath("/", "layout");
    return summary;
  });
}
