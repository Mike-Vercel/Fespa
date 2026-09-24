import { CloudOff, Info, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import type { ErrorCode, PublicError } from "@/types/results";

const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  "AI_UNAVAILABLE",
  "AI_TIMEOUT",
  "AI_INVALID_OUTPUT",
  "NETWORK_ERROR",
  "INTERNAL_ERROR",
]);

/** Errore di una funzione AI: messaggio comprensibile e, quando ha senso, "Riprova". */
export function AIErrorNotice({ error, onRetry }: { error: PublicError; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-rust-soft text-rust">
        <CloudOff aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </span>
      <p className="flex-1 text-sm text-pretty text-ink-2">
        {error.message}
        {error.code === "UNAUTHENTICATED" ? (
          <>
            {" "}
            <Link href="/login" className="font-medium text-ink underline underline-offset-4">
              Accedi di nuovo
            </Link>
          </>
        ) : null}
      </p>
      {onRetry && RETRYABLE.has(error.code) ? (
        <Button size="sm" variant="secondary" onClick={onRetry} icon={<RotateCcw aria-hidden="true" className="size-3.5" />}>
          Riprova
        </Button>
      ) : null}
    </div>
  );
}

/** Mostrato al posto dei pulsanti AI quando nessun provider è configurato. */
export function AINotConfiguredNotice() {
  return (
    <p className="flex items-center gap-2 text-xs text-ink-3">
      <Info aria-hidden="true" className="size-3.5" strokeWidth={2} />
      AI provider non configurato. Le altre funzioni restano disponibili.
    </p>
  );
}

/** Skeleton dell'analisi: stessa struttura del pannello finale. */
export function AIAnalysisSkeleton() {
  return (
    <LoadingRegion label="L'AI sta analizzando il check-in" className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <p className="mt-2 text-xs text-ink-3">L&apos;AI sta leggendo il check-in e lo storico recente…</p>
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </LoadingRegion>
  );
}
