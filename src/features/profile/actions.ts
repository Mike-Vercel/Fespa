"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { updateOwnName } from "@/server/services/profile";
import type { ActionResult } from "@/types/results";
import { fieldErrorsOf } from "@/validation/field-errors";
import { updateProfileSchema } from "@/validation/profile";

export async function updateProfileAction(fullName: string): Promise<ActionResult<null>> {
  return runAction("profile.update", async () => {
    const context = await requireCoachOrThrow();
    const parsed = updateProfileSchema.safeParse({ fullName });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await updateOwnName(context, parsed.data.fullName);
    revalidatePath("/", "layout");
    return null;
  });
}
