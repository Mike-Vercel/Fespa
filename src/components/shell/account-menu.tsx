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

type AccountMenuProps = {
  fullName: string;
  email: string;
  roleLabel: string;
};

export function AccountMenu({ fullName, email, roleLabel }: AccountMenuProps) {
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account di ${fullName}`}
        className="flex h-10 items-center gap-2.5 rounded-md pl-1 pr-2 transition-colors hover:bg-hover data-[state=open]:bg-hover"
      >
        <Avatar name={fullName} size="sm" />
        <span className="hidden max-w-40 truncate text-sm font-medium text-ink md:block">{fullName}</span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-ink-3 md:block" strokeWidth={1.75} />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-ink">{fullName}</span>
          <span className="block truncate text-xs text-ink-3">
            {email} · {roleLabel}
          </span>
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
