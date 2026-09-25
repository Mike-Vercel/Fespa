"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Select } from "@/components/ui/form-fields";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { CLIENT_SORTS, type ClientListQuery, type ClientSort, type ClientStatusFilter } from "@/validation/clients";

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_FILTER_LABELS: Record<ClientStatusFilter, string> = {
  all: "Tutte",
  active: "Attive",
  onboarding: "In avvio",
  paused: "In pausa",
  completed: "Concluse",
};

const SORT_LABELS: Record<ClientSort, string> = {
  priority: "Priorità",
  name: "Nome",
  last_checkin: "Ultimo check-in",
  next_followup: "Prossimo follow-up",
};

/** Ordine dei filtri: il ciclo di vita del percorso, dopo "Tutte". */
const STATUS_FILTER_ORDER: ClientStatusFilter[] = ["all", "onboarding", "active", "paused", "completed"];

const DEFAULTS: ClientListQuery = { q: "", status: "all", sort: "priority" };

/** Filtri nell'URL: la lista è condivisibile, ricaricabile e resa dal server. */
function buildHref(pathname: string, query: ClientListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== DEFAULTS.status) params.set("status", query.status);
  if (query.sort !== DEFAULTS.sort) params.set("sort", query.sort);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function ClientListToolbar({ query }: { query: ClientListQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchText, setSearchText] = useState(query.q);
  const [requestedQuery, setRequestedQuery] = useState(query.q);
  const [receivedQuery, setReceivedQuery] = useState(query.q);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Se la ricerca nell'URL cambia per una navigazione esterna ("Azzera i filtri", tasto indietro)
  // il campo si riallinea; se invece è l'esito della nostra digitazione non lo tocchiamo,
  // per non cancellare i caratteri scritti nel frattempo.
  if (query.q !== receivedQuery) {
    setReceivedQuery(query.q);
    if (query.q !== requestedQuery) {
      setRequestedQuery(query.q);
      setSearchText(query.q);
    }
  }

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  function navigate(next: Partial<ClientListQuery>) {
    if (next.q !== undefined) {
      setRequestedQuery(next.q);
    }
    startTransition(() => {
      router.replace(buildHref(pathname, { ...query, ...next }), { scroll: false });
    });
  }

  function handleSearchChange(value: string) {
    setSearchText(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => navigate({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-3">
      <div className="relative lg:w-[21rem] lg:shrink-0">
        <label htmlFor="client-search" className="sr-only">
          Cerca una cliente per nome, email o telefono
        </label>
        <Search aria-hidden="true" strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input
          id="client-search"
          type="search"
          value={searchText}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Cerca per nome, email o telefono..."
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-line-strong/80 bg-surface pl-10 pr-9 text-base text-ink sm:text-[15px] shadow-[0_1px_2px_rgb(31_29_26/0.03)] transition-colors placeholder:text-ink-3 hover:border-control focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {isPending ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true">
            <Spinner />
          </span>
        ) : null}
      </div>

      <fieldset className="min-w-0 lg:shrink-0">
        <legend className="sr-only">Filtra per stato</legend>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {STATUS_FILTER_ORDER.map((status) => {
            const isSelected = query.status === status;
            return (
              <label
                key={status}
                className={cn(
                  "relative inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full px-4 text-[14px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                  isSelected
                    ? "bg-accent-strong text-white shadow-[0_2px_6px_-2px_rgb(60_86_56/0.45)]"
                    : "bg-sunken text-ink ring-1 ring-inset ring-line/70 hover:bg-hover",
                )}
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={isSelected}
                  onChange={() => navigate({ status })}
                  className="sr-only"
                />
                {STATUS_FILTER_LABELS[status]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3 lg:ml-auto">
        <label htmlFor="client-sort" className="shrink-0 text-[14px] text-ink-3">
          Ordina per
        </label>
        <Select
          id="client-sort"
          value={query.sort}
          onChange={(event) => {
            const sort = CLIENT_SORTS.find((option) => option === event.target.value);
            if (sort) navigate({ sort });
          }}
          className="h-10 w-full rounded-lg border-line-strong/80 text-base sm:w-44 sm:text-[15px]"
        >
          {CLIENT_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
