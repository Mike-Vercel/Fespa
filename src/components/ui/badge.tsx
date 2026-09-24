import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_LABELS, FOLLOWUP_STATUS_LABELS } from "@/lib/labels";
import type { ClientStatus, FollowupStatus } from "@/types/domain";

export type BadgeTone = "neutral" | "accent" | "amber" | "rust" | "muted";

const TONES: Record<BadgeTone, { container: string; dot: string }> = {
  neutral: { container: "bg-sunken text-ink-2", dot: "bg-ink-3" },
  accent: { container: "bg-accent-soft text-accent-strong", dot: "bg-accent" },
  amber: { container: "bg-amber-soft text-amber", dot: "bg-amber" },
  rust: { container: "bg-rust-soft text-rust", dot: "bg-rust" },
  muted: { container: "bg-transparent text-ink-3 ring-1 ring-inset ring-line", dot: "bg-line-strong" },
};

export function Badge({
  tone = "neutral",
  withDot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  withDot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { container, dot } = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
        container,
        className,
      )}
    >
      {withDot ? <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

const CLIENT_STATUS_TONES: Record<ClientStatus, BadgeTone> = {
  onboarding: "neutral",
  active: "accent",
  paused: "amber",
  completed: "muted",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge tone={CLIENT_STATUS_TONES[status]} withDot>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const FOLLOWUP_STATUS_TONES: Record<FollowupStatus, BadgeTone> = {
  pending: "neutral",
  completed: "accent",
  cancelled: "muted",
};

export function FollowupStatusBadge({ status }: { status: FollowupStatus }) {
  return <Badge tone={FOLLOWUP_STATUS_TONES[status]}>{FOLLOWUP_STATUS_LABELS[status]}</Badge>;
}
