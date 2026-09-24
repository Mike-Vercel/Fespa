"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import type { FollowupStatus } from "@/types/domain";
import { setFollowupStatusAction } from "./actions";

function useFollowupStatusChange(followupId: string) {
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: FollowupStatus, successMessage: string, undoStatus?: FollowupStatus) {
    startTransition(async () => {
      const result = await setFollowupStatusAction(followupId, status);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(successMessage, {
        action: undoStatus
          ? {
              label: "Annulla",
              onClick: async () => {
                const undo = await setFollowupStatusAction(followupId, undoStatus);
                if (!undo.ok) toast.error(undo.error.message);
              },
            }
          : undefined,
      });
    });
  }

  return { isPending, changeStatus };
}

/** Cerchio "completa": un click, con possibilità di annullare dal toast. */
export function CompleteFollowupButton({ followupId, title }: { followupId: string; title: string }) {
  const { isPending, changeStatus } = useFollowupStatusChange(followupId);

  return (
    <Tooltip content="Segna come completato">
      <button
        type="button"
        onClick={() => changeStatus("completed", "Follow-up completato", "pending")}
        disabled={isPending}
        aria-label={`Segna come completato: ${title}`}
        className="group inline-flex size-5 items-center justify-center rounded-full border-[1.5px] border-control text-accent transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-60"
      >
        {isPending ? (
          <Spinner className="size-3" />
        ) : (
          <Check aria-hidden="true" strokeWidth={2.5} className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </Tooltip>
  );
}

/** Azioni secondarie: annulla un follow-up in programma o riapre uno chiuso. */
export function FollowupSecondaryAction({ followupId, status }: { followupId: string; status: FollowupStatus }) {
  const { isPending, changeStatus } = useFollowupStatusChange(followupId);

  if (status === "pending") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => changeStatus("cancelled", "Follow-up annullato", "pending")}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-60"
      >
        {isPending ? <Spinner /> : <X aria-hidden="true" className="size-3.5" strokeWidth={2} />}
        Annulla
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => changeStatus("pending", "Follow-up riaperto")}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-60"
    >
      {isPending ? <Spinner /> : <RotateCcw aria-hidden="true" className="size-3.5" strokeWidth={2} />}
      Riapri
    </button>
  );
}
