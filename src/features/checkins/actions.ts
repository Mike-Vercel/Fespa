"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { reviewCheckin } from "@/server/services/checkins";
import type { ActionResult } from "@/types/results";
import { reviewCheckinSchema } from "@/validation/checkin-review";
import { fieldErrorsOf } from "@/validation/field-errors";

/** Segna un check-in come revisionato, opzionalmente salvando la risposta approvata dalla coach. */
export async function reviewCheckinAction(checkinId: string, reply?: string): Promise<ActionResult<null>> {
  return runAction("checkins.review", async () => {
    const context = await requireCoachOrThrow();
    const parsed = reviewCheckinSchema.safeParse({ checkinId, reply });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await reviewCheckin(context, parsed.data);
    revalidatePath("/", "layout");
    return null;
  });
}
