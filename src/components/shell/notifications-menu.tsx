"use client";

import { Bell, CalendarCheck2, CircleCheck, Inbox, UserCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavigationCountKey } from "./navigation";

type Notice = { href: string; icon: LucideIcon; count: number; text: string };

function noticesFor(counts: Record<NavigationCountKey, number>, showAdmin: boolean): Notice[] {
  const notices: Notice[] = [
    {
      href: "/checkins",
      icon: Inbox,
      count: counts.pendingCheckins,
      text: "check-in da revisionare",
    },
    {
      href: "/followups",
      icon: CalendarCheck2,
      count: counts.dueFollowups,
      text: counts.dueFollowups === 1 ? "follow-up di oggi o scaduto" : "follow-up di oggi o scaduti",
    },
  ];
  if (showAdmin) {
    notices.push({
      href: "/admin/registrations",
      icon: UserCheck,
      count: counts.pendingRegistrations,
      text: counts.pendingRegistrations === 1 ? "iscrizione da valutare" : "iscrizioni da valutare",
    });
  }
  return notices.filter((notice) => notice.count > 0);
}

/**
 * Campanella: le cose da gestire, dagli stessi contatori della sidebar (nessuna richiesta in più).
 * Ogni voce porta alla pagina dove si agisce.
 */
export function NotificationsMenu({ counts, showAdmin }: { counts: Record<NavigationCountKey, number>; showAdmin: boolean }) {
  const notices = noticesFor(counts, showAdmin);
  const total = notices.reduce((sum, notice) => sum + notice.count, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={total > 0 ? `Notifiche: ${total} cose da gestire` : "Notifiche: niente da gestire"}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface hover:text-ink data-[state=open]:bg-surface data-[state=open]:text-ink"
      >
        <Bell aria-hidden="true" className="size-[19px]" strokeWidth={1.75} />
        {total > 0 ? (
          <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-urgent ring-2 ring-paper" />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-ink">Da gestire</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notices.length === 0 ? (
          <p className="flex items-center gap-2 px-2.5 py-2 text-sm text-ink-3">
            <CircleCheck aria-hidden="true" className="size-4 text-accent" strokeWidth={1.75} />
            Sei in pari: niente da gestire.
          </p>
        ) : (
          notices.map((notice) => (
            <DropdownMenuItem key={notice.href} asChild>
              <Link href={notice.href}>
                <notice.icon aria-hidden="true" strokeWidth={1.75} />
                <span>
                  <span className="tabular font-semibold text-ink">{notice.count}</span> {notice.text}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
