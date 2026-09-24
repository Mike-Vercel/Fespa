"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SIDEBAR_COOKIE, SIDEBAR_COOKIE_MAX_AGE_SECONDS } from "@/components/shell/navigation";
import { cn } from "@/lib/cn";

/** Interruttore accessibile (role="switch") per la sidebar compatta su desktop. */
export function SidebarPreference({ initiallyCollapsed }: { initiallyCollapsed: boolean }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    // Il layout legge il cookie sul server: un refresh applica subito la preferenza.
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p id="sidebar-preference-label" className="text-sm font-medium text-ink">
          Menu laterale compatto
        </p>
        <p id="sidebar-preference-help" className="text-[13px] text-ink-3">
          Su schermi larghi mostra solo le icone. La preferenza resta salvata su questo browser.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isCollapsed}
        aria-labelledby="sidebar-preference-label"
        aria-describedby="sidebar-preference-help"
        disabled={isPending}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          isCollapsed ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-5 rounded-full bg-surface shadow-raised transition-transform duration-200",
            isCollapsed ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
