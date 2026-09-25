import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageAtmosphere } from "@/components/shell/page-atmosphere";
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
    <>
      <PageAtmosphere variant="soft" />
      <div className="animate-rise-in">
        <FollowupsView
          pending={overview.pending}
          recentlyClosed={overview.recentlyClosed}
          today={overview.today}
          newFollowupAction={
            <NewFollowupDialog
              today={overview.today}
              clientOptions={overview.clientOptions}
              trigger={
                <Button variant="primary" size="lg" icon={<Plus aria-hidden="true" className="size-[18px]" strokeWidth={2} />}>
                  Nuovo follow-up
                </Button>
              }
            />
          }
        />
      </div>
    </>
  );
}
