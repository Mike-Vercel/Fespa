"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLIENT_TABS, parseClientTab, type ClientTab } from "@/validation/client-tabs";

const TAB_LABELS: Record<ClientTab, string> = {
  overview: "Panoramica",
  checkins: "Check-in",
  notes: "Note",
  followups: "Follow-up",
};

/**
 * La tab attiva vive nell'URL (?tab=…): i link dalla dashboard aprono la sezione giusta
 * e il cambio usa replaceState (sincronizzato da Next con useSearchParams), senza richieste al server.
 */
function selectTab(tab: ClientTab) {
  const url = new URL(window.location.href);
  if (tab === "overview") {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", tab);
  }
  url.hash = "";
  window.history.replaceState(null, "", url);
}

type ClientTabsProps = {
  counts: Partial<Record<ClientTab, number>>;
  /** Contenuti resi dal server: qui si decide solo quale mostrare. */
  panels: Record<ClientTab, ReactNode>;
};

export function ClientTabs({ counts, panels }: ClientTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = parseClientTab(searchParams.get("tab") ?? undefined);

  return (
    <Tabs value={activeTab} onValueChange={(value) => selectTab(parseClientTab(value))}>
      <TabsList label="Sezioni della scheda cliente">
        {CLIENT_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} count={counts[tab]}>
            {TAB_LABELS[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
      {CLIENT_TABS.map((tab) => (
        <TabsContent key={tab} value={tab}>
          {panels[tab]}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Link testuale verso un'altra tab della stessa scheda (es. "Tutte le note"). */
export function ClientTabLink({ tab, children }: { tab: ClientTab; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => selectTab(tab)}
      className="rounded-sm text-[13px] font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
    >
      {children}
    </button>
  );
}
