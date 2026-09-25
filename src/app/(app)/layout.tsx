import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SIDEBAR_COOKIE } from "@/components/shell/navigation";
import { Topbar } from "@/components/shell/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { calendarDateIn } from "@/domain/dates";
import { isAdminRole } from "@/domain/roles";
import { getAIStatus } from "@/server/ai/config";
import { requireCoach } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getNavigationCounts } from "@/server/services/dashboard";

// Area riservata: dati personali della coach, resi per ogni richiesta e mai pre-renderizzati o messi in cache.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireCoach();
  const [cookieStore, counts] = await Promise.all([cookies(), getNavigationCounts(context)]);
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";
  const today = calendarDateIn(getServerEnv().APP_TIMEZONE);

  return (
    <TooltipProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-on-ink"
      >
        Vai al contenuto
      </a>

      <div className="flex min-h-dvh">
        <AppSidebar collapsedPreference={sidebarCollapsed} counts={counts} showAdmin={isAdminRole(context.coach.role)} />

        {/* relative + isolate: lo sfondo atmosferico della dashboard si posiziona qui, dietro barra e contenuto. */}
        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          <Topbar coach={context.coach} today={today} aiStatus={getAIStatus()} counts={counts} />
          <main id="main" tabIndex={-1} className="flex-1 px-4 pb-20 pt-6 focus:outline-none sm:px-6 lg:pl-14 lg:pr-8 lg:pt-8">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
