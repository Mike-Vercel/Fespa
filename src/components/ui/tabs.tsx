"use client";

import { Tabs as RadixTabs } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <RadixTabs.List
      aria-label={label}
      // Su mobile le tab scorrono orizzontalmente invece di andare a capo.
      className={cn(
        "-mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0",
        className,
      )}
    >
      {children}
    </RadixTabs.List>
  );
}

export function TabsTrigger({ value, count, children }: { value: string; count?: number; children: ReactNode }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className="relative inline-flex h-11 shrink-0 items-center gap-2 text-sm font-medium text-ink-3 transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent after:transition-colors hover:text-ink data-[state=active]:text-ink data-[state=active]:after:bg-ink"
    >
      {children}
      {count !== undefined ? <span className="tabular text-xs font-normal text-ink-3">{count}</span> : null}
    </RadixTabs.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cn("pt-6 focus-visible:outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  );
}
