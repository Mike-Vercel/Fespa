"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import type { InviteOutcome } from "@/server/services/client-accounts";
import type { ClientListItem } from "@/types/domain";
import { resendInviteAction } from "./actions";
import { InviteOutcomeNotice } from "./invite-outcome";

type ClientAccountStatusProps = {
  client: Pick<ClientListItem, "id" | "fullName" | "email" | "hasAccount" | "approvalStatus">;
};

/** Stato dell'accesso all'area clienti, con il reinvio dell'invito finché la cliente non si registra. */
export function ClientAccountStatus({ client }: ClientAccountStatusProps) {
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null);

  function resend() {
    startTransition(async () => {
      const result = await resendInviteAction(client.id);
      if (result.ok) {
        setOutcome(result.data);
      } else {
        toast.error(result.error.message);
      }
    });
  }

  if (client.approvalStatus === "pending") {
    return <Badge tone="amber">Iscrizione da approvare</Badge>;
  }
  if (client.approvalStatus === "rejected") {
    return <Badge tone="rust">Iscrizione rifiutata</Badge>;
  }
  if (client.hasAccount) {
    return <Badge tone="accent">Area clienti attiva</Badge>;
  }
  if (!client.email) {
    return <Badge tone="muted">Senza accesso all&apos;area clienti</Badge>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="amber">Invitata · non ancora registrata</Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={resend}
        isLoading={isPending}
        icon={<Send aria-hidden="true" className="size-3.5" />}
      >
        Reinvia invito
      </Button>

      <Dialog open={outcome !== null} onOpenChange={(open) => !open && setOutcome(null)}>
        <DialogContent title={`Invito per ${client.fullName}`}>
          {outcome ? (
            <div className="flex flex-col gap-6">
              <InviteOutcomeNotice outcome={outcome} idPrefix="resend" />
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button variant="secondary">Chiudi</Button>
                </DialogClose>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
