"use client";

import { Archive, ArchiveRestore, ChevronLeft, FileClock, MessageCircle, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { groupConversations } from "@/domain/coach-ai";
import { cn } from "@/lib/cn";
import type { ConversationSummary } from "@/types/coach-ai";
import { searchConversationsAction } from "../actions";
import { formatListTime } from "../format";

type Clock = { now: Date; timezone: string };

type ConversationListProps = {
  conversations: ConversationSummary[];
  activeId: string | null;
  clock: Clock;
  draftsCount: number;
  isDraftsOpen: boolean;
  onNewChat: () => void;
  onSelect: (conversation: ConversationSummary) => void;
  onOpenDrafts: () => void;
  onRename: (conversation: ConversationSummary) => void;
  onArchive: (conversation: ConversationSummary, archived: boolean) => void;
  onDelete: (conversation: ConversationSummary) => void;
};

const SEARCH_DEBOUNCE_MS = 280;

/** Barra delle conversazioni (colonna su desktop, drawer su mobile). */
export function ConversationList({
  conversations,
  activeId,
  clock,
  draftsCount,
  isDraftsOpen,
  onNewChat,
  onSelect,
  onOpenDrafts,
  onRename,
  onArchive,
  onDelete,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [results, setResults] = useState<ConversationSummary[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchId = useId();
  const trimmed = query.trim();
  const needsServer = trimmed !== "" || showArchived;

  // Ricerca sul server (titoli e testo dei messaggi) con un piccolo ritardo mentre si scrive.
  useEffect(() => {
    if (!needsServer) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchConversationsAction({ query: trimmed, archived: showArchived });
      if (cancelled) return;
      setIsSearching(false);
      setResults(result.ok ? result.data : []);
    }, trimmed === "" ? 0 : SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, showArchived, needsServer]);

  const visible = needsServer ? (results ?? []) : conversations;
  const groups = groupConversations(visible, clock.now, clock.timezone);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-3.5 pb-3 pt-3.5">
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-medium text-white shadow-[0_8px_18px_-12px_rgb(31_29_26/0.8)] transition-colors hover:bg-ink-hover"
        >
          <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2} />
          Nuova chat
        </button>
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            Cerca nelle chat
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nelle chat..."
            autoComplete="off"
            className="h-10 w-full rounded-full border border-line/90 bg-white pl-10 pr-10 text-base text-ink placeholder:text-ink-3 focus-visible:border-brand/50 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/40 sm:text-[14px] [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Cancella la ricerca"
              className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        {showArchived ? (
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className="inline-flex items-center gap-1.5 self-start rounded-md text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Torna alle chat
          </button>
        ) : null}
      </div>

      <nav aria-label={showArchived ? "Chat archiviate" : "Conversazioni"} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
        {isSearching && results === null ? (
          <p className="flex items-center gap-2 px-3 py-4 text-[13px] text-ink-3">
            <Spinner /> Ricerca in corso…
          </p>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13.5px] leading-relaxed text-ink-3">
            {trimmed ? "Nessuna chat trovata." : showArchived ? "Nessuna chat archiviata." : "Nessuna chat ancora: inizia con “Nuova chat”."}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-labelledby={`${searchId}-${group.key}`} className="mt-2 first:mt-0">
              <h3 id={`${searchId}-${group.key}`} className="px-2.5 pb-1.5 pt-2 text-[13px] font-medium text-ink-3">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((conversation) => {
                  const isActive = !isDraftsOpen && conversation.id === activeId;
                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(conversation)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl py-2.5 pl-2.5 pr-11 text-left transition-colors",
                          isActive ? "bg-brand-soft" : "hover:bg-sunken/80",
                        )}
                      >
                        <MessageCircle
                          aria-hidden="true"
                          className={cn("mt-1 size-[18px] shrink-0", isActive ? "text-brand" : "text-ink-3")}
                          strokeWidth={1.7}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[14px] font-medium text-ink">{conversation.title}</span>
                            <time dateTime={conversation.updatedAt} suppressHydrationWarning className="shrink-0 text-[12px] text-ink-3">
                              {formatListTime(conversation.updatedAt, clock.now, clock.timezone)}
                            </time>
                          </span>
                          {conversation.preview ? (
                            <span className="mt-0.5 block truncate text-[13px] text-ink-3">{conversation.preview}</span>
                          ) : null}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Azioni per “${conversation.title}”`}
                          className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white hover:text-ink data-[state=open]:bg-white"
                        >
                          <MoreHorizontal aria-hidden="true" className="size-[18px]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => onRename(conversation)}>
                            <Pencil aria-hidden="true" />
                            Rinomina
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              onArchive(conversation, !conversation.archived);
                              if (showArchived) setResults((current) => current?.filter((item) => item.id !== conversation.id) ?? null);
                            }}
                          >
                            {conversation.archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                            {conversation.archived ? "Ripristina" : "Archivia"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onDelete(conversation)} className="text-urgent [&_svg]:text-urgent">
                            <Trash2 aria-hidden="true" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </nav>

      <div className="flex flex-col gap-1 border-t border-line/80 px-2 py-2.5">
        <button
          type="button"
          onClick={onOpenDrafts}
          aria-current={isDraftsOpen ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-xl px-2.5 text-left text-[14px] font-medium text-ink transition-colors",
            isDraftsOpen ? "bg-brand-soft" : "hover:bg-sunken/80",
          )}
        >
          <FileClock aria-hidden="true" className={cn("size-[18px]", isDraftsOpen ? "text-brand" : "text-ink-3")} strokeWidth={1.7} />
          <span className="flex-1">Bozze e automazioni</span>
          {draftsCount > 0 ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 text-[12px] font-semibold text-white">
              {draftsCount}
            </span>
          ) : null}
        </button>
        {!showArchived ? (
          <button
            type="button"
            onClick={() => {
              setResults(null);
              setShowArchived(true);
            }}
            className="flex h-10 items-center gap-3 rounded-xl px-2.5 text-left text-[14px] text-ink-2 transition-colors hover:bg-sunken/80 hover:text-ink"
          >
            <Archive aria-hidden="true" className="size-[18px] text-ink-3" strokeWidth={1.7} />
            Chat archiviate
          </button>
        ) : null}
      </div>
    </div>
  );
}
