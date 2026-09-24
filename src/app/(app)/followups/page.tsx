import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { NewFollowupDialog } from "@/features/followups/new-followup-dialog";
import { FollowupsView } from "@/features/followups/followups-view";
import { requireCoach } from "@/server/auth/session";
import { getFollowupsOverview } from "@/server/services/followups";

export const metadata: Metadata = { title: "Follow-up" };

export default async function FollowupsPage() {
  const context = await requireCoach();
  const overview = await getFollowupsOverview(context);
  return (
    <div className="flex flex-col gap-7 animate-rise-in">
      <PageHeader
        title="Follow-up"
        description="I promemoria operativi verso le tue clienti, ordinati per scadenza."
        actions={
          <NewFollowupDialog
            today={overview.today}
            clientOptions={overview.clientOptions}
            trigger={
              <Button variant="primary" icon={<Plus aria-hidden="true" className="size-4" strokeWidth={2} />}>
                Nuovo follow-up
              </Button>
            }
          />
        }
      />

      <FollowupsView
        pending={overview.pending}
        recentlyClosed={overview.recentlyClosed}
        today={overview.today}
      />
    </div>
  );
}
