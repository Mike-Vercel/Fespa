"use client";

import { useRef, useState } from "react";
import type { ActionRequestView, AttachmentView, ChatMessageView, CoachAIStreamEvent, ConversationSummary } from "@/types/coach-ai";
import type { PublicError } from "@/types/results";
import { loadOlderMessagesAction } from "./actions";
import { streamChat } from "./stream-client";

type ChatSession = {
  conversation: ConversationSummary | null;
  messages: ChatMessageView[];
  hasMore: boolean;
};

type UseCoachChatOptions = ChatSession & {
  /** Conversazione creata o aggiornata dal server (nuovo titolo, anteprima, ultimo aggiornamento). */
  onConversation: (conversation: ConversationSummary) => void;
  /** Inizio e fine di una risposta: il genitore non deve sostituire la conversazione a metà. */
  onStreamingChange: (isStreaming: boolean) => void;
};

function emptyMessage(id: string, role: ChatMessageView["role"], overrides: Partial<ChatMessageView> = {}): ChatMessageView {
  return {
    id,
    role,
    content: "",
    status: "complete",
    createdAt: new Date().toISOString(),
    activities: [],
    actions: [],
    clarification: null,
    attachments: [],
    error: null,
    ...overrides,
  };
}

/** Stato di una conversazione e invio dei messaggi con risposta in streaming. */
export function useCoachChat({
  conversation: initialConversation,
  messages: initialMessages,
  hasMore: initialHasMore,
  onConversation,
  onStreamingChange,
}: UseCoachChatOptions) {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [lastFailure, setLastFailure] = useState<{ messageId: string; text: string; attachments: AttachmentView[] } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef(initialConversation);
  // Il testo arriva a piccoli pezzi: si accumula e si disegna una volta per frame.
  const pendingText = useRef("");
  const frame = useRef<number | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  function patchMessage(id: string, update: (message: ChatMessageView) => ChatMessageView) {
    setMessages((current) => current.map((message) => (message.id === id ? update(message) : message)));
  }

  function flushText() {
    frame.current = null;
    const delta = pendingText.current;
    pendingText.current = "";
    const id = assistantIdRef.current;
    if (delta && id) patchMessage(id, (message) => ({ ...message, content: message.content + delta }));
  }

  function queueText(delta: string) {
    pendingText.current += delta;
    frame.current ??= requestAnimationFrame(flushText);
  }

  function finishStreaming() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    flushText();
    if (abortRef.current) onStreamingChange(false);
    abortRef.current = null;
    setStreamingId(null);
  }

  function setActiveConversation(summary: ConversationSummary) {
    conversationRef.current = summary;
    setConversation(summary);
    onConversation(summary);
  }

  function handleEvent(event: CoachAIStreamEvent, localUserId: string) {
    switch (event.type) {
      case "start": {
        const localAssistantId = assistantIdRef.current;
        assistantIdRef.current = event.assistantMessageId;
        setStreamingId(event.assistantMessageId);
        setMessages((current) =>
          current.map((message) => {
            if (message.id === localUserId) return event.userMessage;
            if (message.id === localAssistantId) return { ...message, id: event.assistantMessageId };
            return message;
          }),
        );
        setActiveConversation(event.conversation);
        break;
      }
      case "text":
        queueText(event.delta);
        break;
      case "activity": {
        const id = assistantIdRef.current;
        if (!id) break;
        patchMessage(id, (message) => {
          const exists = message.activities.some((activity) => activity.id === event.activity.id);
          return {
            ...message,
            activities: exists
              ? message.activities.map((activity) => (activity.id === event.activity.id ? event.activity : activity))
              : [...message.activities, event.activity],
          };
        });
        break;
      }
      case "action": {
        const id = assistantIdRef.current;
        if (!id) break;
        patchMessage(id, (message) => ({
          ...message,
          actions: [...message.actions.filter((action) => action.id !== event.action.id), event.action],
        }));
        break;
      }
      case "clarification": {
        const id = assistantIdRef.current;
        if (id) patchMessage(id, (message) => ({ ...message, clarification: event.clarification }));
        break;
      }
      case "done":
      case "error": {
        finishStreaming();
        const id = assistantIdRef.current;
        const final = event.message;
        if (id && final) {
          setMessages((current) => current.map((message) => (message.id === id ? final : message)));
        } else if (id && event.type === "error") {
          patchMessage(id, (message) => ({ ...message, status: "failed", error: event.error }));
        }
        if (event.type === "done") setActiveConversation(event.conversation);
        break;
      }
    }
  }

  /** Restituisce false se non è il momento di inviare (es. risposta ancora in corso). */
  function send(text: string, attachments: AttachmentView[]): boolean {
    if (abortRef.current) return false;
    const clientMessageId = crypto.randomUUID();
    const localUserId = `local-${clientMessageId}`;
    const localAssistantId = `pending-${clientMessageId}`;
    const controller = new AbortController();
    abortRef.current = controller;
    onStreamingChange(true);
    assistantIdRef.current = localAssistantId;
    setLastFailure(null);
    setStreamingId(localAssistantId);
    setMessages((current) => [
      ...current,
      emptyMessage(localUserId, "user", { content: text, attachments }),
      emptyMessage(localAssistantId, "assistant", { status: "streaming" }),
    ]);

    void streamChat(
      { conversationId: conversationRef.current?.id ?? null, clientMessageId, text, attachmentIds: attachments.map((attachment) => attachment.id) },
      { signal: controller.signal, onEvent: (event) => handleEvent(event, localUserId) },
    ).then((outcome) => {
      const assistantId = assistantIdRef.current;
      if (outcome.ok) {
        // Stream chiuso senza esito finale (es. connessione interrotta dal server).
        if (abortRef.current === controller) {
          finishStreaming();
          if (assistantId) patchMessage(assistantId, (message) => (message.status === "streaming" ? { ...message, status: "stopped" } : message));
        }
        return;
      }
      finishStreaming();
      if (outcome.aborted) {
        if (assistantId) patchMessage(assistantId, (message) => ({ ...message, status: "stopped" }));
        return;
      }
      if (assistantId?.startsWith("pending-")) {
        // Rifiutata prima di iniziare (rate limit, AI non attiva…): nessuna risposta, si può riprovare.
        setMessages((current) => current.filter((message) => message.id !== assistantId));
        failSend(localUserId, text, attachments, outcome.error);
      } else if (assistantId) {
        patchMessage(assistantId, (message) => ({ ...message, status: "failed", error: outcome.error }));
      }
    });
    return true;
  }

  function failSend(messageId: string, text: string, attachments: AttachmentView[], error: PublicError) {
    patchMessage(messageId, (message) => ({ ...message, status: "failed", error }));
    setLastFailure({ messageId, text, attachments });
  }

  function retry() {
    if (!lastFailure) return;
    const { messageId, text, attachments } = lastFailure;
    setMessages((current) => current.filter((message) => message.id !== messageId));
    send(text, attachments);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function updateAction(view: ActionRequestView) {
    setMessages((current) =>
      current.map((message) =>
        message.actions.some((action) => action.id === view.id)
          ? { ...message, actions: message.actions.map((action) => (action.id === view.id ? view : action)) }
          : message,
      ),
    );
  }

  async function loadOlder(): Promise<boolean> {
    const first = messages.find((message) => !message.id.startsWith("local-") && !message.id.startsWith("pending-"));
    if (!conversation || !first || isLoadingOlder) return false;
    setIsLoadingOlder(true);
    const result = await loadOlderMessagesAction({ conversationId: conversation.id, before: first.createdAt });
    setIsLoadingOlder(false);
    if (!result.ok) return false;
    setMessages((current) => [...result.data.messages, ...current]);
    setHasMore(result.data.hasMore);
    return true;
  }

  return {
    conversation,
    setConversation: (summary: ConversationSummary) => {
      conversationRef.current = summary;
      setConversation(summary);
    },
    messages,
    hasMore,
    isLoadingOlder,
    isStreaming: streamingId !== null,
    streamingId,
    canRetry: lastFailure !== null,
    send,
    stop,
    retry,
    updateAction,
    loadOlder,
  };
}
