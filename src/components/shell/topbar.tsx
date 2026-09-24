import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { isAdminRole } from "@/domain/roles";
import { formatLongDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import type { AIStatus, CurrentCoach } from "@/types/domain";
import { AccountMenu } from "./account-menu";
import { AIStatusPill } from "./ai-status-pill";
import { MobileNav } from "./mobile-nav";
import type { NavigationCountKey } from "./navigation";

type TopbarProps = {
  coach: CurrentCoach;
  today: string;
  aiStatus: AIStatus;
  counts: Record<NavigationCountKey, number>;
};


export function Topbar({ coach, today, aiStatus, counts }: TopbarProps) {
  return (
    // Nera: il tema scuro locale adatta da solo testi, badge e menu (vedi .theme-dark e .app-topbar).
    <header className="theme-dark app-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-paper px-4 sm:px-6 lg:px-10">
      <MobileNav counts={counts} showAdmin={isAdminRole(coach.role)} />
      <Link href="/dashboard" aria-label="FESPA Coach AI, vai alla dashboard" className="rounded-md lg:hidden">
        <LogoMark />
      </Link>

      <p className="hidden text-sm font-medium text-white lg:block">{formatLongDate(today)}</p>

      <div className="ml-auto flex items-center gap-3">
        <AIStatusPill status={aiStatus} className="hidden sm:inline-flex" />
        <AccountMenu fullName={coach.fullName} email={coach.email} roleLabel={ROLE_LABELS[coach.role]} />
      </div>
    </header>
  );
}
