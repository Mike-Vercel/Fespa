"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-runner";
import { generateInjuryQuestions, type InjuryQuestions } from "@/server/ai/workflows/onboarding-questions";
import { requireClientOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { saveOnboarding, submitCheckin } from "@/server/services/portal";
import type { ClientApprovalStatus } from "@/types/domain";
import type { ActionResult } from "@/types/results";
import { clientCheckinInputSchema } from "@/validation/checkin";
import { fieldErrorsByPath, fieldErrorsOf } from "@/validation/field-errors";
import { injuryDescriptionSchema, onboardingSubmissionSchema } from "@/validation/onboarding";

/*
 * Azioni dell'area cliente. Ogni azione verifica che l'utente sia una cliente;
 * le regole (collegamento all'invito, approvazione, limiti) sono applicate dal database.
 */

/** L'input arriva dal browser: non è tipizzato qui perché viene sempre validato con Zod. */
export async function saveOnboardingAction(
  submission: unknown,
): Promise<ActionResult<{ approvalStatus: ClientApprovalStatus }>> {
  return runAction("portal.saveOnboarding", async () => {
    const session = await requireClientOrThrow();
    const parsed = onboardingSubmissionSchema.safeParse(submission);
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsByPath(parsed.error));
    }
    const approvalStatus = await saveOnboarding(session, parsed.data);
    revalidatePath("/area-cliente", "layout");
    return { approvalStatus };
  });
}

export async function generateInjuryQuestionsAction(description: string): Promise<ActionResult<InjuryQuestions>> {
  return runAction("portal.injuryQuestions", async () => {
    const session = await requireClientOrThrow();
    const parsed = injuryDescriptionSchema.safeParse(description);
    if (!parsed.success) {
      throw new ValidationError({ description: parsed.error.issues.map((issue) => issue.message) });
    }
    return generateInjuryQuestions(session, parsed.data);
  });
}

export async function submitCheckinAction(answers: unknown): Promise<ActionResult<null>> {
  return runAction("portal.submitCheckin", async () => {
    const session = await requireClientOrThrow();
    const parsed = clientCheckinInputSchema.safeParse(answers);
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    await submitCheckin(session, { version: 1, ...parsed.data });
    revalidatePath("/area-cliente", "layout");
    return null;
  });
}
