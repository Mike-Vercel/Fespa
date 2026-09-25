import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { isAdminRole } from "@/domain/roles";
import { formatLongDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import type { AIStatus, CurrentCoach } from "@/types/domain";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import type { NavigationCountKey } from "./navigation";
import { NotificationsMenu } from "./notifications-menu";

/** La data della barra: il benvenuto della dashboard ci fa atterrare la sua. */
export const TOPBAR_DATE_ID = "barra-data";

type TopbarProps = {
  coach: CurrentCoach;
  today: string;
  aiStatus: AIStatus;
  counts: Record<NavigationCountKey, number>;
};

export function Topbar({ coach, today, aiStatus, counts }: TopbarProps) {
  const showAdmin = isAdminRole(coach.role);

  return (
    // Chiara e trasparente in cima, piena scorrendo: vedi .app-topbar in globals.css.
    <header className="app-topbar sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6 lg:px-14">
      <MobileNav counts={counts} showAdmin={showAdmin} />
      <Link href="/dashboard" aria-label="FESPA Coach AI, vai alla dashboard" className="rounded-md lg:hidden">
        <LogoMark />
      </Link>

      <p id={TOPBAR_DATE_ID} className="hidden text-[15px] font-medium text-ink lg:block">
        {formatLongDate(today)}
      </p>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        {/* Ricerca vera: porta all'elenco clienti già filtrato (/clients?q=…). */}
        <Form action="/clients" role="search" className="relative hidden md:block">
          <label htmlFor="barra-cerca-cliente" className="sr-only">
            Cerca un cliente
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            id="barra-cerca-cliente"
            name="q"
            type="search"
            placeholder="Cerca un cliente..."
            autoComplete="off"
            className="h-10 w-56 rounded-full border border-line/70 bg-surface/70 pl-10 pr-4 text-base text-ink lg:text-[14px] shadow-[0_1px_2px_rgb(31_29_26/0.03)] transition-[border-color,background-color,width] duration-200 placeholder:text-ink-3 hover:border-line-strong hover:bg-surface focus-visible:w-64 focus-visible:border-accent focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent xl:w-60 [&::-webkit-search-cancel-button]:hidden"
          />
        </Form>
        <NotificationsMenu counts={counts} showAdmin={showAdmin} />
        <AccountMenu fullName={coach.fullName} email={coach.email} roleLabel={ROLE_LABELS[coach.role]} aiStatus={aiStatus} />
      </div>
    </header>
  );
}
