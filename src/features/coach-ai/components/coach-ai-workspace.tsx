"use client";

import { AlertDialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useId, useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogContent, SheetContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import type { ActionRequestView, AutomationView, CoachAIPageData, ConversationSummary } from "@/types/coach-ai";
import type { AIStatus } from "@/types/domain";
import { CONVERSATION_TITLE_MAX_LENGTH } from "@/validation/coach-ai";
import { archiveConversationAction, deleteConversationAction, renameConversationAction, runAutomationsAction } from "../actions";
import { ConversationList } from "./conversation-list";
import { ConversationPanel } from "./conversation-panel";
import { DraftsPanel } from "./drafts-panel";

type CoachAIWorkspaceProps = {
  data: CoachAIPageData;
  userName: string;
  timezone: string;
  nowIso: string;
  aiStatus: AIStatus;
};

type Session = { key: string; data: CoachAIPageData["active"] };

const AI_DISABLED_REASONS: Record<Exclude<AIStatus["mode"], "live">, string> = {
  mock: "Modalità dimostrativa: Coach AI è un agente reale e qui non è attivo. Puoi consultare le chat salvate, le bozze e le automazioni.",
  not_configured: "Coach AI non è attivo: manca la configurazione del provider AI (AI_PROVIDER e AI_API_KEY).",
};

function upsertConversation(list: ConversationSummary[], conversation: ConversationSummary): ConversationSummary[] {
  return [conversation, ...list.filter((item) => item.id !== conversation.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Coach AI: lista delle conversazioni + conversazione. Su desktop due colonne dentro una scheda,
 * sotto xl la lista diventa un drawer (come ChatGPT su mobile). Cambiare conversazione passa dal server
 * (URL ?c=…), così un link o il tasto indietro riportano alla stessa chat.
 */
export function CoachAIWorkspace({ data, userName, timezone, nowIso, aiStatus }: CoachAIWorkspaceProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const clock = { now: new Date(nowIso), timezone };

  const [prevData, setPrevData] = useState(data);
  const [session, setSession] = useState<Session>({ key: data.active?.conversation.id ?? "new-0", data: data.active });
  const [newChats, setNewChats] = useState(0);
  const [currentId, setCurrentId] = useState<string | null>(data.active?.conversation.id ?? null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState(data.conversations);
  const [drafts, setDrafts] = useState(data.drafts);
  const [automations, setAutomations] = useState<AutomationView[]>(data.automations);
  const [pendingEvents, setPendingEvents] = useState(data.pendingAutomationEvents);
  const [isRunningAutomations, setIsRunningAutomations] = useState(false);
  const [view, setView] = useState<"chat" | "drafts">("chat");
  const [isListOpen, setIsListOpen] = useState(false);
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const renameId = useId();

  // Nuovi dati dal server: si adotta la conversazione solo se è cambiata (navigazione, indietro),
  // mai a metà di una risposta. Bozze e automazioni si aggiornano sempre.
  if (data !== prevData) {
    setPrevData(data);
    setDrafts(data.drafts);
    setAutomations(data.automations);
    setPendingEvents(data.pendingAutomationEvents);
    const incomingId = data.active?.conversation.id ?? null;
    if (incomingId !== currentId && !isStreaming) {
      const nextNewChats = newChats + 1;
      setNewChats(nextNewChats);
      setSession({ key: incomingId ?? `new-${nextNewChats}`, data: data.active });
      setCurrentId(incomingId);
      setConversations(data.conversations);
      setView("chat");
    }
  }

  // Altezza disponibile: dalla posizione della scheda al fondo della finestra (la pagina non scorre).
  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const update = () => element.style.setProperty("--cai-top", `${Math.round(element.getBoundingClientRect().top + window.scrollY)}px`);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const summary = conversations.find((conversation) => conversation.id === currentId) ?? null;
  const openDraftsCount = drafts.filter((draft) => draft.status === "draft" || draft.status === "pending").length;
  const aiDisabledReason = aiStatus.mode === "live" ? null : AI_DISABLED_REASONS[aiStatus.mode];

  function navigate(href: string) {
    setIsListOpen(false);
    startNavigation(() => router.push(href, { scroll: false }));
  }

  function newChat() {
    setView("chat");
    if (currentId === null) {
      setIsListOpen(false);
      return;
    }
    navigate("/coach-ai");
  }

  function select(conversation: ConversationSummary) {
    setView("chat");
    if (conversation.id === currentId) {
      setIsListOpen(false);
      return;
    }
    navigate(`/coach-ai?c=${conversation.id}`);
  }

  function handleConversation(conversation: ConversationSummary) {
    setCurrentId(conversation.id);
    setConversations((current) => upsertConversation(current, conversation));
    // Nuova chat appena creata: l'URL la identifica senza ricaricare la pagina.
    if (new URLSearchParams(window.location.search).get("c") !== conversation.id) {
      window.history.replaceState(null, "", `/coach-ai?c=${conversation.id}`);
    }
  }

  function handleActionChange(action: ActionRequestView) {
    setDrafts((current) => current.map((draft) => (draft.id === action.id ? action : draft)));
  }

  async function runAutomations() {
    setIsRunningAutomations(true);
    const result = await runAutomationsAction();
    setIsRunningAutomations(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(result.data.drafts > 0 ? `Bozze preparate: ${result.data.drafts}.` : "Nessuna nuova bozza da preparare.");
    router.refresh();
  }

  async function archive(conversation: ConversationSummary, archived: boolean) {
    const result = await archiveConversationAction({ conversationId: conversation.id, archived });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setConversations((current) => (archived ? current.filter((item) => item.id !== conversation.id) : upsertConversation(current, result.data)));
    toast.success(archived ? "Conversazione archiviata." : "Conversazione ripristinata.");
    if (archived && conversation.id === currentId) navigate("/coach-ai");
    if (!archived && conversation.id === currentId) setConversations((current) => upsertConversation(current, result.data));
  }

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renaming) return;
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    setIsMutating(true);
    const result = await renameConversationAction({ conversationId: renaming.id, title });
    setIsMutating(false);
    if (!result.ok) {
      toast.error(result.error.fieldErrors?.title?.[0] ?? result.error.message);
      return;
    }
    setConversations((current) => (current.some((item) => item.id === result.data.id) ? upsertConversation(current, result.data) : current));
    setRenaming(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsMutating(true);
    const result = await deleteConversationAction({ conversationId: deleting.id });
    setIsMutating(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setConversations((current) => current.filter((item) => item.id !== deleting.id));
    toast.success("Conversazione eliminata.");
    if (deleting.id === currentId) navigate("/coach-ai");
    setDeleting(null);
  }

  const openDrafts = () => {
    setView("drafts");
    setIsListOpen(false);
  };

  const list = (
    <ConversationList
      conversations={conversations}
      activeId={currentId}
      clock={clock}
      draftsCount={openDraftsCount}
      isDraftsOpen={view === "drafts"}
      onNewChat={newChat}
      onSelect={select}
      onOpenDrafts={openDrafts}
      onRename={setRenaming}
      onArchive={(conversation, archived) => void archive(conversation, archived)}
      onDelete={setDeleting}
    />
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        // Mobile: a tutta larghezza sotto la barra (come un'app di chat). Desktop: scheda sotto l'intestazione.
        "-mx-4 -mb-20 -mt-6 h-[calc(100dvh-var(--cai-top,72px))] min-h-[26rem] sm:-mx-6",
        "lg:mx-0 lg:-mb-14 lg:mt-0 lg:h-[calc(100dvh-var(--cai-top,300px)-1.5rem)] lg:min-h-[32rem]",
      )}
    >
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-white/95 lg:rounded-2xl lg:border lg:border-line/80 lg:shadow-[0_1px_2px_rgb(31_29_26/0.04),0_24px_60px_-40px_rgb(58_48_120/0.45)] lg:backdrop-blur-sm xl:grid-cols-[clamp(18.5rem,24vw,22.5rem)_minmax(0,1fr)]">
        <aside aria-label="Chat di Coach AI" className="hidden min-h-0 border-r border-line/80 bg-[#fcfbff] xl:flex xl:flex-col">
          {list}
        </aside>

        <div className="relative min-h-0 min-w-0">
          <div className={cn("h-full", view === "drafts" && "hidden")}>
            <ConversationPanel
              key={session.key}
              initial={{ conversation: session.data?.conversation ?? null, messages: session.data?.messages ?? [], hasMore: session.data?.hasMore ?? false }}
              summary={summary}
              userName={userName}
              clock={clock}
              aiDisabledReason={aiDisabledReason}
              draftsCount={openDraftsCount}
              onConversation={handleConversation}
              onStreamingChange={setIsStreaming}
              onActionChange={handleActionChange}
              onOpenList={() => setIsListOpen(true)}
              onOpenDrafts={openDrafts}
              onNewChat={newChat}
              onRename={setRenaming}
              onArchive={(conversation, archived) => void archive(conversation, archived)}
              onDelete={setDeleting}
            />
          </div>
          {view === "drafts" ? (
            <div className="flex h-full min-h-0 flex-col">
              <header className="flex shrink-0 items-center gap-2 border-b border-line/80 px-3 py-3 sm:px-5 lg:px-6 lg:py-4">
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className={buttonClasses("ghost", "sm", "-ml-1")}
                >
                  ← Torna alla chat
                </button>
                <h2 className="ml-1 truncate text-[16px] font-semibold text-ink sm:text-[18px]">Bozze e automazioni</h2>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
                <DraftsPanel
                  drafts={drafts}
                  automations={automations}
                  pendingEvents={pendingEvents}
                  isRunning={isRunningAutomations}
                  clock={clock}
                  onActionChange={handleActionChange}
                  onAutomationChange={(automation) =>
                    setAutomations((current) => current.map((item) => (item.id === automation.id ? automation : item)))
                  }
                  onRunNow={() => void runAutomations()}
                />
              </div>
            </div>
          ) : null}
          {isNavigating ? (
            <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] text-ink-2 shadow-popover">
                <Spinner /> Apro la conversazione…
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Lista delle chat su mobile e tablet: drawer a tutta altezza. */}
      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <SheetContent side="left" title="Chat di Coach AI" hideHeader className="w-[320px] bg-[#fcfbff] pt-[env(safe-area-inset-top)]">
          {list}
        </SheetContent>
      </Dialog>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent title="Rinomina la chat">
          <form onSubmit={rename} className="flex flex-col gap-4">
            <label htmlFor={renameId} className="sr-only">
              Titolo
            </label>
            <input
              id={renameId}
              name="title"
              defaultValue={renaming?.title}
              maxLength={CONVERSATION_TITLE_MAX_LENGTH}
              required
              autoFocus
              className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent sm:text-[15px]"
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setRenaming(null)} disabled={isMutating}>
                Annulla
              </Button>
              <Button variant="primary" type="submit" isLoading={isMutating}>
                Salva
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog.Root open={deleting !== null} onOpenChange={(open) => !open && !isMutating && setDeleting(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-fade-in" />
          <AlertDialog.Content className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-line bg-surface p-6 shadow-popover data-[state=open]:animate-pop-in sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2">
            <AlertDialog.Title className="font-serif text-xl text-ink">Eliminare la chat?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-ink-2">
              “{deleting?.title}”: messaggi e allegati verranno eliminati definitivamente. Le azioni già eseguite restano nel registro delle attività.
            </AlertDialog.Description>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel className={buttonClasses("secondary", "md")} disabled={isMutating}>
                Annulla
              </AlertDialog.Cancel>
              <Button variant="primary" isLoading={isMutating} onClick={() => void confirmDelete()} className="bg-urgent text-white hover:bg-urgent/90">
                Elimina chat
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
