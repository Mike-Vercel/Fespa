import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActivePortalHome, PendingApproval, RejectedRegistration } from "@/features/portal/portal-home";
import { requireClient } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getPortalOverview } from "@/server/services/portal";

export const metadata: Metadata = { title: "La tua area" };

export default async function ClientHomePage() {
  const session = await requireClient();
  const overview = await getPortalOverview(session);

  switch (overview.stage) {
    case "onboarding":
      redirect("/area-cliente/iniziamo");
    case "pending":
      return <PendingApproval fullName={overview.fullName} />;
    case "rejected":
      return <RejectedRegistration />;
    case "active":
      return <ActivePortalHome overview={overview} timezone={getServerEnv().APP_TIMEZONE} />;
  }
}
