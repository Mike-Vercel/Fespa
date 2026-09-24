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
    <ul className="flex flex-col gap-0.5">
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
                  "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  // Voce attiva: pillola nera, come la barra superiore.
                  isActive ? "bg-black text-on-ink shadow-raised" : "text-ink-2 hover:bg-hover hover:text-ink",
                )}
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={cn("size-[18px] shrink-0", isActive ? "text-on-ink" : "text-ink-3 group-hover:text-ink-2")}
                />
                <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>

                {count > 0 && item.count ? (
                  <>
                    <span className="sr-only">
                      {`: ${count} ${item.count.description}`}
                    </span>
                    {collapsed ? (
                      <span aria-hidden="true" className="absolute right-2.5 top-2 size-1.5 rounded-full bg-accent" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "tabular ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                          isActive ? "bg-on-ink text-ink" : "bg-sunken text-ink-2 ring-1 ring-line",
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
