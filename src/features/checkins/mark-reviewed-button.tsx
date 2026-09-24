"use client";

import { CheckCheck } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewCheckinAction } from "./actions";

export function MarkReviewedButton({ checkinId, size = "sm" }: { checkinId: string; size?: "sm" | "md" }) {
  const [isPending, startTransition] = useTransition();

  function markReviewed() {
    startTransition(async () => {
      const result = await reviewCheckinAction(checkinId);
      if (result.ok) {
        toast.success("Check-in segnato come revisionato");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Button
      size={size}
      variant="secondary"
      isLoading={isPending}
      onClick={markReviewed}
      icon={<CheckCheck aria-hidden="true" className="size-4" strokeWidth={1.75} />}
    >
      Segna come revisionato
    </Button>
  );
}
