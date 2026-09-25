"use client";

import { CalendarPlus, Dumbbell, FileImage, FileText, Lightbulb, Paperclip, Plus, SearchCheck, SendHorizontal, Square, Users, X, type LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useImperativeHandle, useId, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { toast } from "sonner";
import { ACCEPTED_FILE_INPUT, ACCEPTED_TYPES_LABEL, ATTACHMENT_TYPES, mimeTypeFromFileName } from "@/domain/coach-ai-attachments";
import { formatFileSize } from "@/domain/coach-ai";
import { cn } from "@/lib/cn";
import type { AttachmentView } from "@/types/coach-ai";
import { ATTACHMENT_MAX_BYTES, COACH_AI_MESSAGE_MAX_LENGTH, MAX_ATTACHMENTS_PER_MESSAGE } from "@/validation/coach-ai";
import { removeAttachmentAction } from "../actions";
import { uploadAttachment } from "../stream-client";

export type ComposerHandle = {
  addFiles: (files: File[]) => void;
  focus: () => void;
};

type PendingAttachment = {
  localId: string;
  fileName: string;
  sizeBytes: number;
  kind: AttachmentView["kind"];
  status: "uploading" | "ready" | "error";
  progress: number;
  view: AttachmentView | null;
  error: string | null;
  abort: AbortController;
};

type ComposerProps = {
  ref?: Ref<ComposerHandle>;
  isStreaming: boolean;
  /** Motivo per cui non si può scrivere (AI non attiva, conversazione archiviata…). */
  disabledReason: string | null;
  onSend: (text: string, attachments: AttachmentView[]) => boolean;
  onStop: () => void;
};

type QuickAction = { label: string; description: string; Icon: LucideIcon; tone: string } & (
  | { send: string }
  | { insert: string }
  | { attach: true }
);

/** Azioni del menu "+": inviano una richiesta completa o preparano il testo da completare. */
const ATTACH_ACTION: QuickAction = {
  label: "Allega file",
  description: "PDF, TXT, CSV o immagini (max 4 MB)",
  Icon: Paperclip,
  tone: "bg-sunken text-ink-2",
  attach: true,
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Crea piano",
    description: "Piano di allenamento per una cliente",
    Icon: Dumbbell,
    tone: "bg-urgent-soft text-urgent",
    insert: "Crea un piano di allenamento di 4 settimane per ",
  },
  {
    label: "Analizza check-in",
    description: "Punti chiave dei check-in in attesa",
    Icon: SearchCheck,
    tone: "bg-kpi-orange text-kpi-orange-ink",
    send: "Analizza i check-in ancora da revisionare: riassumi i punti importanti e dimmi chi ha bisogno di una risposta per prima.",
  },
  {
    label: "Suggerisci strategie",
    description: "Motivazione, abitudini, ostacoli",
    Icon: Lightbulb,
    tone: "bg-brand-soft text-brand",
    insert: "Suggeriscimi delle strategie per ",
  },
  {
    label: "Clienti prioritari",
    description: "Chi controllare per prima oggi",
    Icon: Users,
    tone: "bg-info-soft text-info",
    send: "Quali clienti devo controllare oggi?",
  },
  {
    label: "Crea follow-up",
    description: "Pianifica un controllo con una cliente",
    Icon: CalendarPlus,
    tone: "bg-kpi-green text-kpi-green-ink",
    insert: "Programma un follow-up con ",
  },
];

function QuickActionItem({ action, onSelect }: { action: QuickAction; onSelect: (action: QuickAction) => void }) {
  return (
    <DropdownMenuItem onSelect={() => onSelect(action)} className="h-auto items-center gap-3 py-2 [&_svg]:text-inherit">
      <span aria-hidden="true" className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-xl", action.tone)}>
        <action.Icon strokeWidth={1.9} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] font-medium text-ink">{action.label}</span>
        <span className="text-[12.5px] leading-snug text-ink-3">{action.description}</span>
      </span>
    </DropdownMenuItem>
  );
}

