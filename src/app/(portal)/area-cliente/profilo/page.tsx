import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/portal/onboarding-form";
import { requireClient } from "@/server/auth/session";
import { getOwnProfile } from "@/server/services/portal";

export const metadata: Metadata = { title: "I miei dati" };

export default async function ClientProfilePage() {
  const session = await requireClient();
  const own = await getOwnProfile(session);
  if (!own.profile?.onboardingCompletedAt) {
    redirect("/area-cliente/iniziamo");
  }

  return (
    <div className="flex flex-col gap-10 animate-rise-in">
      <header>
        <h1 className="font-serif text-[32px] leading-tight tracking-[-0.01em] text-ink">I miei dati</h1>
        <p className="mt-2 max-w-xl text-[15px] text-pretty text-ink-2">
          Tieni aggiornate le informazioni per la tua coach. Account: {session.user.email} ·{" "}
          <Link href="/reimposta-password" className="font-medium text-ink underline underline-offset-4">
            cambia password
          </Link>
        </p>
      </header>
      <OnboardingForm mode="edit" initialProfile={own.profile} initialHealth={own.health} />
    </div>
  );
}
