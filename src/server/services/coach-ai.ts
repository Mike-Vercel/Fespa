import "server-only";
import { toActionView } from "@/server/ai/agent/actions";
import { removeConversationFiles } from "@/server/ai/agent/attachments";
import { toConversationSummary, toMessageViews } from "@/server/ai/agent/messages";
import type { AuthenticatedContext } from "@/server/auth/session";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";
import { listAutomationDrafts } from "@/server/repositories/ai-action-requests";
import { listAttachmentsForConversation } from "@/server/repositories/ai-attachments";
import { countPendingAutomationEvents } from "@/server/repositories/ai-automations";
import {
  deleteConversation as deleteConversationRecord,
  findConversation,
  listConversations,
  listMessages,
  updateConversation,
} from "@/server/repositories/ai-conversations";
import type { ChatMessageView, CoachAIPageData, ConversationSummary } from "@/types/coach-ai";
import { listOwnAutomations } from "./automations";

/*
 * Conversazioni di Coach AI: private di chi le scrive (RLS "solo proprietario"),
 * caricate a pagine (mai migliaia di messaggi insieme).
 */

export const MESSAGE_PAGE_SIZE = 30;
const DRAFTS_LIMIT = 20;
const CONVERSATION_NOT_FOUND_MESSAGE = "Conversazione non trovata.";

async function loadPage(context: AuthenticatedContext, conversationId: string, before?: string) {
  // Uno in più per sapere se esistono messaggi più vecchi.
  const records = await listMessages(context.db, conversationId, { limit: MESSAGE_PAGE_SIZE + 1, before });
  const hasMore = records.length > MESSAGE_PAGE_SIZE;
  const page = hasMore ? records.slice(1) : records;
  return { messages: await toMessageViews(context.db, page), hasMore };
}

export async function getCoachAIPageData(context: AuthenticatedContext, conversationId: string | null): Promise<CoachAIPageData> {
  const [conversations, automations, draftRecords, pendingAutomationEvents, activeConversation] = await Promise.all([
    listConversations(context.db, { archived: false }),
    listOwnAutomations(context),
    listAutomationDrafts(context.db, DRAFTS_LIMIT),
    countPendingAutomationEvents(context.db),
    conversationId ? findConversation(context.db, conversationId) : Promise.resolve(null),
  ]);

  const active = activeConversation
    ? { conversation: toConversationSummary(activeConversation), ...(await loadPage(context, activeConversation.id)) }
    : null;

  return {
    conversations: conversations.map(toConversationSummary),
    active,
    automations,
    drafts: draftRecords.flatMap((record) => toActionView(record) ?? []),
    pendingAutomationEvents,
  };
}

export async function searchConversations(
  context: AuthenticatedContext,
  query: { text: string; archived: boolean },
): Promise<ConversationSummary[]> {
  const conversations = await listConversations(context.db, { archived: query.archived, search: query.text });
  return conversations.map(toConversationSummary);
}

export async function getOlderMessages(
  context: AuthenticatedContext,
  conversationId: string,
  before: string,
): Promise<{ messages: ChatMessageView[]; hasMore: boolean }> {
  const conversation = await findConversation(context.db, conversationId);
  if (!conversation) {
    throw new NotFoundError(CONVERSATION_NOT_FOUND_MESSAGE);
  }
  return loadPage(context, conversation.id, before);
}

export async function renameConversation(context: AuthenticatedContext, conversationId: string, title: string): Promise<ConversationSummary> {
  const updated = await updateConversation(context.db, conversationId, { title, titleIsCustom: true });
  if (!updated) {
    throw new NotFoundError(CONVERSATION_NOT_FOUND_MESSAGE);
  }
  return toConversationSummary(updated);
}

export async function setConversationArchived(
  context: AuthenticatedContext,
  conversationId: string,
  archived: boolean,
): Promise<ConversationSummary> {
  const updated = await updateConversation(context.db, conversationId, { archivedAt: archived ? new Date().toISOString() : null });
  if (!updated) {
    throw new NotFoundError(CONVERSATION_NOT_FOUND_MESSAGE);
  }
  return toConversationSummary(updated);
}

/** Elimina la conversazione con messaggi e allegati. Il registro delle azioni resta (audit). */
export async function deleteConversation(context: AuthenticatedContext, conversationId: string): Promise<void> {
  const conversation = await findConversation(context.db, conversationId);
  if (!conversation) {
    throw new NotFoundError(CONVERSATION_NOT_FOUND_MESSAGE);
  }
  const attachments = await listAttachmentsForConversation(context.db, conversation.id);
  await removeConversationFiles(context.db, attachments);
  await deleteConversationRecord(context.db, conversation.id);
  logger.info("coachAi.conversation_deleted", { conversationId: conversation.id, attachments: attachments.length });
}
