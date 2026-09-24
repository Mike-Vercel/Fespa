import { cn } from "@/lib/cn";

/** Loader inline per azioni brevi (bottoni). Per i caricamenti di pagina si usano gli skeleton. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent",
        className,
      )}
    />
  );
}