const MAX_TEXTAREA_HEIGHT = 200;

function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function Composer({ ref, isStreaming, disabledReason, onSend, onStop }: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusAfterMenu = useRef<number | null>(null);
  const inputId = useId();
  const isDisabled = disabledReason !== null;
  const isUploading = attachments.some((attachment) => attachment.status === "uploading");
  const readyAttachments = attachments.flatMap((attachment) => (attachment.status === "ready" && attachment.view ? [attachment.view] : []));
  const canSend = !isDisabled && !isStreaming && !isUploading && (text.trim() !== "" || readyAttachments.length > 0);

  function resize() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  function setValue(value: string) {
    setText(value);
    requestAnimationFrame(resize);
  }

  function updateAttachment(localId: string, changes: Partial<PendingAttachment>) {
    setAttachments((current) => current.map((attachment) => (attachment.localId === localId ? { ...attachment, ...changes } : attachment)));
  }

  function addFiles(files: File[]) {
    if (isDisabled) return;
    const room = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
    if (files.length > room) {
      toast.error(`Puoi allegare al massimo ${MAX_ATTACHMENTS_PER_MESSAGE} file per messaggio.`);
    }
    for (const file of files.slice(0, Math.max(room, 0))) {
      const mimeType = mimeTypeFromFileName(file.name);
      if (!mimeType) {
        toast.error(`“${file.name}”: formato non supportato. Puoi allegare file ${ACCEPTED_TYPES_LABEL}.`);
        continue;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        toast.error(`“${file.name}” supera il limite di ${formatFileSize(ATTACHMENT_MAX_BYTES)}.`);
        continue;
      }
      const pending: PendingAttachment = {
        localId: crypto.randomUUID(),
        fileName: file.name,
        sizeBytes: file.size,
        kind: ATTACHMENT_TYPES[mimeType].kind,
        status: "uploading",
        progress: 0,
        view: null,
        error: null,
        abort: new AbortController(),
      };
      setAttachments((current) => [...current, pending]);
      void uploadAttachment(file, {
        signal: pending.abort.signal,
        onProgress: (progress) => updateAttachment(pending.localId, { progress }),
      }).then((result) => {
        if (pending.abort.signal.aborted) return;
        if (result.ok) {
          updateAttachment(pending.localId, { status: "ready", progress: 1, view: result.data });
        } else {
          const message = Object.values(result.error.fieldErrors ?? {})[0]?.[0] ?? result.error.message;
          updateAttachment(pending.localId, { status: "error", error: message });
        }
      });
    }
  }

  function removeAttachment(attachment: PendingAttachment) {
    attachment.abort.abort();
    setAttachments((current) => current.filter((candidate) => candidate.localId !== attachment.localId));
    // Il file già caricato ma non inviato viene eliminato anche dallo storage.
    if (attachment.view) void removeAttachmentAction(attachment.view.id);
  }

  useImperativeHandle(ref, () => ({ addFiles, focus: () => textareaRef.current?.focus() }));

  function submit(value = text) {
    if (isDisabled || isStreaming || isUploading) return;
    const trimmed = value.trim();
    if (trimmed === "" && readyAttachments.length === 0) return;
    if (onSend(trimmed, readyAttachments)) {
      setValue("");
      setAttachments([]);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter invia, Shift+Enter va a capo. Su touch Enter va a capo (si invia con il pulsante).
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !isTouchDevice()) {
      event.preventDefault();
      submit();
    }
  }

  function runQuickAction(action: QuickAction) {
    if ("attach" in action) {
      fileInputRef.current?.click();
    } else if ("send" in action) {
      submit(action.send);
    } else {
      setValue(action.insert);
      // Il cursore va nella casella quando il menu si chiude (vedi onCloseAutoFocus).
      focusAfterMenu.current = action.insert.length;
    }
  }

  function handleMenuClose(event: Event) {
    const caret = focusAfterMenu.current;
    if (caret === null) return;
    event.preventDefault();
    focusAfterMenu.current = null;
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(caret, caret);
  }

  return (
    // relative: l'input file "sr-only" resta ancorato qui e non crea scroll orizzontale.
    <div className="relative flex flex-col gap-2">
      {disabledReason ? (
        <p role="status" className="rounded-xl bg-warning-soft/80 px-3.5 py-2.5 text-[13.5px] leading-snug text-warning">
          {disabledReason}
        </p>
      ) : null}

      <div
        className={cn(
          "rounded-2xl border border-line/90 bg-white shadow-[0_1px_2px_rgb(31_29_26/0.04),0_14px_34px_-24px_rgb(58_48_120/0.35)] transition-colors focus-within:border-brand/40",
          isDisabled && "opacity-70",
        )}
      >
        {attachments.length > 0 ? (
          <ul aria-label="Allegati da inviare" className="flex gap-2 overflow-x-auto px-3 pt-3 [scrollbar-width:thin]">
            {attachments.map((attachment) => {
              const Icon = attachment.kind === "image" ? FileImage : FileText;
              return (
                <li
                  key={attachment.localId}
                  className={cn(
                    "relative flex w-56 shrink-0 items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2",
                    attachment.status === "error" ? "border-urgent/40 bg-urgent-soft" : "border-line/80 bg-sunken/60",
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-5 shrink-0", attachment.status === "error" ? "text-urgent" : "text-brand-violet")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{attachment.fileName}</span>
                    <span className={cn("block truncate text-[12px]", attachment.status === "error" ? "text-urgent" : "text-ink-3")}>
                      {attachment.status === "error"
                        ? attachment.error
                        : attachment.status === "uploading"
                          ? `Caricamento… ${Math.round(attachment.progress * 100)}%`
                          : formatFileSize(attachment.sizeBytes)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment)}
                    aria-label={`Rimuovi ${attachment.fileName}`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                  {attachment.status === "uploading" ? (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand/15">
                      <span className="block h-full bg-brand transition-[width]" style={{ width: `${Math.round(attachment.progress * 100)}%` }} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="px-4 pt-3 sm:px-5">
          <label htmlFor={inputId} className="sr-only">
            Messaggio per Coach AI
          </label>
          <textarea
            ref={textareaRef}
            id={inputId}
            value={text}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            rows={1}
            maxLength={COACH_AI_MESSAGE_MAX_LENGTH}
            placeholder="Scrivi un messaggio a Coach AI..."
            className="block max-h-[200px] min-h-10 w-full resize-none bg-transparent py-2 text-base leading-6 text-ink outline-none placeholder:text-ink-3 sm:text-[15px]"
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1 sm:px-4">
          {/* Un solo pulsante "+" con allegati e azioni rapide, come in ChatGPT. */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              disabled={isDisabled || isStreaming}
              aria-label="Allegati e azioni rapide"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line/90 bg-white text-ink-2 transition-colors hover:bg-sunken/70 hover:text-ink disabled:pointer-events-none disabled:opacity-55 data-[state=open]:bg-sunken data-[state=open]:text-ink"
            >
              <Plus aria-hidden="true" className="size-5 transition-transform duration-200 [[data-state=open]>&]:rotate-45" strokeWidth={1.9} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              onCloseAutoFocus={handleMenuClose}
              className="w-[min(20rem,calc(100vw-2rem))] p-1.5"
            >
              <QuickActionItem action={ATTACH_ACTION} onSelect={runQuickAction} />
              <DropdownMenuSeparator />
              {QUICK_ACTIONS.map((action) => (
                <QuickActionItem key={action.label} action={action} onSelect={runQuickAction} />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Interrompi la risposta"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink-hover"
            >
              <Square aria-hidden="true" className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit()}
              disabled={!canSend}
              aria-label="Invia messaggio"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-violet text-white shadow-[0_8px_18px_-10px_rgb(81_86_216/0.9)] transition-[opacity,transform] hover:scale-[1.03] disabled:opacity-45 disabled:hover:scale-100"
            >
              <SendHorizontal aria-hidden="true" className="size-[19px]" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_INPUT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
