"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { dismissFollowupSuggestion } from "@/server/services/ai-suggestions";
import type { ActionResult } from "@/types/results";
import { dismissSuggestionSchema } from "@/validation/ai";
import { fieldErrorsOf } from "@/validation/field-errors";

/** "Ignora" su una proposta di follow-up dell'AI. */
export async function dismissAISuggestionAction(analysisId: string): Promise<ActionResult<null>> {
  return runAction("ai.dismissSuggestion", async () => {
    const context = await requireCoachOrThrow();
    const parsed = dismissSuggestionSchema.safeParse({ analysisId });
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await dismissFollowupSuggestion(context, parsed.data.analysisId);
    revalidatePath("/", "layout");
    return null;
  });
}
