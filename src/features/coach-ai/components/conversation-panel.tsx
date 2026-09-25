"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  FileClock,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  SquarePen,
  Trash2,
  Upload,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { ActionRequestView, ChatMessageView, ConversationSummary } from "@/types/coach-ai";
import { formatUpdatedAt } from "../format";
import { useCoachChat } from "../use-coach-chat";
import { AiMark, AssistantMessage, UserMessage } from "./chat-message";
import { Composer, type ComposerHandle } from "./composer";

type Clock = { now: Date; timezone: string };

type ConversationPanelProps = {
  initial: { conversation: ConversationSummary | null; messages: ChatMessageView[]; hasMore: boolean };
  /** Titolo e stato aggiornati dalla lista (rinomina, archiviazione). */
  summary: ConversationSummary | null;
  userName: string;
  clock: Clock;
  aiDisabledReason: string | null;
  draftsCount: number;
  onConversation: (conversation: ConversationSummary) => void;
  onStreamingChange: (isStreaming: boolean) => void;
  onActionChange: (action: ActionRequestView) => void;
  onOpenList: () => void;
  onOpenDrafts: () => void;
  onNewChat: () => void;
  onRename: (conversation: ConversationSummary) => void;
  onArchive: (conversation: ConversationSummary, archived: boolean) => void;
  onDelete: (conversation: ConversationSummary) => void;
};

const STICK_TO_BOTTOM_PX = 140;
const SHOW_JUMP_BUTTON_PX = 320;

const SUGGESTIONS = [
  "Quali clienti devo controllare oggi?",
  "Fammi vedere i check-in ancora da revisionare.",
  "Mostrami i follow-up scaduti.",
  "Riassumimi com'è andata la settimana delle mie clienti.",
];

function transcriptOf(title: string, messages: ChatMessageView[]): string {
  const lines = messages
    .filter((message) => message.content.trim() !== "")
    .map((message) => `${message.role === "user" ? "Tu" : "Coach AI"}:\n${message.content.trim()}`);
  return [`Coach AI — ${title}`, ...lines].join("\n\n");
}

