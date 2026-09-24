import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PortalAccountMenu } from "@/features/portal/portal-account-menu";
import { requireClient } from "@/server/auth/session";
import { CLIENT_HOME_PATH } from "@/validation/redirect";

// Area personale: dati della cliente, resi per ogni richiesta e mai messi in cache.
export const dynamic = "force-dynamic";

export default async function ClientAreaLayout({ children }: { children: ReactNode }) {
  const { user } = await requireClient();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-on-ink"
      >
        Vai al contenuto
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={CLIENT_HOME_PATH} className="flex items-center gap-3 rounded-md" aria-label="La tua area FESPA">
            <LogoMark />
            <Wordmark />
          </Link>
          <PortalAccountMenu fullName={user.fullName} email={user.email} />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-8 focus:outline-none sm:px-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
