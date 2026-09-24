"use client";

import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Dialog e Sheet accessibili (focus trap, Esc, aria-modal) basati su Radix.
 * Sheet = stesso dialog ancorato a un lato: menu mobile e pannello del Copilot.
 */

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

const OVERLAY =
  "fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out";

type DialogContentProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

function DialogHeader({ title, description }: Pick<DialogContentProps, "title" | "description">) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <RadixDialog.Title className="font-serif text-xl leading-snug text-ink">{title}</RadixDialog.Title>
        {description ? (
          <RadixDialog.Description className="mt-1 text-sm text-pretty text-ink-2">{description}</RadixDialog.Description>
        ) : null}
      </div>
      <RadixDialog.Close
        aria-label="Chiudi"
        className="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-hover hover:text-ink"
      >
        <X aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
      </RadixDialog.Close>
    </div>
  );
}

export function DialogContent({ title, description, className, children }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-surface p-5 shadow-popover sm:p-6",
          "data-[state=open]:animate-pop-in data-[state=closed]:animate-fade-out",
          className,
        )}
      >
        <DialogHeader title={title} description={description} />
        <div className="mt-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

const SHEET_SIDES = {
  left: "inset-y-0 left-0 w-[288px] max-w-[85vw] border-r data-[state=open]:animate-slide-in-left",
  right: "inset-y-0 right-0 w-full sm:max-w-[460px] sm:border-l data-[state=open]:animate-slide-in-right",
} as const;

type SheetContentProps = DialogContentProps & {
  side: keyof typeof SHEET_SIDES;
  /** Titolo solo per le tecnologie assistive (es. menu mobile, dove il logo fa da intestazione). */
  hideHeader?: boolean;
};

export function SheetContent({ side, title, description, hideHeader = false, className, children }: SheetContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed z-50 flex flex-col border-line bg-surface shadow-popover data-[state=closed]:animate-fade-out",
          SHEET_SIDES[side],
          className,
        )}
      >
        {hideHeader ? (
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
        ) : (
          <div className="border-b border-line px-5 py-4">
            <DialogHeader title={title} description={description} />
          </div>
        )}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
