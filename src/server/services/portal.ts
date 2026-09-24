import "server-only";
import type { SessionContext } from "@/server/auth/session";
import {
  completeOnboarding,
  findHealthProfile,
  findOwnClientRecord,
  listOwnCoachNames,
  submitOwnCheckin,
} from "@/server/repositories/client-accounts";
import { listCheckinsForClient } from "@/server/repositories/checkins";
import { logger } from "@/server/logger";
import type {
  CheckinItem,
  ClientApprovalStatus,
  ClientPersonalProfile,
  HealthProfile,
} from "@/types/domain";
import type { CheckinAnswers } from "@/validation/checkin";
import type { onboardingSubmissionSchema } from "@/validation/onboarding";
import type { z } from "zod";

/** Deve coincidere con il limite applicato dal database (submit_client_checkin). */
export const MIN_HOURS_BETWEEN_CHECKINS = 20;
const HOUR_MS = 60 * 60 * 1000;

export type PortalOverview =
  | { stage: "onboarding" }
  | { stage: "pending" | "rejected"; fullName: string }
  | {
      stage: "active";
      fullName: string;
      coachNames: string[];
      checkins: CheckinItem[];
      /** null se può inviare subito, altrimenti da quando potrà inviare il prossimo. */
      nextCheckinAvailableAt: string | null;
    };

/** In che fase si trova la cliente: questionario, attesa di approvazione, rifiuto o area attiva. */
export async function getPortalOverview(session: SessionContext, now = new Date()): Promise<PortalOverview> {
  const record = await findOwnClientRecord(session.db, session.user.id);
  if (!record || !record.profile.onboardingCompletedAt) {
    return { stage: "onboarding" };
  }
  if (record.approvalStatus !== "approved") {
    return { stage: record.approvalStatus, fullName: record.profile.fullName };
  }

  const [checkins, coachNames] = await Promise.all([
    listCheckinsForClient(session.db, record.id),
    listOwnCoachNames(session.db),
  ]);
  const lastSubmittedAt = checkins[0]?.submittedAt;
  const nextAvailable = lastSubmittedAt ? new Date(new Date(lastSubmittedAt).getTime() + MIN_HOURS_BETWEEN_CHECKINS * HOUR_MS) : null;

  return {
    stage: "active",
    fullName: record.profile.fullName,
    coachNames,
    checkins,
    nextCheckinAvailableAt: nextAvailable && nextAvailable > now ? nextAvailable.toISOString() : null,
  };
}

export type OwnProfile = {
  profile: ClientPersonalProfile | null;
  health: HealthProfile | null;
  approvalStatus: ClientApprovalStatus | null;
};

export async function getOwnProfile(session: SessionContext): Promise<OwnProfile> {
  const record = await findOwnClientRecord(session.db, session.user.id);
  if (!record) {
    return { profile: null, health: null, approvalStatus: null };
  }
  return {
    profile: record.profile,
    health: await findHealthProfile(session.db, record.id),
    approvalStatus: record.approvalStatus,
  };
}

type OnboardingSubmission = z.output<typeof onboardingSubmissionSchema>;

export async function saveOnboarding(session: SessionContext, submission: OnboardingSubmission): Promise<ClientApprovalStatus> {
  const status = await completeOnboarding(session.db, submission);
  logger.info("portal.onboarding_saved", { userId: session.user.id, status, withHealthData: submission.health !== null });
  return status;
}

export async function submitCheckin(session: SessionContext, answers: CheckinAnswers): Promise<void> {
  const checkinId = await submitOwnCheckin(session.db, answers);
  logger.info("portal.checkin_submitted", { userId: session.user.id, checkinId });
}
