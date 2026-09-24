"use client";

import { AlertDialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Button, buttonClasses } from "./button";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Deve restituire true se l'operazione è riuscita: solo allora il dialog si chiude. */
  onConfirm: () => Promise<boolean>;
};

/** Conferma esplicita prima di un'azione irreversibile (AlertDialog: il focus parte da "Annulla"). */
export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    const succeeded = await onConfirm();
    setIsPending(false);
    if (succeeded) {
      setIsOpen(false);
    }
  }

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !isPending && setIsOpen(open)}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-6 shadow-popover data-[state=open]:animate-pop-in">
          <AlertDialog.Title className="font-serif text-xl text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-ink-2">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel className={buttonClasses("secondary", "md")} disabled={isPending}>
              Annulla
            </AlertDialog.Cancel>
            <Button variant="primary" isLoading={isPending} onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
