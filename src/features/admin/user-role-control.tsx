"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-fields";
import { describeRoleChange } from "@/domain/roles";
import { ROLE_LABELS } from "@/lib/labels";
import { USER_ROLES, type UserRole } from "@/types/domain";
import { changeUserRoleAction } from "./actions";

type UserRoleControlProps = {
  userId: string;
  fullName: string;
  role: UserRole;
  assignedClientCount: number;
  /** Richiesta di iscrizione come cliente non ancora approvata (verrebbe eliminata passando allo staff). */
  hasOpenRegistration: boolean;
};

/** Cambio di ruolo in due passi: scelta, poi conferma con le conseguenze spiegate. */
export function UserRoleControl({ userId, fullName, role, assignedClientCount, hasOpenRegistration }: UserRoleControlProps) {
  const [selected, setSelected] = useState<UserRole>(role);
  const [syncedRole, setSyncedRole] = useState(role);
  const [isPending, startTransition] = useTransition();
  const selectId = `role-${userId}`;

  // Dopo un salvataggio (o un cambio fatto altrove) il ruolo arriva aggiornato dal server.
  if (role !== syncedRole) {
    setSyncedRole(role);
    setSelected(role);
  }

  const effects = selected === role ? [] : describeRoleChange(role, selected, { assignedClientCount, hasOpenRegistration });

  function confirm() {
    startTransition(async () => {
      const result = await changeUserRoleAction({ userId, role: selected });
      if (result.ok) {
        toast.success(`${fullName}: ruolo cambiato in ${ROLE_LABELS[selected]}`);
      } else {
        toast.error(result.error.message);
        setSelected(role);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId} className="sr-only">
        Ruolo di {fullName}
      </label>
      <Select
        id={selectId}
        value={selected}
        disabled={isPending}
        onChange={(event) => setSelected(USER_ROLES.find((candidate) => candidate === event.target.value) ?? role)}
        className="h-11 w-full rounded-lg border-line-strong/80 bg-surface"
      >
        {USER_ROLES.map((candidate) => (
          <option key={candidate} value={candidate}>
            {ROLE_LABELS[candidate]}
          </option>
        ))}
      </Select>

      {effects.length > 0 ? (
        <div role="group" aria-label="Conferma il cambio di ruolo" className="flex w-full flex-col gap-2 rounded-lg bg-sunken p-3 text-sm ring-1 ring-inset ring-line/70">
          <ul className="flex flex-col gap-1 text-ink-2">
            {effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={confirm} isLoading={isPending}>
              Conferma
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(role)} disabled={isPending}>
              Annulla
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
