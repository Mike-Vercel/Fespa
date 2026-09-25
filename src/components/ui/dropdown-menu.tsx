"use client";

import { DropdownMenu as RadixMenu } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;

export function DropdownMenuContent({
  align = "end",
  side = "bottom",
  className,
  onCloseAutoFocus,
  children,
}: {
  align?: "start" | "center" | "end";
  /** "top" per i menu aperti da elementi in fondo alla pagina (es. il composer di Coach AI). */
  side?: "top" | "bottom";
  className?: string;
  /** Per decidere dove va il focus alla chiusura (preventDefault lo lascia dov'è). */
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        side={side}
        sideOffset={8}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn(
          "z-50 min-w-52 rounded-lg border border-line bg-surface p-1.5 shadow-popover data-[state=open]:animate-pop-in",
          className,
        )}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

export const MENU_ITEM_CLASSES =
  "flex h-9 w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-sm text-ink outline-none data-[highlighted]:bg-hover [&_svg]:size-4 [&_svg]:text-ink-3";

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof RadixMenu.Item>) {
  return <RadixMenu.Item className={cn(MENU_ITEM_CLASSES, className)} {...props} />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <RadixMenu.Label className="px-2.5 pb-2 pt-1.5">{children}</RadixMenu.Label>;
}

export function DropdownMenuSeparator() {
  return <RadixMenu.Separator className="my-1.5 h-px bg-line" />;
}
