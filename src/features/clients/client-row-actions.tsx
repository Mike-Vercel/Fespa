"use client";

import { CalendarCheck2, Inbox, MoreHorizontal, NotebookPen, UserRound } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACTIONS = [
  { tab: null, label: "Apri la scheda", icon: UserRound },
  { tab: "checkins", label: "Check-in", icon: Inbox },
  { tab: "followups", label: "Follow-up", icon: CalendarCheck2 },
  { tab: "notes", label: "Note", icon: NotebookPen },
] as const;

/**
 * Menu "•••" di una riga: scorciatoie verso le sezioni della scheda cliente (solo navigazione,
 * nessuna azione distruttiva). Sta sopra il link che rende cliccabile tutta la riga.
 */
export function ClientRowActions({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Azioni per ${clientName}`}
        className="relative z-10 inline-flex size-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface hover:text-ink data-[state=open]:bg-surface data-[state=open]:text-ink"
      >
        <MoreHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {ACTIONS.map((action) => (
          <DropdownMenuItem key={action.label} asChild>
            <Link href={action.tab ? `/clients/${clientId}?tab=${action.tab}` : `/clients/${clientId}`}>
              <action.icon aria-hidden="true" strokeWidth={1.75} />
              {action.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