export function ConversationPanel({
  initial,
  summary,
  userName,
  clock,
  aiDisabledReason,
  draftsCount,
  onConversation,
  onStreamingChange,
  onActionChange,
  onOpenList,
  onOpenDrafts,
  onNewChat,
  onRename,
  onArchive,
  onDelete,
}: ConversationPanelProps) {
  const chat = useCoachChat({ ...initial, onConversation, onStreamingChange });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const stickToBottom = useRef(true);
  const olderAnchor = useRef<number | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const conversation = summary ?? chat.conversation;
  const isArchived = conversation?.archived === true;
  const disabledReason = isArchived ? "Questa conversazione è archiviata: ripristinala per continuare a scrivere." : aiDisabledReason;
  const lastMessage = chat.messages.at(-1);

  // Dopo ogni aggiornamento: resta in fondo se ci si era già, o mantieni la posizione dopo "messaggi precedenti".
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (olderAnchor.current !== null) {
      scroller.scrollTop = scroller.scrollHeight - olderAnchor.current;
      olderAnchor.current = null;
      return;
    }
    if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight;
  }, [chat.messages]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    stickToBottom.current = distance < STICK_TO_BOTTOM_PX;
    setShowJump(distance > SHOW_JUMP_BUTTON_PX);
  }

  function jumpToBottom() {
    const scroller = scrollerRef.current;
    stickToBottom.current = true;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }

  async function loadOlder() {
    const scroller = scrollerRef.current;
    olderAnchor.current = scroller ? scroller.scrollHeight - scroller.scrollTop : null;
    if (!(await chat.loadOlder())) {
      olderAnchor.current = null;
      toast.error("Non è stato possibile caricare i messaggi precedenti.");
    }
  }

  // Costante (non dichiarazione di funzione): con "send" dichiarata come function il React Compiler 1.0
  // la rinominava e al primo render la passava come undefined al composer.
  const sendMessage = (text: string, attachments: Parameters<typeof chat.send>[1]): boolean => {
    stickToBottom.current = true;
    return chat.send(text, attachments);
  };

  function handleActionChange(action: ActionRequestView) {
    chat.updateAction(action);
    onActionChange(action);
  }

  async function share() {
    if (!conversation) return;
    const text = transcriptOf(conversation.title, chat.messages);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `Coach AI — ${conversation.title}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Conversazione copiata: puoi incollarla dove vuoi.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Non è stato possibile condividere la conversazione.");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) composerRef.current?.addFiles(files);
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDragOver={(event) => {
        if (disabledReason || !Array.from(event.dataTransfer.types).includes("Files")) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line/80 px-3 py-3 sm:gap-3 sm:px-5 lg:px-6 lg:py-4">
        <button
          type="button"
          onClick={onOpenList}
          aria-label="Apri le conversazioni"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-hover hover:text-ink xl:hidden"
        >
          <PanelLeft aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[16px] font-semibold text-ink sm:text-[18px]">{conversation?.title ?? "Nuova chat"}</h2>
            {conversation ? (
              <button
                type="button"
                onClick={() => onRename(conversation)}
                aria-label="Rinomina la conversazione"
                className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:inline-flex"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
          <p className="truncate text-[12.5px] text-ink-3 sm:text-[13px]" suppressHydrationWarning>
            {conversation
              ? `${isArchived ? "Archiviata · " : ""}Ultimo aggiornamento ${formatUpdatedAt(conversation.updatedAt, clock.now, clock.timezone)}`
              : "Chiedi, analizza, prepara risposte e azioni"}
          </p>
        </div>
        {conversation ? (
          <button
            type="button"
            onClick={() => void share()}
            className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-line/90 bg-white px-4 text-[14px] font-medium text-ink transition-colors hover:bg-sunken/70 sm:inline-flex"
          >
            <Upload aria-hidden="true" className="size-4" strokeWidth={1.9} />
            Condividi
          </button>
        ) : null}
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Nuova chat"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-hover hover:text-ink xl:hidden"
        >
          <SquarePen aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </button>
        {conversation ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Altre azioni sulla conversazione"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-ink-2 transition-colors hover:bg-hover hover:text-ink sm:border-line/90 sm:bg-white"
            >
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onRename(conversation)}>
                <Pencil aria-hidden="true" />
                Rinomina
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void share()} className="sm:hidden">
                <Upload aria-hidden="true" />
                Condividi
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onArchive(conversation, !isArchived)}>
                {isArchived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                {isArchived ? "Ripristina" : "Archivia"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onDelete(conversation)} className="text-urgent [&_svg]:text-urgent">
                <Trash2 aria-hidden="true" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollerRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {chat.messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-[46rem] flex-col items-center justify-center gap-6 px-4 py-10 text-center sm:px-6">
              <AiMark className="size-14 text-[24px]" />
              <div>
                <p className="font-serif text-[28px] leading-tight text-ink sm:text-[32px]">Come posso aiutarti oggi?</p>
                <p className="mx-auto mt-2 max-w-[32rem] text-[15px] leading-relaxed text-ink-2">
                  Posso leggere i dati delle tue clienti, preparare risposte e proporti azioni. Non modifico nulla senza la tua conferma.
                </p>
              </div>
              {draftsCount > 0 ? (
                <button
                  type="button"
                  onClick={onOpenDrafts}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-[14px] font-medium text-brand transition-colors hover:bg-brand-soft/70"
                >
                  <FileClock aria-hidden="true" className="size-4" />
                  {draftsCount === 1 ? "1 risposta pronta da revisionare" : `${draftsCount} risposte pronte da revisionare`}
                </button>
              ) : null}
              <div className="grid w-full gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={disabledReason !== null || chat.isStreaming}
                    onClick={() => sendMessage(suggestion, [])}
                    className="rounded-2xl border border-line/80 bg-white px-4 py-3.5 text-left text-[14px] leading-snug text-ink transition-colors hover:border-brand/30 hover:bg-brand-soft/40 disabled:opacity-55"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-6 px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
              {chat.hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={chat.isLoadingOlder}
                  className="mx-auto inline-flex items-center gap-2 rounded-full border border-line/80 bg-white px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink"
                >
                  {chat.isLoadingOlder ? <Spinner /> : null}
                  Messaggi precedenti
                </button>
              ) : null}
              {chat.messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex flex-col items-end gap-2">
                    <UserMessage message={message} userName={userName} clock={clock} />
                    {message.error ? (
                      <p role="alert" className="flex flex-wrap items-center justify-end gap-x-3 text-[13.5px] text-urgent sm:pr-[3.25rem]">
                        <span>Non inviato: {message.error.message}</span>
                        {chat.canRetry ? (
                          <button type="button" onClick={chat.retry} className="font-semibold underline underline-offset-4">
                            Riprova
                          </button>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    isStreaming={message.id === chat.streamingId}
                    canAnswerClarification={message === lastMessage && !chat.isStreaming}
                    onClarify={(option) => sendMessage(option.reply, [])}
                    onActionChange={handleActionChange}
                    readOnly={isArchived}
                  />
                ),
              )}
            </div>
          )}
        </div>
        {showJump ? (
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute bottom-3 left-1/2 inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-line/80 bg-white px-4 text-[13px] font-medium text-ink shadow-popover"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
            Torna in fondo
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 lg:px-6 lg:pb-5">
        <div className="mx-auto w-full max-w-[56rem]">
          <Composer ref={composerRef} isStreaming={chat.isStreaming} disabledReason={disabledReason} onSend={sendMessage} onStop={chat.stop} />
        </div>
      </div>

      {isDragging ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand/50 bg-brand-soft/80 text-[15px] font-medium text-brand">
          Rilascia qui i file da allegare
        </div>
      ) : null}
    </div>
  );
}
