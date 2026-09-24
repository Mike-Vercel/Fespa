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

type UserDirectoryProps = {
  groups: Array<{ role: UserRole; users: RegisteredUser[] }>;
  canManageRoles: boolean;
  currentUserId: string;
  now: Date;
  timezone: string;
};

/**
 * Utenti registrati divisi per ruolo, con ricerca immediata per nome o email.
 * Gli account sono già tutti sulla pagina (poche centinaia al massimo): filtrare qui evita
 * un giro sul server a ogni lettera. I permessi restano sul server: la ricerca mostra solo ciò che c'è.
 */
export function UserDirectory({ groups, canManageRoles, currentUserId, now, timezone }: UserDirectoryProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const isSearching = query.trim() !== "";

  const filtered = groups.map((group) => ({
    ...group,
    matches: group.users.filter((user) => matchesUserSearch(user, query)),
  }));
  const matchCount = filtered.reduce((sum, group) => sum + group.matches.length, 0);
  const visibleGroups = isSearching ? filtered.filter((group) => group.matches.length > 0) : filtered;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="sr-only">
          Cerca tra gli utenti registrati
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome o email"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-12 text-[15px] text-ink shadow-raised transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {isSearching ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Cancella la ricerca"
              className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        <p aria-live="polite" className="min-h-5 px-4 text-[13px] text-ink-3">
          {isSearching ? `${pluralize(matchCount, "account trovato", "account trovati")} per “${query.trim()}”` : ""}
        </p>
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nessun utente trovato"
          description="Controlla come hai scritto il nome o l'email, oppure cerca solo una parte."
        />
      ) : null}

      {visibleGroups.map((group) => {
        const Icon = GROUP_ICONS[group.role];
        const titleId = `users-${group.role}`;
        return (
          <section
            key={group.role}
            aria-labelledby={titleId}
            className={cn("overflow-hidden rounded-xl border border-line border-t-4 bg-surface shadow-raised", GROUP_TONES[group.role])}
          >
            <header className="flex flex-col items-center gap-1.5 border-b border-line px-5 pb-5 pt-6 text-center">
              <span aria-hidden="true" className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink-2">
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </span>
              <h2 id={titleId} className="font-sans text-xl font-bold tracking-[-0.01em] text-ink">
                {GROUP_TITLES[group.role]}
              </h2>
              <p className="tabular text-[13px] font-medium text-ink-3">
                {isSearching
                  ? `${group.matches.length} di ${pluralize(group.users.length, "account", "account")}`
                  : pluralize(group.users.length, "account", "account")}
              </p>
            </header>

            {group.matches.length > 0 ? (
              <div className="px-4 sm:px-5">
                <UserList
                  users={group.matches}
                  canManageRoles={canManageRoles}
                  currentUserId={currentUserId}
                  now={now}
                  timezone={timezone}
                />
              </div>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-ink-3">{GROUP_EMPTY[group.role]}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
