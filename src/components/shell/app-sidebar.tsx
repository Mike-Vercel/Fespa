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

const FOOTER_BUTTON = "flex h-11 items-center rounded-xl text-[15px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink";

/** Espansa: voce a tutta larghezza. Compressa: quadrato 44×44 centrato (76px = 16 + 44 + 16). */
function footerButton(collapsed: boolean) {
  return cn(FOOTER_BUTTON, collapsed ? "w-11 justify-center" : "w-full gap-3.5 px-3.5");
}

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
        // overflow-x-clip: durante la chiusura la scritta FESPA non deve far scorrere la sidebar in orizzontale.
        "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-x-clip border-r border-line bg-white transition-[width] duration-200 ease-(--ease-soft) lg:flex",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className={cn("flex h-[88px] shrink-0 items-center", collapsed ? "px-[18px]" : "px-6")}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-md" aria-label="FESPA Coach AI, vai alla dashboard">
          <LogoMark className="size-10" />
          <Wordmark size="lg" className={cn("transition-opacity duration-150", collapsed && "pointer-events-none invisible opacity-0")} />
        </Link>
      </div>

      <nav aria-label="Navigazione principale" className={cn("flex-1 overflow-y-auto pt-3", collapsed ? "px-4" : "px-5")}>
        <SidebarNav items={primaryNavigationFor(showAdmin)} collapsed={collapsed} counts={counts} />
      </nav>

      <div className={cn("flex flex-col gap-1 border-t border-line py-4", collapsed ? "px-4" : "px-5")}>
        <nav aria-label="Account">
          <SidebarNav items={SECONDARY_NAVIGATION} collapsed={collapsed} />
        </nav>

        <form action={signOutAction}>
          <Tooltip content="Esci" side="right" enabled={collapsed}>
            <button type="submit" className={footerButton(collapsed)}>
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
            className={cn(footerButton(collapsed), "text-ink-3")}
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
