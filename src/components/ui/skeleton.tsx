import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Segnaposto di caricamento: va dimensionato come il contenuto finale per evitare layout shift. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-md", className)} />;
}

/** Contenitore annunciato agli screen reader mentre il contenuto è in caricamento. */
export function LoadingRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
