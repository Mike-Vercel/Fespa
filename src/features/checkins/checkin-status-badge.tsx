import { Badge } from "@/components/ui/badge";

export function CheckinStatusBadge({ reviewedAt }: { reviewedAt: string | null }) {
  return reviewedAt ? (
    <Badge tone="muted">Revisionato</Badge>
  ) : (
    <Badge tone="amber" withDot>
      Da revisionare
    </Badge>
  );
}
