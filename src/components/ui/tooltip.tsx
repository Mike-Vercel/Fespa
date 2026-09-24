"use client";

import { Tooltip as RadixTooltip } from "radix-ui";
import type { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={250} skipDelayDuration={150}>
      {children}
    </RadixTooltip.Provider>
  );
}

type TooltipProps = {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Se false il tooltip non viene montato (es. sidebar espansa: l'etichetta è già visibile). */
  enabled?: boolean;
  children: ReactNode;
};

export function Tooltip({ content, side = "top", enabled = true, children }: TooltipProps) {
  if (!enabled) {
    return children;
  }

  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-on-ink shadow-popover data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
