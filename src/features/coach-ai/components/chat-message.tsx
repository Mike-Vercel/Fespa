"use client";

import { Check, CircleX, FileImage, FileText, Hand, ShieldAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { formatFileSize } from "@/domain/coach-ai";
import { cn } from "@/lib/cn";
import type { ActionRequestView, AttachmentView, ChatMessageView, ClarificationOption, ToolActivity } from "@/types/coach-ai";
import { formatMessageTime } from "../format";
import { ActionCard } from "./action-card";
import { Markdown } from "./markdown";

type Clock = { now: Date; timezone: string };

/** Il marchio "Ai" accanto alle risposte, come nel design di riferimento. */
export function AiMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-serif text-[17px] italic text-brand",
        className,
      )}
    >
      Ai
    </span>
  );
}

export function AttachmentChip({ attachment, className }: { attachment: AttachmentView; className?: string }) {
  const Icon = attachment.kind === "image" ? FileImage : FileText;
  return (
    <span className={cn("inline-flex max-w-full items-center gap-2 rounded-xl border border-line/80 bg-white px-3 py-2 text-[13px] text-ink", className)}>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-brand-violet" />
      <span className="min-w-0 truncate font-medium">{attachment.fileName}</span>
      <span className="shrink-0 text-ink-3">{formatFileSize(attachment.sizeBytes)}</span>
    </span>
  );
}

export function UserMessage({ message, userName, clock }: { message: ChatMessageView; userName: string; clock: Clock }) {
  return (
    <div data-message="user" className="flex flex-col items-end gap-1.5">
      <div className="flex max-w-full items-start justify-end gap-3">
        <div className="flex min-w-0 max-w-[min(100%,40rem)] flex-col items-end gap-2">
          {message.attachments.length > 0 ? (
            <div className="flex max-w-full flex-wrap justify-end gap-2">
              {message.attachments.map((attachment) => (
                <AttachmentChip key={attachment.id} attachment={attachment} />
              ))}
            </div>
          ) : null}
          {message.content ? (
            <p className="whitespace-pre-line break-words rounded-2xl rounded-tr-md bg-brand-soft px-4 py-3 text-[15px] leading-relaxed text-ink sm:px-5 sm:py-3.5">
              {message.content}
            </p>
          ) : null}
        </div>
        <Avatar name={userName} size="md" className="hidden sm:inline-flex" />
      </div>
      <time dateTime={message.createdAt} suppressHydrationWarning className="pr-0.5 text-[12px] text-ink-3 sm:pr-[3.25rem]">
        {formatMessageTime(message.createdAt, clock.now, clock.timezone)}
      </time>
    </div>
  );
}

const ACTIVITY_ICONS: Record<Exclude<ToolActivity["status"], "running">, { Icon: LucideIcon; className: string }> = {
  success: { Icon: Check, className: "text-kpi-green-ink" },
  failed: { Icon: CircleX, className: "text-urgent" },
  requires_confirmation: { Icon: Hand, className: "text-brand" },
  denied: { Icon: ShieldAlert, className: "text-urgent" },
};

function ActivityList({ activities }: { activities: ToolActivity[] }) {
  if (activities.length === 0) return null;
  return (
    <ul aria-label="Operazioni di Coach AI" className="flex flex-col gap-1.5">
      {activities.map((activity) => {
        const icon = activity.status === "running" ? null : ACTIVITY_ICONS[activity.status];
        return (
          <li key={activity.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] text-ink-2">
            {icon ? <icon.Icon aria-hidden="true" className={cn("size-4 shrink-0", icon.className)} strokeWidth={2.2} /> : <Spinner />}
            <span className={cn(activity.status === "running" && "text-ink-3")}>{activity.label}</span>
            {activity.links.slice(0, 2).map((link) => (
              <Link key={link.href} href={link.href} className="text-[13px] font-medium text-brand underline-offset-4 hover:underline">
                {link.label}
              </Link>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

type AssistantMessageProps = {
  message: ChatMessageView;
  isStreaming: boolean;
  /** Le scelte di un chiarimento sono attive solo sull'ultima risposta. */
  canAnswerClarification: boolean;
  onClarify: (option: ClarificationOption) => void;
  onActionChange: (action: ActionRequestView) => void;
  onRetry?: () => void;
  readOnly: boolean;
};

export function AssistantMessage({ message, isStreaming, canAnswerClarification, onClarify, onActionChange, onRetry, readOnly }: AssistantMessageProps) {
  const hasRunningActivity = message.activities.some((activity) => activity.status === "running");
  const isThinking = isStreaming && message.content === "" && !hasRunningActivity;

  return (
    <div data-message="assistant" data-status={message.status} className="flex items-start gap-3 sm:gap-4">
      <AiMark className="mt-0.5 hidden sm:inline-flex" />
      <div className="flex min-w-0 max-w-[46rem] flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-line/70 bg-white px-4 py-4 shadow-[0_1px_2px_rgb(31_29_26/0.03)] sm:px-6 sm:py-5">
          <ActivityList activities={message.activities} />
          {isThinking ? (
            <p role="status" className="flex items-center gap-2 text-[14px] text-ink-3">
              <span aria-hidden="true" className="coach-ai-typing">
                <span />
                <span />
                <span />
              </span>
              Sto pensando…
            </p>
          ) : null}
          {message.content ? (
            <div className={cn(message.activities.length > 0 && "border-t border-line/70 pt-3")}>
              <Markdown source={message.content} />
              {isStreaming ? <span aria-hidden="true" className="coach-ai-caret" /> : null}
            </div>
          ) : null}
          {message.status === "stopped" ? <p className="text-[13px] text-ink-3">Risposta interrotta.</p> : null}
          {message.status === "failed" || message.error ? (
            <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-urgent-soft px-3.5 py-2.5 text-[14px] text-urgent">
              <span>{message.error?.message ?? "La risposta non è stata completata."}</span>
              {onRetry ? (
                <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">
                  Riprova
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {message.actions.map((action) => (
          <ActionCard key={action.id} action={action} onChange={onActionChange} readOnly={readOnly} />
        ))}

        {message.clarification ? (
          <div className="rounded-2xl border border-brand/20 bg-brand-soft/60 px-4 py-4 sm:px-5">
            <p className="text-[15px] font-medium text-ink">{message.clarification.question}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {message.clarification.options.map((option) => (
                <button
                  key={`${option.label}-${option.reply}`}
                  type="button"
                  disabled={!canAnswerClarification || readOnly}
                  onClick={() => onClarify(option)}
                  className="flex min-h-11 flex-col items-start justify-center rounded-xl border border-line/80 bg-white px-4 py-2 text-left transition-colors hover:border-brand/40 hover:bg-white disabled:cursor-default disabled:opacity-60"
                >
                  <span className="text-[14px] font-medium text-ink">{option.label}</span>
                  {option.description ? <span className="text-[12.5px] text-ink-3">{option.description}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
