"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { describedBy, Field, Select } from "@/components/ui/form-fields";
import { ROLE_LABELS } from "@/lib/labels";
import type { StaffMember } from "@/server/repositories/client-accounts";
import { reviewRegistrationAction } from "./actions";

type RegistrationDecisionProps = {
  clientId: string;
  fullName: string;
  staff: StaffMember[];
  /** Una richiesta già rifiutata si può solo riconsiderare (approvare). */
  canReject: boolean;
  isRestore?: boolean;
};

export function RegistrationDecision({ clientId, fullName, staff, canReject, isRestore = false }: RegistrationDecisionProps) {
  const [coachId, setCoachId] = useState("");
  const [coachErrors, setCoachErrors] = useState<string[] | undefined>();
  const [isPending, startTransition] = useTransition();
  const selectId = `coach-${clientId}`;

  function approve() {
    startTransition(async () => {
      const result = await reviewRegistrationAction({ clientId, decision: isRestore ? "pending" : "approved", ...(isRestore ? {} : { coachId }) });
      if (result.ok) {
        const coach = staff.find((member) => member.id === coachId);
        toast.success(isRestore ? `${fullName} è tornata tra le richieste da approvare` : `${fullName} approvata${coach ? ` e assegnata a ${coach.fullName}` : ""}`);
        return;
      }
      setCoachErrors(result.error.fieldErrors?.coachId);
      if (!result.error.fieldErrors?.coachId) {
        toast.error(result.error.message);
      }
    });
  }

  async function reject(): Promise<boolean> {
    const result = await reviewRegistrationAction({ clientId, decision: "rejected" });
    if (result.ok) {
      toast.success("Richiesta rifiutata");
      return true;
    }
    toast.error(result.error.message);
    return false;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {isRestore ? null : (
        <Field id={selectId} label="Coach da assegnare (facoltativa)" errors={coachErrors} className="sm:w-64">
          <Select
            id={selectId}
            value={coachId}
            onChange={(event) => {
              setCoachId(event.target.value);
              setCoachErrors(undefined);
            }}
            {...describedBy(selectId, coachErrors)}
          >
            <option value="">Nessuna coach per ora</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
                {member.role === "coach" ? "" : ` (${ROLE_LABELS[member.role]})`}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="flex flex-wrap gap-2">
          <Button
          variant="primary"
          onClick={approve}
          isLoading={isPending}
          icon={<Check aria-hidden="true" className="size-4" strokeWidth={2} />}
          >
            {isRestore ? "Ripristina" : coachId ? "Approva e assegna" : "Approva senza assegnare"}
        </Button>
        {canReject ? (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" disabled={isPending} icon={<X aria-hidden="true" className="size-4" strokeWidth={2} />}>
                Rifiuta
              </Button>
            }
            title={`Rifiutare la richiesta di ${fullName}?`}
            description="La persona non potrà usare l'area clienti. Potrai riconsiderare la richiesta più avanti da questa pagina."
            confirmLabel="Rifiuta richiesta"
            onConfirm={reject}
          />
        ) : null}
      </div>
    </div>
  );
}
