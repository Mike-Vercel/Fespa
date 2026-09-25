"use client";

import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { signOutAction } from "@/features/auth/actions";
import { cn } from "@/lib/cn";
import {
  primaryNavigationFor,
  SECONDARY_NAVIGATION,
  SIDEBAR_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE_SECONDS,
  type NavigationCountKey,
} from "./navigation";
import { SidebarNav } from "./sidebar-nav";

const FOOTER_BUTTON =
  "flex h-11 w-full items-center gap-3.5 rounded-xl px-3.5 text-[15px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink";

type AppSidebarProps = {
  /** Preferenza letta dal cookie sul server. */
  collapsedPreference: boolean;
  counts: Record<NavigationCountKey, number>;
  showAdmin: boolean;
};

/** Sidebar desktop (≥ 1024px). Sotto quella larghezza la navigazione passa al menu a scomparsa. */
export function AppSidebar({ collapsedPreference, counts, showAdmin }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(collapsedPreference);
  const [syncedPreference, setSyncedPreference] = useState(collapsedPreference);

  // Se la preferenza cambia altrove (pagina Impostazioni + refresh), la sidebar si riallinea.
  if (collapsedPreference !== syncedPreference) {
    setSyncedPreference(collapsedPreference);
    setCollapsed(collapsedPreference);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  }

  const toggleLabel = collapsed ? "Espandi menu" : "Comprimi menu";

  return (
    <aside
      id="app-sidebar"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 ease-(--ease-soft) lg:flex",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className="flex h-[88px] shrink-0 items-center px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-md" aria-label="FESPA Coach AI, vai alla dashboard">
          <LogoMark className="size-10" />
          <Wordmark size="lg" className={cn("transition-opacity duration-150", collapsed && "pointer-events-none opacity-0")} />
        </Link>
      </div>

      <nav aria-label="Navigazione principale" className="flex-1 overflow-y-auto px-5 pt-3">
        <SidebarNav items={primaryNavigationFor(showAdmin)} collapsed={collapsed} counts={counts} />
      </nav>

      <div className="flex flex-col gap-1 border-t border-line px-5 py-4">
        <nav aria-label="Account">
          <SidebarNav items={SECONDARY_NAVIGATION} collapsed={collapsed} />
        </nav>

        <form action={signOutAction}>
          <Tooltip content="Esci" side="right" enabled={collapsed}>
            <button type="submit" className={FOOTER_BUTTON}>
              <LogOut aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-ink-3" />
              <span className={cn("truncate", collapsed && "sr-only")}>Esci</span>
            </button>
          </Tooltip>
        </form>

        <Tooltip content={toggleLabel} side="right" enabled={collapsed}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-controls="app-sidebar"
            aria-expanded={!collapsed}
            className={cn(FOOTER_BUTTON, "text-ink-3")}
          >
            {collapsed ? (
              <ChevronsRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0" />
            ) : (
              <ChevronsLeft aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0" />
            )}
            <span className={cn("truncate", collapsed && "sr-only")}>{toggleLabel}</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
