import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui/text-link";
import { CheckinForm } from "@/features/portal/checkin-form";
import { requireClient } from "@/server/auth/session";
import { getPortalOverview } from "@/server/services/portal";

export const metadata: Metadata = { title: "Check-in settimanale" };

export default async function ClientCheckinPage() {
  const session = await requireClient();
  const overview = await getPortalOverview(session);
  // Solo le clienti approvate, e non prima che sia passato il tempo minimo dall'ultimo invio.
  if (overview.stage !== "active" || overview.nextCheckinAvailableAt) {
    redirect("/area-cliente");
  }

  return (
    <div className="flex flex-col gap-8 animate-rise-in">
      <BackLink href="/area-cliente" className="self-start">
        La tua area
      </BackLink>
      <header>
        <h1 className="font-serif text-[32px] leading-tight tracking-[-0.01em] text-ink">Check-in settimanale</h1>
        <p className="mt-2 max-w-xl text-[15px] text-pretty text-ink-2">
          Rispondi con sincerità: non ci sono risposte giuste o sbagliate, servono alla tua coach per seguirti meglio.
        </p>
      </header>
      <CheckinForm coachName={overview.coachNames[0] ?? null} />
    </div>
  );
}
