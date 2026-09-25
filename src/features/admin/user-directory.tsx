"use client";

import { Search, SearchX, X } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/ui/states";
import { matchesUserSearch } from "@/domain/user-search";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import type { RegisteredUser } from "@/server/repositories/client-accounts";
import type { UserRole } from "@/types/domain";
import { GROUP_EMPTY, GROUP_ICONS, GROUP_TITLES, GROUP_TONES } from "./user-groups";
import { UserList } from "./user-list";

type UserGroup = { role: UserRole; users: RegisteredUser[] };

type UserDirectoryProps = {
  groups: UserGroup[];
  canManageRoles: boolean;
  currentUserId: string;
  now: Date;
  timezone: string;
};

/** All'apertura si vedono le clienti: sono il gruppo più numeroso e con più decisioni da prendere. */
const DEFAULT_ROLE: UserRole = "client";

const CARD_SHADOW = "shadow-[0_1px_2px_rgb(31_29_26/0.03),0_12px_28px_-22px_rgb(31_29_26/0.2)]";

/**
 * Utenti registrati. Le quattro card per ruolo fanno anche da filtro: un clic apre quel ruolo,
 * un secondo clic (o "Mostra tutti i ruoli") li mostra tutti. La ricerca guarda sempre in tutti i ruoli.
 * Gli account sono già tutti sulla pagina (poche centinaia al massimo): filtrare qui evita un giro sul
 * server a ogni lettera. I permessi restano sul server.
 */
export function UserDirectory({ groups, canManageRoles, currentUserId, now, timezone }: UserDirectoryProps) {
  const [query, setQuery] = useState("");
  const [activeRole, setActiveRole] = useState<UserRole | null>(DEFAULT_ROLE);
  const searchId = useId();
  const isSearching = query.trim() !== "";

  const matches = groups.map((group) => ({
    ...group,
    users: group.users.filter((user) => matchesUserSearch(user, query)),
  }));
  const matchCount = matches.reduce((sum, group) => sum + group.users.length, 0);
  const listProps = { canManageRoles, currentUserId, now, timezone };

  function toggleRole(role: UserRole) {
    setQuery("");
    setActiveRole((current) => (current === role && !isSearching ? null : role));
  }

  const visibleGroups = isSearching
    ? matches.filter((group) => group.users.length > 0)
    : groups.filter((group) => activeRole === null || group.role === activeRole);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="sr-only">
          Cerca tra gli utenti registrati
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome o email, in tutti i ruoli..."
            autoComplete="off"
            spellCheck={false}
            className="h-[50px] w-full rounded-full border border-line/90 bg-surface/90 pl-12 pr-12 text-base text-ink shadow-[0_1px_2px_rgb(31_29_26/0.03)] transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
          />
          {isSearching ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Cancella la ricerca"
              className="absolute right-2.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        <p aria-live="polite" className={isSearching ? "px-5 text-[13px] text-ink-3" : "sr-only"}>
          {isSearching ? `${pluralize(matchCount, "account trovato", "account trovati")} per “${query.trim()}”, in tutti i ruoli` : ""}
        </p>
      </div>

      <div role="group" aria-label="Filtra per ruolo" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
        {matches.map((group, index) => {
          const Icon = GROUP_ICONS[group.role];
          const tone = GROUP_TONES[group.role];
          const total = groups[index].users.length;
          const isSelected = !isSearching && activeRole === group.role;
          return (
            <button
              key={group.role}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleRole(group.role)}
              className={cn(
                "flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-line/80 border-t-[3px] bg-surface px-4 pb-4 pt-4 text-left sm:px-5 sm:pb-5 sm:pt-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(31_29_26/0.04),0_18px_36px_-22px_rgb(31_29_26/0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                CARD_SHADOW,
                tone.accent,
                isSelected && cn("bg-white ring-2", tone.selected),
                isSearching && group.users.length === 0 && "opacity-55",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-2 sm:text-[13px] sm:tracking-[0.08em]">{GROUP_TITLES[group.role]}</span>
                <span className="tabular mt-3 font-serif text-[34px] leading-none text-ink sm:text-[40px]">
                  {isSearching ? group.users.length : total}
                </span>
                <span className="mt-2 text-[14px] text-ink-3">
                  {isSearching ? `${group.users.length === 1 ? "trovato" : "trovati"} su ${total}` : "account"}
                </span>
              </span>
              <span aria-hidden="true" className={cn("hidden size-11 shrink-0 items-center justify-center rounded-full sm:inline-flex", tone.icon)}>
                <Icon className="size-5" strokeWidth={1.7} />
              </span>
            </button>
          );
        })}
      </div>

      {isSearching && matchCount === 0 ? (
        <div className={cn("rounded-2xl border border-line/80 bg-surface", CARD_SHADOW)}>
          <EmptyState
            icon={SearchX}
            title="Nessun utente trovato"
            description="Controlla come hai scritto il nome o l'email, oppure cerca solo una parte."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {visibleGroups.map((group) => {
            const found = matches.find((match) => match.role === group.role) ?? group;
            return (
              <GroupPanel
                key={group.role}
                group={isSearching ? found : group}
                countLabel={
                  isSearching
                    ? pluralize(found.users.length, "risultato", "risultati")
                    : pluralize(group.users.length, "account", "account")
                }
                onShowAll={!isSearching && activeRole !== null ? () => setActiveRole(null) : undefined}
                {...listProps}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

type GroupPanelProps = Omit<UserDirectoryProps, "groups"> & {
  group: UserGroup;
  countLabel: string;
  /** Presente quando si vede un solo ruolo: torna alla vista con tutti i ruoli. */
  onShowAll?: () => void;
};

function GroupPanel({ group, countLabel, onShowAll, ...listProps }: GroupPanelProps) {
  const Icon = GROUP_ICONS[group.role];
  const tone = GROUP_TONES[group.role];
  const titleId = `users-${group.role}`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn("overflow-hidden rounded-2xl border border-line/80 border-t-[3px] bg-surface", CARD_SHADOW, tone.accent)}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-5 py-5 lg:px-9">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-full", tone.icon)}>
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-[20px] font-semibold leading-tight text-ink">
              {GROUP_TITLES[group.role]}
            </h2>
            <p className="tabular mt-0.5 text-[14px] text-ink-3">{countLabel}</p>
          </div>
        </div>
        {onShowAll ? (
          <button
            type="button"
            onClick={onShowAll}
            className="rounded-sm text-[14px] font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Mostra tutti i ruoli
          </button>
        ) : null}
      </header>

      {group.users.length > 0 ? (
        <div className="px-5 lg:px-9">
          <UserList users={group.users} {...listProps} />
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-[15px] text-ink-3 lg:px-9">{GROUP_EMPTY[group.role]}</p>
      )}
    </section>
  );
}
