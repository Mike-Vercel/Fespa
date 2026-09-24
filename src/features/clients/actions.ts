"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { createClientWithInvite, resendClientInvite, type InviteOutcome } from "@/server/services/client-accounts";
import type { ActionResult } from "@/types/results";
import { newClientSchema } from "@/validation/clients";
import { fieldErrorsOf } from "@/validation/field-errors";

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult<{ clientId: string; invite: InviteOutcome }>> {
  return runAction("clients.create", async () => {
    const context = await requireCoachOrThrow();
    const parsed = newClientSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email") ?? "",
      goal: formData.get("goal") ?? "",
      startedOn: formData.get("startedOn"),
    });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }

    const result = await createClientWithInvite(context, parsed.data);
    revalidatePath("/", "layout");
    return result;
  });
}

export async function resendInviteAction(clientId: string): Promise<ActionResult<InviteOutcome>> {
  return runAction("clients.resendInvite", async () => {
    const context = await requireCoachOrThrow();
    return resendClientInvite(context, clientId);
  });
}
