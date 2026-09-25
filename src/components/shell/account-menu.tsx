"use client";

import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";
import type { AIStatus } from "@/types/domain";
import { AIStatusPill } from "./ai-status-pill";

type AccountMenuProps = {
  fullName: string;
  email: string;
  roleLabel: string;
  /** Stato dell'AI (attiva, demo, non configurata): dichiarato qui e accanto a ogni risultato AI. */
  aiStatus: AIStatus;
};

export function AccountMenu({ fullName, email, roleLabel, aiStatus }: AccountMenuProps) {
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account di ${fullName}`}
        className="flex h-11 items-center gap-3 rounded-full pl-1 pr-1 transition-colors hover:bg-surface data-[state=open]:bg-surface md:pr-3"
      >
        <Avatar name={fullName} size="sm" className="size-9 text-[13px]" />
        <span className="hidden max-w-48 truncate text-[15px] font-medium text-ink md:block">{fullName}</span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-ink-2 md:block" strokeWidth={1.75} />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-ink">{fullName}</span>
          <span className="block truncate text-xs text-ink-3">
            {email} · {roleLabel}
          </span>
          <AIStatusPill status={aiStatus} className="mt-2.5 h-7" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden="true" strokeWidth={1.75} />
            Profilo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" strokeWidth={1.75} />
            Impostazioni
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={() => startSignOut(() => signOutAction())}
        >
          <LogOut aria-hidden="true" strokeWidth={1.75} />
          {isSigningOut ? "Uscita in corso…" : "Esci"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
