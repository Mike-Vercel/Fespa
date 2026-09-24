"use client";

import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { signOutAction } from "@/features/auth/actions";
import { primaryNavigationFor, SECONDARY_NAVIGATION, type NavigationCountKey } from "./navigation";
import { SidebarNav } from "./sidebar-nav";

/** Navigazione per tablet e mobile (< 1024px): menu a scomparsa da sinistra. */
export function MobileNav({ counts, showAdmin }: { counts: Record<NavigationCountKey, number>; showAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        aria-label="Apri il menu"
        className="-ml-2 inline-flex size-10 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-hover hover:text-ink lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </DialogTrigger>

      <SheetContent side="left" title="Menu" hideHeader className="bg-sidebar">
        <div className="flex h-16 shrink-0 items-center gap-3 px-5">
          <LogoMark />
          <Wordmark />
        </div>

        <nav aria-label="Navigazione principale" className="flex-1 overflow-y-auto px-3 pt-4">
          <SidebarNav items={primaryNavigationFor(showAdmin)} collapsed={false} counts={counts} onNavigate={close} />
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-line px-3 py-3">
          <nav aria-label="Account">
            <SidebarNav items={SECONDARY_NAVIGATION} collapsed={false} onNavigate={close} />
          </nav>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <LogOut aria-hidden="true" strokeWidth={1.75} className="size-[18px] text-ink-3" />
              Esci
            </button>
          </form>
        </div>
      </SheetContent>
    </Dialog>
  );
}
