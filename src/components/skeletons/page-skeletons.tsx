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

export function CheckinListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="grid grid-cols-1 gap-3 py-4 xl:grid-cols-[220px_minmax(0,1fr)_240px_minmax(150px,auto)] xl:items-center xl:gap-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full max-w-lg" />
          <div className="grid max-w-[260px] grid-cols-3 gap-3">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Caricamento della dashboard" className="flex flex-col gap-10">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-px border-y border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 bg-paper px-4 py-5 sm:px-5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-10 w-14" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <SectionHeaderSkeleton />
          <ListRowsSkeleton rows={5} />
        </div>
        <div className="lg:col-span-5">
          <SectionHeaderSkeleton />
          <ListRowsSkeleton rows={4} withAvatar={false} />
        </div>
      </div>
      <div>
        <SectionHeaderSkeleton />
        <CheckinListSkeleton />
      </div>
    </LoadingRegion>
  );
}

export function ClientListSkeleton() {
  return (
    <LoadingRegion label="Caricamento delle clienti" className="flex flex-col gap-8">
      <PageHeaderSkeleton withEyebrow={false} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-10 w-full sm:ml-auto sm:w-48" />
      </div>
      <div className="divide-y divide-line border-t border-line">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 py-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
          </div>
        ))}
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

export function CheckinInboxSkeleton() {
  return (
    <LoadingRegion label="Caricamento dei check-in" className="flex flex-col gap-8">
      <PageHeaderSkeleton withEyebrow={false} />
      <Skeleton className="h-10 w-64" />
      <CheckinListSkeleton rows={6} />
    </LoadingRegion>
  );
}

export function RegistrationsSkeleton() {
  return (
    <LoadingRegion label="Caricamento delle iscrizioni" className="flex flex-col gap-10">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-5">
        <SectionHeaderSkeleton />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-lg border border-line p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
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
