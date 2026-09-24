"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { changeFollowupStatus, createFollowup } from "@/server/services/followups";
import type { FollowupStatus } from "@/types/domain";
import type { ActionResult } from "@/types/results";
import { fieldErrorsOf } from "@/validation/field-errors";
import { createFollowupSchema, followupStatusChangeSchema } from "@/validation/followups";

/*
 * Server Action sottili: validano l'input, delegano al service (che rifà autenticazione
 * e autorizzazione) e aggiornano la UI. Sono raggiungibili anche con POST diretti:
 * per questo non si fidano di nulla che arrivi dal client.
 */

export async function createFollowupAction(formData: FormData): Promise<ActionResult<{ followupId: string }>> {
  return runAction("followups.create", async () => {
    const context = await requireCoachOrThrow();
    const parsed = createFollowupSchema.safeParse({
      clientId: formData.get("clientId"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      dueOn: formData.get("dueOn"),
      aiAnalysisId: formData.get("aiAnalysisId") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }

    const followupId = await createFollowup(context, parsed.data);
    revalidatePath("/", "layout");
    return { followupId };
  });
}

export async function setFollowupStatusAction(followupId: string, status: FollowupStatus): Promise<ActionResult<null>> {
  return runAction("followups.setStatus", async () => {
    const context = await requireCoachOrThrow();
    const parsed = followupStatusChangeSchema.safeParse({ followupId, status });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }

    await changeFollowupStatus(context, parsed.data.followupId, parsed.data.status);
    revalidatePath("/", "layout");
    return null;
  });
}
