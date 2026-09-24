"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { signOutEverywhereAction } from "@/features/auth/actions";

export function SignOutEverywhere() {
  return (
    <ConfirmDialog
      trigger={<Button variant="secondary">Esci da tutti i dispositivi</Button>}
      title="Uscire da tutti i dispositivi?"
      description="Tutte le sessioni aperte con il tuo account verranno chiuse, compresa questa. Dovrai accedere di nuovo."
      confirmLabel="Esci ovunque"
      onConfirm={async () => {
        // In caso di successo l'azione reindirizza al login.
        await signOutEverywhereAction();
        return true;
      }}
    />
  );
}
