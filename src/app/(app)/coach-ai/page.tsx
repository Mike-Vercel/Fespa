import type { Metadata } from "next";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
import { CoachAIHeader } from "@/features/coach-ai/components/coach-ai-header";
import { CoachAIWorkspace } from "@/features/coach-ai/components/coach-ai-workspace";
import { getAIStatus } from "@/server/ai/config";
import { requireCoach } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { getCoachAIPageData } from "@/server/services/coach-ai";
import { firstParam, parseUuid } from "@/validation/common";

export const metadata: Metadata = { title: "Coach AI" };

export default async function CoachAIPage({ searchParams }: PageProps<"/coach-ai">) {
  const context = await requireCoach();
  const conversationId = parseUuid(firstParam((await searchParams).c));
  const data = await getCoachAIPageData(context, conversationId);

  return (
    <>
      <PageAtmosphere />
      <CoachAIHeader />
      <CoachAIWorkspace
        data={data}
        userName={context.coach.fullName}
        timezone={getServerEnv().APP_TIMEZONE}
        nowIso={new Date().toISOString()}
        aiStatus={getAIStatus()}
      />
    </>
  );
}
