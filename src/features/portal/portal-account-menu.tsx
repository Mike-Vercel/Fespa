"use client";

import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
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

export function PortalAccountMenu({ fullName, email }: { fullName: string; email: string }) {
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account di ${fullName}`}
        className="flex h-10 items-center gap-2.5 rounded-md pl-1 pr-2 transition-colors hover:bg-hover data-[state=open]:bg-hover"
      >
        <Avatar name={fullName} size="sm" />
        <span className="hidden max-w-40 truncate text-sm font-medium text-ink sm:block">{fullName}</span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-ink-3 sm:block" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-ink">{fullName}</span>
          <span className="block truncate text-xs text-ink-3">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/area-cliente/profilo">
            <UserRound aria-hidden="true" strokeWidth={1.75} />I miei dati
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/reimposta-password">
            <KeyRound aria-hidden="true" strokeWidth={1.75} />
            Cambia password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSigningOut} onSelect={() => startSignOut(() => signOutAction())}>
          <LogOut aria-hidden="true" strokeWidth={1.75} />
          {isSigningOut ? "Uscita in corso…" : "Esci"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
