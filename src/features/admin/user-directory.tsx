"use client";

import { Search, SearchX, X } from "lucide-react";
import { Tabs as RadixTabs } from "radix-ui";
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

/**
 * Utenti registrati: un pulsante per ruolo apre il suo elenco; la ricerca (nome o email) guarda
 * sempre in tutti i ruoli. Gli account sono già tutti sulla pagina (poche centinaia al massimo):
 * filtrare qui evita un giro sul server a ogni lettera. I permessi restano sul server.
 */
export function UserDirectory({ groups, canManageRoles, currentUserId, now, timezone }: UserDirectoryProps) {
  const [query, setQuery] = useState("");
  const [activeRole, setActiveRole] = useState<UserRole>(DEFAULT_ROLE);
  const searchId = useId();
  const isSearching = query.trim() !== "";

  const matches = groups.map((group) => ({
    ...group,
    users: group.users.filter((user) => matchesUserSearch(user, query)),
  }));
  const matchCount = matches.reduce((sum, group) => sum + group.users.length, 0);
  const listProps = { canManageRoles, currentUserId, now, timezone };

  function selectRole(value: string) {
    const role = groups.find((group) => group.role === value)?.role;
    if (role) {
      setActiveRole(role);
      setQuery("");
    }
  }

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
            placeholder="Cerca per nome o email, in tutti i ruoli"
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
          {isSearching ? `${pluralize(matchCount, "account trovato", "account trovati")} per “${query.trim()}”, in tutti i ruoli` : ""}
        </p>
      </div>

      {/* Durante la ricerca nessun pulsante è attivo: i risultati arrivano da tutti i ruoli. */}
      <RadixTabs.Root value={isSearching ? "" : activeRole} onValueChange={selectRole}>
        <RadixTabs.List aria-label="Ruoli" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {matches.map((group, index) => {
            const Icon = GROUP_ICONS[group.role];
            const total = groups[index].users.length;
            return (
              <RadixTabs.Trigger
                key={group.role}
                value={group.role}
                className={cn(
                  "group flex flex-col items-start rounded-xl border border-line border-t-4 bg-surface p-4 text-left shadow-raised transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=active]:bg-black data-[state=active]:shadow-popover",
                  GROUP_TONES[group.role],
                  isSearching && group.users.length === 0 && "opacity-50",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3 group-data-[state=active]:text-on-ink/75">
                    {GROUP_TITLES[group.role]}
                  </span>
                  <Icon aria-hidden="true" className="size-4 text-ink-3 group-data-[state=active]:text-on-ink/75" strokeWidth={1.8} />
                </span>
                <span className="tabular mt-3 font-serif text-4xl leading-none text-ink group-data-[state=active]:text-on-ink">
                  {isSearching ? group.users.length : total}
                </span>
                <span className="mt-1.5 text-xs text-ink-3 group-data-[state=active]:text-on-ink/75">
                  {isSearching ? `${group.users.length === 1 ? "trovato" : "trovati"} su ${total}` : "account"}
                </span>
              </RadixTabs.Trigger>
            );
          })}
        </RadixTabs.List>

        {groups.map((group) => (
          <RadixTabs.Content key={group.role} value={group.role} className="pt-6 focus-visible:outline-none data-[state=active]:animate-fade-in">
            <GroupCard group={group} countLabel={pluralize(group.users.length, "account", "account")} {...listProps} />
          </RadixTabs.Content>
        ))}
      </RadixTabs.Root>

      {isSearching ? (
        matchCount === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nessun utente trovato"
            description="Controlla come hai scritto il nome o l'email, oppure cerca solo una parte."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {matches
              .filter((group) => group.users.length > 0)
              .map((group) => (
                <GroupCard key={group.role} group={group} countLabel={pluralize(group.users.length, "risultato", "risultati")} {...listProps} />
              ))}
          </div>
        )
      ) : null}
    </div>
  );
}

type GroupCardProps = Omit<UserDirectoryProps, "groups"> & { group: UserGroup; countLabel: string };

function GroupCard({ group, countLabel, ...listProps }: GroupCardProps) {
  const Icon = GROUP_ICONS[group.role];
  const titleId = `users-${group.role}`;
  return (
    <section
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
        <p className="tabular text-[13px] font-medium text-ink-3">{countLabel}</p>
      </header>

      {group.users.length > 0 ? (
        <div className="px-4 sm:px-5">
          <UserList users={group.users} {...listProps} />
        </div>
      ) : (
        <p className="px-5 py-6 text-center text-sm text-ink-3">{GROUP_EMPTY[group.role]}</p>
      )}
    </section>
  );
}
