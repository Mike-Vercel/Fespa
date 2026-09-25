import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/*
 * Skeleton di pagina: riproducono la struttura del contenuto finale (stesse altezze,
 * stessi separatori) così il passaggio al contenuto reale non sposta il layout.
 */

export function PageHeaderSkeleton({ withEyebrow = true }: { withEyebrow?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {withEyebrow ? <Skeleton className="h-3.5 w-40" /> : null}
      <Skeleton className="mt-1 h-9 w-72 max-w-full sm:h-10" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div className="border-b border-line pb-3">
      <Skeleton className="h-6 w-44" />
    </div>
  );
}

function ListRowsSkeleton({ rows, withAvatar = true }: { rows: number; withAvatar?: boolean }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 py-3.5">
          {withAvatar ? <Skeleton className="size-10 shrink-0 rounded-full" /> : null}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Righe di check-in: chi, messaggio, quattro punteggi, stato e azione (come CheckinList). */
export function CheckinListSkeleton({ rows = 4, withAction = false }: { rows?: number; withAction?: boolean }) {
  return (
    <div className="divide-y divide-line/80">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 py-4 xl:flex-row xl:items-center xl:gap-6">
          <div className="flex items-center gap-3.5 xl:w-44 xl:shrink-0 2xl:w-52">
            <Skeleton className="size-[42px] shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-full max-w-md" />
            <Skeleton className="h-3.5 w-3/4 max-w-sm" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 sm:gap-x-4">
            {Array.from({ length: 4 }, (_, metric) => (
              <div key={metric} className="flex flex-col gap-1.5 sm:w-14">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3.5 w-7" />
                <Skeleton className="h-[3px] w-14" />
              </div>
            ))}
          </div>
          <Skeleton className="h-7 w-32 rounded-full" />
          {withAction ? <Skeleton className="h-10 w-full rounded-lg sm:w-52" /> : null}
        </div>
      ))}
    </div>
  );
}

const DASHBOARD_PANEL = "rounded-2xl border border-line/80 bg-surface px-5 py-5 sm:px-6";

/** Stessa struttura della dashboard: saluto + briefing, quattro KPI, i due pannelli (2/3 + 1/3). */
export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Caricamento della dashboard" className="flex flex-col gap-5">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between xl:gap-10">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-80 max-w-full sm:h-14 sm:w-[26rem]" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl xl:mt-2 xl:w-[24.5rem]" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:mt-1 xl:grid-cols-4 xl:gap-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-start gap-4 rounded-2xl border border-line/80 bg-surface px-5 py-6">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10 w-14" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className={DASHBOARD_PANEL}>
          <SectionHeaderSkeleton />
          <ListRowsSkeleton rows={5} />
        </div>
        <div className={DASHBOARD_PANEL}>
          <SectionHeaderSkeleton />
          <ListRowsSkeleton rows={4} withAvatar={false} />
        </div>
      </div>
      <div className={DASHBOARD_PANEL}>
        <SectionHeaderSkeleton />
        <CheckinListSkeleton />
      </div>
    </LoadingRegion>
  );
}

/** Stessa struttura della pagina Clienti: titolo grande, pulsante, un pannello con filtri e tabella. */
export function ClientListSkeleton() {
  return (
    <LoadingRegion label="Caricamento delle clienti" className="flex flex-col gap-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-48 sm:h-14" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-12 w-44 rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line/80 bg-surface">
        <div className="flex flex-col gap-4 px-5 py-5 lg:px-6 xl:flex-row xl:items-center">
          <Skeleton className="h-10 w-full rounded-lg xl:w-[21rem]" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg sm:w-56 xl:ml-auto" />
        </div>
        <div className="divide-y divide-line/70 border-t border-line/80">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-3.5 lg:px-6">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="hidden h-4 w-28 md:block" />
              <Skeleton className="hidden h-6 w-28 rounded-full md:block" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ClientDetailSkeleton() {
  return (
    <LoadingRegion label="Caricamento della scheda cliente" className="flex flex-col gap-8">
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="flex gap-6 border-b border-line pb-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Skeleton className="h-6 w-32" />
          <ListRowsSkeleton rows={4} withAvatar={false} />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function FollowupPageSkeleton() {
  return (
    <LoadingRegion label="Caricamento dei follow-up" className="flex flex-col gap-10">
      <PageHeaderSkeleton withEyebrow={false} />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index}>
          <SectionHeaderSkeleton />
          <ListRowsSkeleton rows={3} withAvatar={false} />
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Stessa struttura della pagina Check-in: titolo grande, un pannello con intestazione, filtri e righe. */
export function CheckinInboxSkeleton() {
  return (
    <LoadingRegion label="Caricamento dei check-in" className="flex flex-col gap-7">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-56 sm:h-14" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line/80 bg-surface">
        <div className="flex flex-col gap-3 border-b border-line/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-16 rounded-full" />
          </div>
        </div>
        <div className="px-5 lg:px-6">
          <CheckinListSkeleton rows={6} withAction />
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Stessa struttura della pagina Iscrizioni: intestazione, "Da approvare" e righe delle richieste. */
export function RegistrationsSkeleton() {
  return (
    <LoadingRegion label="Caricamento delle iscrizioni" className="flex flex-col gap-12">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-60 sm:h-14" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-2xl border border-line/80 bg-surface px-5 py-5 lg:px-6 xl:flex-row xl:items-center xl:gap-8">
              <div className="flex items-center gap-4 xl:flex-1">
                <Skeleton className="size-14 shrink-0 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
              <div className="flex flex-col gap-2.5 xl:flex-1">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex flex-col gap-2.5 xl:flex-1">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function PortalSkeleton() {
  return (
    <LoadingRegion label="Caricamento della tua area" className="flex flex-col gap-10">
      <PageHeaderSkeleton />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div>
        <SectionHeaderSkeleton />
        <ListRowsSkeleton rows={3} withAvatar={false} />
      </div>
    </LoadingRegion>
  );
}

export function UsersSkeleton() {
  return (
    <LoadingRegion label="Caricamento degli utenti" className="flex flex-col gap-10">
      <PageHeaderSkeleton />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index}>
          <SectionHeaderSkeleton />
          <ListRowsSkeleton rows={3} />
        </div>
      ))}
    </LoadingRegion>
  );
}
