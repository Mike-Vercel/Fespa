"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { isActivePath, type NavigationCountKey, type NavigationItem } from "./navigation";

type SidebarNavProps = {
  items: NavigationItem[];
  collapsed: boolean;
  counts?: Record<NavigationCountKey, number>;
  /** Chiamato dopo il click (es. per chiudere il menu mobile). */
  onNavigate?: () => void;
};

export function SidebarNav({ items, collapsed, counts, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href);
        const count = item.count && counts ? counts[item.count.key] : 0;
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Tooltip content={item.label} side="right" enabled={collapsed}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center rounded-xl text-[15px] transition-colors",
                  // Compressa: quadrato 44×44 con l'icona al centro (niente padding che la sposti).
                  collapsed ? "w-11 justify-center" : "gap-3.5 px-3.5",
                  // Voce attiva: velatura viola/blu del marchio e tacca verticale sul bordo della sidebar
                  // (distanza dal bordo = padding orizzontale della sidebar, vedi app-sidebar.tsx).
                  isActive
                    ? cn(
                        "bg-brand-soft font-semibold text-ink before:absolute before:top-1/2 before:h-7 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-brand",
                        collapsed ? "before:-left-4" : "before:-left-5",
                      )
                    : "font-medium text-ink-2 hover:bg-sunken hover:text-ink",
                )}
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={isActive ? 2 : 1.75}
                  className={cn(
                    "size-5 shrink-0",
                    isActive ? "text-brand" : "text-ink-3 group-hover:text-ink-2",
                    isActive && item.fillIconWhenActive && "fill-current",
                  )}
                />
                <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>

                {count > 0 && item.count ? (
                  <>
                    <span className="sr-only">
                      {`: ${count} ${item.count.description}`}
                    </span>
                    {collapsed ? (
                      // Sull'angolo in alto a destra dell'icona, con un bordo che la stacca dal disegno.
                      <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-brand ring-2 ring-white" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "tabular ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-brand",
                          isActive ? "bg-white" : "bg-brand-soft",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </>
                ) : null}
              </Link>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
