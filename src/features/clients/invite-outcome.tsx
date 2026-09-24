import { AlertTriangle, MailCheck, UserRoundPlus } from "lucide-react";
import { CopyField } from "@/components/ui/copy-field";
import type { InviteOutcome } from "@/server/services/client-accounts";

const FAILURE_MESSAGES = {
  rate_limited: "Il servizio email ha raggiunto il limite di invii per ora.",
  failed: "Il servizio email non ha accettato l'invio.",
} as const;

/** Esito di un invito: cosa è successo e, se serve, il link da condividere a mano. */
export function InviteOutcomeNotice({ outcome, idPrefix }: { outcome: InviteOutcome; idPrefix: string }) {
  if (outcome.delivery === "not_requested") {
    return (
      <p className="flex items-start gap-3 text-sm text-ink-2">
        <UserRoundPlus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-3" />
        Senza email la cliente non ha accesso all&apos;area clienti: i check-in restano gestiti da te.
      </p>
    );
  }

  const linkField = (
    <CopyField id={`${idPrefix}-signup-link`} label="Link di registrazione da condividere" value={outcome.signupUrl} />
  );

  if (outcome.delivery === "sent") {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-3 text-sm text-ink-2">
          <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            Abbiamo inviato a <span className="font-medium text-ink">{outcome.email}</span> il link per entrare e completare
            il profilo. Se non lo trova (controlli lo spam), puoi condividere tu questo link.
          </span>
        </p>
        {linkField}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="alert" className="flex items-start gap-3 rounded-md bg-amber-soft px-3.5 py-3 text-sm text-amber">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {FAILURE_MESSAGES[outcome.delivery]} Condividi questo link con la cliente (WhatsApp, SMS…) oppure riprova più tardi
          dalla sua scheda.
        </span>
      </p>
      {linkField}
    </div>
  );
}
