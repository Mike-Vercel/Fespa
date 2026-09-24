import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { calendarDateIn } from "@/domain/dates";
import { isAdminRole } from "@/domain/roles";
import { ClientCoachesEditor } from "@/features/admin/client-coaches-editor";
import { firstNameOf } from "@/domain/greeting";
import { CheckinAITools } from "@/features/ai/checkin-ai-tools";
import { CopilotSheet } from "@/features/ai/copilot-sheet";
import { ClientCheckinsPanel } from "@/features/checkins/client-checkins-panel";
import { MarkReviewedButton } from "@/features/checkins/mark-reviewed-button";
import { ReplyDialog } from "@/features/checkins/reply-dialog";
import { ClientHeader } from "@/features/clients/client-header";
import { ClientTabs } from "@/features/clients/client-tabs";
import { OverviewPanel } from "@/features/clients/overview-panel";
import { ClientFollowupsPanel } from "@/features/followups/client-followups-panel";
import { NewFollowupDialog } from "@/features/followups/new-followup-dialog";
import { ClientNotesPanel } from "@/features/notes/client-notes-panel";
import { formatCalendarDate } from "@/lib/format";
import { getAIStatus } from "@/server/ai/config";
import { requireCoach } from "@/server/auth/session";
import { orNotFound } from "@/server/page-helpers";
import { getClientDetail } from "@/server/services/clients";
import { getCoachAssignment } from "@/server/services/users";
import type { AIAnalysisItem } from "@/types/domain";

// Titolo generico: il nome della cliente non finisce nella cronologia del browser.
export const metadata: Metadata = { title: "Scheda cliente" };

/** Per ogni check-in, l'analisi più recente (le analisi arrivano già ordinate dalla più recente). */
function latestAnalysisByCheckin(analyses: AIAnalysisItem[]): Map<string, AIAnalysisItem> {
  const latest = new Map<string, AIAnalysisItem>();
  for (const analysis of analyses) {
    if (!latest.has(analysis.checkinId)) latest.set(analysis.checkinId, analysis);
  }
  return latest;
}

export default async function ClientDetailPage({ params }: PageProps<"/clients/[clientId]">) {
  const context = await requireCoach();
  const { clientId } = await params;
  const now = new Date();
  // L'ID viene dall'URL: getClientDetail lo valida e verifica l'accesso (404 se non consentito).
  const detail = await orNotFound(getClientDetail(context, clientId, now));
  const { client, checkins, notes, followups, analyses, today, timezone } = detail;
  const aiStatus = getAIStatus();
  const clientRef = { id: client.id, fullName: client.fullName, firstName: firstNameOf(client.fullName) };
  const analysesByCheckin = latestAnalysisByCheckin(analyses);
  // Le iscrizioni in attesa ricevono la coach al momento dell'approvazione, non da qui.
  const coachAssignment =
    isAdminRole(context.coach.role) && client.approvalStatus === "approved"
      ? await getCoachAssignment(context, client.id)
      : null;

  return (
    <div className="flex flex-col gap-8 animate-rise-in">
      <ClientHeader
        client={client}
        now={now}
        today={today}
        timezone={timezone}
        adminTools={
          coachAssignment ? (
            <ClientCoachesEditor
              clientId={client.id}
              clientName={client.fullName}
              staff={coachAssignment.staff}
              coachIds={coachAssignment.coachIds}
            />
          ) : undefined
        }
        actions={
          <>
            <CopilotSheet client={clientRef} today={today} timezone={timezone} aiStatus={aiStatus} />
            <NewFollowupDialog
              today={today}
              client={clientRef}
              trigger={
                <Button variant="secondary" icon={<Plus aria-hidden="true" className="size-4" strokeWidth={2} />}>
                  Nuovo follow-up
                </Button>
              }
            />
          </>
        }
      />

      <ClientTabs
        counts={{
          checkins: checkins.length,
          notes: notes.length,
          followups: followups.filter((followup) => followup.status === "pending").length,
        }}
        panels={{
          overview: <OverviewPanel detail={detail} now={now} />,
          checkins: (
            <ClientCheckinsPanel
              checkins={checkins}
              timezone={timezone}
              renderFooter={(checkin) => {
                const checkinLabel = `check-in del ${formatCalendarDate(calendarDateIn(timezone, checkin.submittedAt), { withYear: true })}`;
                const canReply = checkin.coachReply === null;
                return (
                  <CheckinAITools
                    checkinId={checkin.id}
                    checkinLabel={checkinLabel}
                    client={clientRef}
                    today={today}
                    timezone={timezone}
                    aiStatus={aiStatus}
                    initialAnalysis={analysesByCheckin.get(checkin.id) ?? null}
                    canAnalyze={checkin.answers !== null}
                    canReply={canReply}
                    replyVisibleToClient={client.hasAccount}
                    manualActions={
                      <>
                        {canReply ? (
                          <ReplyDialog
                            checkinId={checkin.id}
                            clientFirstName={clientRef.firstName}
                            checkinLabel={checkinLabel}
                            visibleToClient={client.hasAccount}
                          />
                        ) : null}
                        {checkin.reviewedAt ? null : <MarkReviewedButton checkinId={checkin.id} size="md" />}
                      </>
                    }
                  />
                );
              }}
            />
          ),
          notes: <ClientNotesPanel clientId={client.id} notes={notes} now={now} timezone={timezone} />,
          followups: <ClientFollowupsPanel client={clientRef} followups={followups} today={today} />,
        }}
      />
    </div>
  );
}
