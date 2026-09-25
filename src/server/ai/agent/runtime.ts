import "server-only";
import { previewFromText, titleFromMessage } from "@/domain/coach-ai";
import { beginAIInteraction, type AIInteractionHandle } from "@/server/ai/interaction";
import { buildCoachAgentSystemPrompt, COACH_AGENT_PROMPT_VERSION } from "@/server/ai/prompts";
import { getAIProvider } from "@/server/ai/providers";
import type { AgentConversationMessage, AgentToolCall, AgentToolResult, AIProvider } from "@/server/ai/providers/types";
import type { AuthenticatedContext } from "@/server/auth/session";
import { AIProviderError, AppError, NotFoundError, toPublicError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { listOpenActionRequests } from "@/server/repositories/ai-action-requests";
import { linkAttachments } from "@/server/repositories/ai-attachments";
import {
  findConversation,
  findMessageByClientId,
  insertConversation,
  insertMessage,
  listMessages,
  updateConversation,
  updateMessage,
  type ConversationRecord,
} from "@/server/repositories/ai-conversations";
import type {
  ActionRequestView,
  ChatMessageView,
  Clarification,
  CoachAIStreamEvent,
  ToolActivity,
} from "@/types/coach-ai";
import type { PublicError } from "@/types/results";
import type { ChatRequest } from "@/validation/coach-ai";
import { createActionRequest, logDeniedTool, presentAction, toActionView } from "./actions";
import { createAgentContext } from "./agent-context";
import { loadAttachmentsForModel, resolveUnsentAttachments } from "./attachments";
import { assembleMessages, buildCurrentTurn, buildHistory, HISTORY_MESSAGE_LIMIT, renderApplicationContext } from "./context";
import { serializeMetadata, toAttachmentView, toConversationSummary, toMessageViews } from "./messages";
import { isToolAllowed } from "./policy";
import type { AgentActionTool, AgentContext } from "./tools/define";
import { agentToolsFor, findAgentTool } from "./tools/registry";

/*
 * RUNTIME di Coach AI: un turno di conversazione.
 *
 *  startCoachAgentTurn  → controlli PRIMA di scrivere qualsiasi cosa (provider, conversazione,
 *                         allegati, rate limit), poi salva il messaggio e prepara il contesto;
 *  streamCoachAgentTurn → streaming della risposta e loop dei tool. Ogni chiamata a un tool
 *                         passa da validazione Zod → ruolo → policy di rischio → service esistenti.
 *                         Non lancia mai: l'esito (completo, interrotto, fallito) viene salvato e inviato.
 */

/** Iterazioni massime del loop con i tool: contiene costi, latenza e cicli. */
const MAX_TOOL_STEPS = 8;
/** Con il ragionamento adattivo il limite include anche i token di thinking. */
const MAX_OUTPUT_TOKENS = 16_000;
/** Difesa in profondità: nessun turno può proporre una raffica di modifiche (es. testo malevolo in un check-in). */
const MAX_ACTIONS_PER_TURN = 5;
const MAX_DESTRUCTIVE_PER_TURN = 1;
const MESSAGE_MAX_LENGTH = 20_000;
const OPEN_ACTIONS_LIMIT = 8;

export type TurnSetup = {
  context: AgentContext;
  provider: AIProvider;
  interaction: AIInteractionHandle;
  conversation: ConversationRecord;
  userMessage: ChatMessageView;
  assistantMessageId: string;
  assistantCreatedAt: string;
  messages: AgentConversationMessage[];
};

function timeIn(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(now);
}

async function loadConversation(context: AgentContext, request: ChatRequest): Promise<ConversationRecord | null> {
  if (!request.conversationId) return null;
  // RLS: la conversazione di un altro utente non esiste per chi chiama.
  const conversation = await findConversation(context.auth.db, request.conversationId);
  if (!conversation) {
    throw new NotFoundError("Conversazione non trovata.");
  }
  if (conversation.archivedAt) {
    throw new ValidationError({}, "Questa conversazione è archiviata: ripristinala per continuare a scrivere.");
  }
  if (await findMessageByClientId(context.auth.db, conversation.id, request.clientMessageId)) {
    throw new ValidationError({}, "Questo messaggio è già stato inviato.");
  }
  return conversation;
}

export async function startCoachAgentTurn(auth: AuthenticatedContext, request: ChatRequest): Promise<TurnSetup> {
  const context = createAgentContext(auth);
  const provider = getAIProvider();
  if (provider.info.isMock) {
    throw new AIProviderError("demo_unsupported");
  }

  const existing = await loadConversation(context, request);
  const attachments = await resolveUnsentAttachments(auth.db, request.attachmentIds);
  // Rate limit PRIMA di creare messaggi: una richiesta rifiutata non lascia tracce nella chat.
  const interaction = await beginAIInteraction(
    { db: auth.db, userId: auth.coach.id },
    { requestType: "coach_agent", clientId: null, provider: provider.info },
  );

  try {
    const firstText = request.text || attachments[0]?.fileName || "";
    const conversation =
      existing ??
      (await insertConversation(auth.db, { ownerId: auth.coach.id, title: titleFromMessage(firstText), preview: previewFromText(firstText) }));

    const history = await listMessages(auth.db, conversation.id, { limit: HISTORY_MESSAGE_LIMIT });
    const userRecord = await insertMessage(auth.db, {
      conversationId: conversation.id,
      ownerId: auth.coach.id,
      role: "user",
      content: request.text,
      status: "complete",
      metadata: { attachmentIds: attachments.map((attachment) => attachment.id) },
      clientMessageId: request.clientMessageId,
    });
    await linkAttachments(auth.db, attachments.map((attachment) => attachment.id), { conversationId: conversation.id, messageId: userRecord.id });
    const assistantRecord = await insertMessage(auth.db, {
      conversationId: conversation.id,
      ownerId: auth.coach.id,
      role: "assistant",
      content: "",
      status: "streaming",
      provider: provider.info.provider,
      model: provider.info.model,
      promptVersion: COACH_AGENT_PROMPT_VERSION,
    });
    const updatedConversation =
      (await updateConversation(auth.db, conversation.id, { preview: previewFromText(firstText) })) ?? conversation;

    const [historyViews, openActions, loadedAttachments] = await Promise.all([
      toMessageViews(auth.db, history),
      listOpenActionRequests(auth.db, conversation.id, OPEN_ACTIONS_LIMIT),
      loadAttachmentsForModel(auth.db, attachments),
    ]);
    const applicationContext = renderApplicationContext({
      coach: auth.coach,
      today: context.today,
      time: timeIn(context.timezone, context.now),
      timezone: context.timezone,
      openActions: openActions.flatMap((record) => toActionView(record, context.now) ?? []),
    });

    return {
      context,
      provider,
      interaction,
      conversation: updatedConversation,
      userMessage: {
        id: userRecord.id,
        role: "user",
        content: userRecord.content,
        status: "complete",
        createdAt: userRecord.createdAt,
        activities: [],
        actions: [],
        clarification: null,
        attachments: attachments.map(toAttachmentView),
        error: null,
      },
      assistantMessageId: assistantRecord.id,
      assistantCreatedAt: assistantRecord.createdAt,
      messages: assembleMessages(
        buildHistory(historyViews),
        buildCurrentTurn({ applicationContext, attachments: loadedAttachments, text: request.text }),
      ),
    };
  } catch (error) {
    await interaction.fail(error);
    throw error;
  }
}

type TurnState = {
  text: string;
  activities: ToolActivity[];
  actions: Map<string, ActionRequestView>;
  clarification: Clarification | null;
  proposedActions: number;
  proposedDestructive: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toolResult(payload: Record<string, unknown>, options: { isError?: boolean; endTurn?: boolean } = {}): AgentToolResult {
  return { content: JSON.stringify(payload), isError: options.isError ?? false, endTurn: options.endTurn };
}

export async function streamCoachAgentTurn(
  setup: TurnSetup,
  options: { signal: AbortSignal; emit: (event: CoachAIStreamEvent) => void },
): Promise<void> {
  const { context, conversation, assistantMessageId } = setup;
  const { emit, signal } = options;
  const state: TurnState = { text: "", activities: [], actions: new Map(), clarification: null, proposedActions: 0, proposedDestructive: 0 };

  function upsertActivity(activity: ToolActivity): void {
    const index = state.activities.findIndex((existing) => existing.id === activity.id);
    if (index === -1) state.activities.push(activity);
    else state.activities[index] = activity;
    emit({ type: "activity", activity });
  }

  function recordAction(view: ActionRequestView): void {
    state.actions.set(view.id, view);
    emit({ type: "action", action: view });
  }

  async function propose(
    call: AgentToolCall,
    tool: AgentActionTool,
    rawInput: Record<string, unknown>,
    validInput: unknown,
    status: "draft" | "pending",
  ): Promise<AgentToolResult> {
    if (state.proposedActions >= MAX_ACTIONS_PER_TURN || (tool.risk === "destructive" && state.proposedDestructive >= MAX_DESTRUCTIVE_PER_TURN)) {
      upsertActivity({ id: call.id, tool: tool.name, status: "failed", label: "Troppe modifiche in una sola richiesta", links: [] });
      return toolResult(
        { status: "FAILED", message: "Limite di azioni per richiesta raggiunto: chiedi all'utente di procedere una modifica alla volta." },
        { isError: true },
      );
    }
    const prepared = await tool.prepare(context, validInput);
    const view = await createActionRequest(context, {
      tool,
      rawInput,
      validInput,
      prepared,
      status,
      conversationId: conversation.id,
      messageId: assistantMessageId,
      automationId: null,
      idempotencyScope: assistantMessageId,
    });
    state.proposedActions += 1;
    if (tool.risk === "destructive") state.proposedDestructive += 1;
    recordAction(view);
    upsertActivity({
      id: call.id,
      tool: tool.name,
      status: "requires_confirmation",
      label: status === "draft" ? "Bozza pronta, non inviata" : `Da confermare: ${prepared.title}`,
      links: [],
    });
    return toolResult({
      status: status === "draft" ? "DRAFT_READY" : "REQUIRES_CONFIRMATION",
      actionRequestId: view.id,
      summary:
        status === "draft"
          ? `${prepared.summaryForModel} L'utente può modificarla, copiarla o confermarne l'invio dalla scheda.`
          : prepared.summaryForModel,
    });
  }

  async function executeToolCall(call: AgentToolCall): Promise<AgentToolResult> {
    const tool = findAgentTool(call.name);
    if (!tool) {
      logger.warn("coachAi.tool_unknown", { tool: call.name });
      return toolResult({ status: "FAILED", message: `Strumento inesistente: ${call.name}.` }, { isError: true });
    }
    // Il ruolo si ricontrolla a ogni chiamata: non ci si fida della lista data al modello.
    if (!isToolAllowed(context.auth.coach.role, tool)) {
      if (tool.kind === "action") {
        await logDeniedTool(context, { conversationId: conversation.id, toolName: tool.name, riskLevel: tool.risk });
      }
      upsertActivity({ id: call.id, tool: tool.name, status: "denied", label: "Operazione non consentita al tuo ruolo", links: [] });
      return toolResult(
        { status: "FORBIDDEN", message: "Operazione non consentita al ruolo dell'utente. Spiegalo senza cercare alternative." },
        { isError: true },
      );
    }
    const validation = tool.validate(call.input);
    if (!validation.ok) {
      return toolResult({ status: "FAILED", message: validation.message }, { isError: true });
    }
    const input = validation.value;

    try {
      switch (tool.kind) {
        case "read": {
          upsertActivity({ id: call.id, tool: tool.name, status: "running", label: tool.runningLabel(input), links: [] });
          const output = await tool.run(context, input);
          upsertActivity({ id: call.id, tool: tool.name, status: "success", label: output.summary, links: output.links ?? [] });
          return toolResult({ status: "SUCCESS", data: output.data });
        }
        case "action":
          upsertActivity({ id: call.id, tool: tool.name, status: "running", label: tool.runningLabel(input), links: [] });
          return await propose(call, tool, asRecord(call.input), input, "pending");
        case "draft": {
          upsertActivity({ id: call.id, tool: tool.name, status: "running", label: tool.runningLabel(input), links: [] });
          const targetInput = tool.toTargetInput(input);
          const targetValidation = tool.target.validate(targetInput);
          if (!targetValidation.ok) {
            return toolResult({ status: "FAILED", message: targetValidation.message }, { isError: true });
          }
          return await propose(call, tool.target, targetInput, targetValidation.value, "draft");
        }
        case "control": {
          if (tool.control === "ask_clarification") {
            // Validato da clarificationSchema: forma identica a Clarification.
            state.clarification = input as Clarification;
            emit({ type: "clarification", clarification: state.clarification });
            return toolResult({ status: "SUCCESS", message: "Domanda mostrata all'utente: il turno termina qui." }, { endTurn: true });
          }
          const { actionRequestId } = input as { actionRequestId: string };
          const view = await presentAction(context, actionRequestId, { conversationId: conversation.id, messageId: assistantMessageId });
          recordAction(view);
          upsertActivity({ id: call.id, tool: tool.name, status: "requires_confirmation", label: `Da confermare: ${view.title}`, links: [] });
          return toolResult({ status: "REQUIRES_CONFIRMATION", actionRequestId: view.id, summary: "Azione ripresentata: serve la conferma dell'utente." });
        }
      }
    } catch (error) {
      // Nessun successo simulato: il modello riceve l'errore e la coach vede la riga "non riuscito".
      const message = error instanceof AppError ? error.userMessage : "Errore interno durante l'operazione.";
      if (error instanceof AppError && error.httpStatus < 500) {
        logger.warn("coachAi.tool_rejected", { tool: tool.name, code: error.code });
      } else {
        logger.error("coachAi.tool_failed", { tool: tool.name, error });
      }
      upsertActivity({ id: call.id, tool: tool.name, status: "failed", label: message, links: [] });
      return toolResult({ status: "FAILED", message }, { isError: true });
    }
  }

  async function finish(status: "complete" | "stopped" | "failed", error: PublicError | null): Promise<ChatMessageView> {
    const content = state.text.slice(0, MESSAGE_MAX_LENGTH);
    const metadata = serializeMetadata({
      activities: state.activities,
      actionIds: [...state.actions.keys()],
      clarification: state.clarification,
      error,
    });
    await updateMessage(context.auth.db, assistantMessageId, { content, status, metadata });
    // La vista rilegge le azioni: potrebbero essere già cambiate (es. confermate in un'altra scheda).
    const [view] = await toMessageViews(context.auth.db, [
      {
        id: assistantMessageId,
        conversationId: conversation.id,
        role: "assistant",
        content,
        status,
        metadata,
        clientMessageId: null,
        createdAt: setup.assistantCreatedAt,
      },
    ]);
    return view;
  }

  try {
    const result = await setup.provider.streamAgent({
      purpose: "coach_agent",
      system: buildCoachAgentSystemPrompt(),
      messages: setup.messages,
      tools: agentToolsFor(context.auth.coach.role).map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      maxSteps: MAX_TOOL_STEPS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      signal,
      onTextDelta: (delta) => {
        state.text += delta;
        emit({ type: "text", delta });
      },
      executeTool: executeToolCall,
    });
    const message = await finish("complete", null);
    const updated = await updateConversation(context.auth.db, conversation.id, { preview: conversation.preview });
    emit({ type: "done", message, conversation: toConversationSummary(updated ?? conversation) });
    await setup.interaction.succeed(result.usage);
  } catch (error) {
    if (signal.aborted) {
      // "Stop": si salva ciò che è stato scritto finora, dichiarato come interrotto.
      const message = await finish("stopped", null).catch(() => null);
      if (message) emit({ type: "done", message, conversation: toConversationSummary(conversation) });
      await setup.interaction.succeed({ inputTokens: null, outputTokens: null, cacheReadTokens: null }).catch(() => undefined);
      return;
    }
    const publicError = toPublicError(error);
    const message = await finish("failed", publicError).catch((finishError) => {
      logger.error("coachAi.finish_failed", { error: finishError });
      return null;
    });
    emit({ type: "error", error: publicError, message });
    await setup.interaction.fail(error).catch(() => undefined);
  }
}
