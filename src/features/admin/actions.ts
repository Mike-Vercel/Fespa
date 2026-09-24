"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireAdminOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { decideRegistration } from "@/server/services/registrations";
import { assignClientCoaches, changeUserRole } from "@/server/services/users";
import type { ActionResult } from "@/types/results";
import { fieldErrorsOf } from "@/validation/field-errors";
import { registrationReviewSchema } from "@/validation/registrations";
import { clientCoachesSchema, roleChangeSchema } from "@/validation/users";

export async function reviewRegistrationAction(review: unknown): Promise<ActionResult<null>> {
  return runAction("registrations.review", async () => {
    const context = await requireAdminOrThrow();
    const parsed = registrationReviewSchema.safeParse(review);
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }

    await decideRegistration(context, parsed.data);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function changeUserRoleAction(change: unknown): Promise<ActionResult<null>> {
  return runAction("users.changeRole", async () => {
    const context = await requireAdminOrThrow();
    const parsed = roleChangeSchema.safeParse(change);
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }

    await changeUserRole(context, parsed.data);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function setClientCoachesAction(input: unknown): Promise<ActionResult<null>> {
  return runAction("clients.setCoaches", async () => {
    const context = await requireAdminOrThrow();
    const parsed = clientCoachesSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }

    await assignClientCoaches(context, parsed.data);
    revalidatePath("/", "layout");
    return null;
  });
}
