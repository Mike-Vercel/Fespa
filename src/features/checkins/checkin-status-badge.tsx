import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CheckinStatusBadge({ reviewedAt }: { reviewedAt: string | null }) {
  return reviewedAt ? (
    <Badge tone="accent">
      <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
      Revisionato
    </Badge>
  ) : (
    <Badge tone="warning" withDot className="h-7 px-3 text-[13px]">
      Da revisionare
    </Badge>
  );
}
