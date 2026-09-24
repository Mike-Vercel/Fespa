import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { AIStatusPill } from "@/components/shell/ai-status-pill";
import { SIDEBAR_COOKIE } from "@/components/shell/navigation";
import { SidebarPreference } from "@/features/settings/sidebar-preference";
import { SignOutEverywhere } from "@/features/settings/sign-out-everywhere";
import { getAIStatus } from "@/server/ai/config";
import { requireCoach } from "@/server/auth/session";
import { getAIUsageSummary } from "@/server/services/ai-usage";

export const metadata: Metadata = { title: "Impostazioni" };

const AI_PRINCIPLES = [
  "L'AI propone, tu decidi: nessun follow-up, nota o risposta viene salvata senza una tua azione esplicita.",
  "Al provider arriva solo il contesto necessario alla singola richiesta: niente cognomi, email o identificativi interni.",
  "Ogni analisi salvata riporta modello e data; i ragionamenti interni del modello non vengono mai richiesti né salvati.",
];

export default async function SettingsPage() {
  const context = await requireCoach();
  const [cookieStore, usage] = await Promise.all([cookies(), getAIUsageSummary(context)]);
  const aiStatus = getAIStatus();

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <PageHeader title="Impostazioni" description="Preferenze dell'interfaccia, stato dell'AI e sicurezza dell'account." />

      <section aria-labelledby="settings-ai" className="flex max-w-3xl flex-col gap-5">
        <SectionHeader id="settings-ai" title="Intelligenza artificiale" />
        <div className="flex flex-wrap items-center gap-3">
          <AIStatusPill status={aiStatus} />
          {aiStatus.mode === "live" ? (
            <span className="text-sm text-ink-2">
              {aiStatus.providerLabel} · <code className="font-mono text-[13px]">{aiStatus.model}</code>
            </span>
          ) : null}
        </div>
        {aiStatus.mode === "not_configured" ? (
          <p className="text-sm text-ink-2">
            Per attivarla imposta <code className="font-mono text-[13px]">AI_PROVIDER</code> e{" "}
            <code className="font-mono text-[13px]">AI_API_KEY</code> nel file <code className="font-mono text-[13px]">.env.local</code>,
            oppure <code className="font-mono text-[13px]">DEMO_AI_MODE=true</code> per una demo con risultati simulati.
          </p>
        ) : null}
        <ul className="flex flex-col gap-2.5 text-sm text-pretty text-ink-2">
          {AI_PRINCIPLES.map((principle) => (
            <li key={principle} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
              {principle}
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
          <dt className="text-ink-3">Richieste nelle ultime 24 ore</dt>
          <dd className="tabular text-ink">
            {usage.requestsInDailyWindow} su {usage.dailyLimit.maxRequests}
          </dd>
          <dt className="text-ink-3">Limite a breve termine</dt>
          <dd className="text-ink">
            {usage.shortTermLimit.maxRequests} richieste ogni {usage.shortTermLimit.description}
          </dd>
        </dl>
      </section>

      <section aria-labelledby="settings-interface" className="flex max-w-3xl flex-col gap-5">
        <SectionHeader id="settings-interface" title="Interfaccia" />
        <SidebarPreference initiallyCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"} />
      </section>

      <section aria-labelledby="settings-security" className="flex max-w-3xl flex-col gap-4">
        <SectionHeader id="settings-security" title="Sicurezza" />
        <p className="text-sm text-pretty text-ink-2">
          Se hai usato l&apos;app su un dispositivo condiviso o che non controlli più, chiudi tutte le sessioni.
        </p>
        <div>
          <SignOutEverywhere />
        </div>
      </section>
    </div>
  );
}
