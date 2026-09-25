"use client";

import { Check } from "lucide-react";
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
      icon={<Check aria-hidden="true" className="size-4" strokeWidth={2} />}
      className="rounded-lg border-line bg-surface text-ink shadow-[0_1px_2px_rgb(31_29_26/0.04)] hover:border-line-strong hover:bg-sunken"
    >
      Segna come revisionato
    </Button>
  );
}
