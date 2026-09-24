"use client";

import { UsersRound } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/labels";
import type { StaffMember } from "@/server/repositories/client-accounts";
import { MAX_COACHES_PER_CLIENT } from "@/validation/users";
import { setClientCoachesAction } from "./actions";

type ClientCoachesEditorProps = {
  clientId: string;
  clientName: string;
  staff: StaffMember[];
  coachIds: string[];
};

/** Coach assegnate a una cliente: visibili e modificabili solo dall'amministrazione. */
export function ClientCoachesEditor({ clientId, clientName, staff, coachIds }: ClientCoachesEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(coachIds);
  const [isPending, startTransition] = useTransition();
  const assigned = staff.filter((member) => coachIds.includes(member.id));

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) setSelected(coachIds);
  }

  function toggle(coachId: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, coachId] : current.filter((id) => id !== coachId)));
  }

  function save() {
    startTransition(async () => {
      const result = await setClientCoachesAction({ clientId, coachIds: selected });
      if (result.ok) {
        toast.success("Coach aggiornate");
        setIsOpen(false);
      } else {
        toast.error(result.error.fieldErrors?.coachIds?.[0] ?? result.error.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-ink-3">Coach</span>
      {assigned.length > 0 ? (
        <span className="text-ink">{assigned.map((member) => member.fullName).join(", ")}</span>
      ) : (
        <Badge tone="amber">Senza coach</Badge>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !isPending && handleOpenChange(open)}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" icon={<UsersRound aria-hidden="true" className="size-3.5" />}>
            Modifica
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Coach assegnate"
          description={`Chi segue ${clientName}. Ogni coach vede solo le clienti che le sono assegnate.`}
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">Seleziona le coach</legend>
            {staff.map((member) => {
              const checked = selected.includes(member.id);
              return (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-sm text-ink hover:bg-hover"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selected.length >= MAX_COACHES_PER_CLIENT}
                    onChange={(event) => toggle(member.id, event.target.checked)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <span className="flex-1">{member.fullName}</span>
                  {member.role === "coach" ? null : <span className="text-xs text-ink-3">{ROLE_LABELS[member.role]}</span>}
                </label>
              );
            })}
          </fieldset>
          {selected.length === 0 ? (
            <p className="mt-3 text-xs text-amber">Senza coach la cliente resta visibile solo all&apos;amministrazione.</p>
          ) : null}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isPending}>
                Annulla
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={save} isLoading={isPending}>
              Salva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
