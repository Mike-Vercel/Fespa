"use client";

import { ClipboardCheck, Copy, Mail, MoreHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientApprovalStatus } from "@/types/domain";

type UserRowActionsProps = {
  fullName: string;
  email: string;
  /** Scheda cliente, se l'account ne ha una. */
  clientId: string | null;
  approvalStatus: ClientApprovalStatus | null;
};

/**
 * Menu "•••" di un account: solo azioni che esistono già (contatto, scheda, valutazione iscrizione).
 * Nessuna azione distruttiva: il cambio di ruolo ha il suo controllo con conferma accanto.
 */
export function UserRowActions({ fullName, email, clientId, approvalStatus }: UserRowActionsProps) {
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copiata");
    } catch {
      toast.error("Non è stato possibile copiare l'email.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Azioni per ${fullName}`}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken hover:text-ink data-[state=open]:bg-sunken data-[state=open]:text-ink"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <a href={`mailto:${email}`}>
            <Mail aria-hidden="true" strokeWidth={1.75} />
            Scrivi un&apos;email
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyEmail}>
          <Copy aria-hidden="true" strokeWidth={1.75} />
          Copia l&apos;email
        </DropdownMenuItem>
        {clientId && approvalStatus === "approved" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/clients/${clientId}`}>
                <UserRound aria-hidden="true" strokeWidth={1.75} />
                Apri la scheda cliente
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        {approvalStatus === "pending" || approvalStatus === "rejected" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/registrations">
                <ClipboardCheck aria-hidden="true" strokeWidth={1.75} />
                Valuta l&apos;iscrizione
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
