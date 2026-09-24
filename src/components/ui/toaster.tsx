"use client";

import { Toaster as Sonner } from "sonner";

/** Toast discreti, annunciati agli screen reader (aria-live gestito da sonner). */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink shadow-popover sm:w-[360px]",
          title: "font-medium",
          description: "mt-0.5 text-ink-2",
          icon: "mt-0.5 text-ink-3",
          success: "[&_[data-icon]]:text-accent",
          error: "[&_[data-icon]]:text-rust",
        },
      }}
    />
  );
}
