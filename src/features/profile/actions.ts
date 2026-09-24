"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { changeOwnPassword, requestOwnEmailChange } from "@/server/services/account";
import { updateOwnName } from "@/server/services/profile";
import type { ActionResult } from "@/types/results";
import { fieldErrorsOf } from "@/validation/field-errors";
import { changeEmailSchema, changePasswordSchema, updateProfileSchema } from "@/validation/profile";

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

export async function requestEmailChangeAction(email: string): Promise<ActionResult<{ pendingEmail: string }>> {
  return runAction("profile.email_change", async () => {
    const context = await requireCoachOrThrow();
    const parsed = changeEmailSchema.safeParse({ email });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await requestOwnEmailChange(context, parsed.data.email);
    revalidatePath("/profile");
    return { pendingEmail: parsed.data.email };
  });
}

export type ChangePasswordInput = { currentPassword: string; password: string; confirmPassword: string };

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult<null>> {
  return runAction("profile.password_change", async () => {
    const context = await requireCoachOrThrow();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await changeOwnPassword(context, parsed.data.currentPassword, parsed.data.password);
    return null;
  });
}
