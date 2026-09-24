import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/portal/onboarding-form";
import { requireClient } from "@/server/auth/session";
import { getOwnProfile } from "@/server/services/portal";

export const metadata: Metadata = { title: "Iniziamo" };

export default async function OnboardingPage() {
  const session = await requireClient();
  const own = await getOwnProfile(session);
  if (own.profile?.onboardingCompletedAt) {
    redirect("/area-cliente");
  }

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Benvenuta, benvenuto</p>
        <h1 className="mt-1.5 font-serif text-[32px] leading-tight tracking-[-0.01em] text-ink">Iniziamo</h1>
        <p className="mt-2 max-w-xl text-[15px] text-pretty text-ink-2">
          Qualche informazione per conoscerti: la tua coach le userà per costruire un percorso su misura. Ti servono
          circa tre minuti.
        </p>
      </header>
      <OnboardingForm
        mode="create"
        initialProfile={{ ...(own.profile ?? {}), fullName: own.profile?.fullName ?? session.user.fullName }}
        initialHealth={own.health}
      />
    </div>
  );
}
