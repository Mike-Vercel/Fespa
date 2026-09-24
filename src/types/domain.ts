/**
 * Vocabolario di dominio condiviso tra server e client.
 * Sono DTO minimi: contengono solo ciò che serve all'interfaccia.
 * Date e timestamp viaggiano come stringhe ISO (serializzabili tra server e client).
 */

import type { CheckinAnswers } from "@/validation/checkin";

/** Dal meno al più privilegiato. "admin" = amministrazione; "super_admin" gestisce anche i ruoli. */
export const USER_ROLES = ["client", "coach", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
/** Ruoli dello staff (area coach). */
export type CoachRole = Exclude<UserRole, "client">;

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
};

/** Utente dello staff (coach, amministrazione o super admin). */
export type CurrentCoach = Omit<CurrentUser, "role"> & { role: CoachRole };

export type ClientApprovalStatus = "pending" | "approved" | "rejected";

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const CONTACT_CHANNELS = ["whatsapp", "email", "phone"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/** Domanda di approfondimento su un infortunio e risposta della cliente. */
export type HealthFollowup = { question: string; answer: string };
export type HealthQuestionsSource = "ai" | "mock" | "standard";

export type HealthProfile = {
  hasInjuries: boolean;
  description: string | null;
  followup: HealthFollowup[];
  questionsSource: HealthQuestionsSource | null;
  consentAt: string;
};

/** Dati forniti dalla cliente nel questionario di ingresso. */
export type ClientPersonalProfile = {
  fullName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  goal: string | null;
  experienceLevel: ExperienceLevel | null;
  weeklyAvailability: number | null;
  preferredContact: ContactChannel | null;
  notesForCoach: string | null;
  onboardingCompletedAt: string | null;
};

export const CLIENT_STATUSES = ["onboarding", "active", "paused", "completed"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const FOLLOWUP_STATUSES = ["pending", "completed", "cancelled"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export type FollowupSource = "manual" | "ai_suggestion";
export type AIConfidence = "low" | "medium" | "high";
export type FollowupDecision = "pending" | "accepted" | "dismissed";

/** Riga della lista clienti (dalla vista client_overview). */
export type ClientListItem = {
  id: string;
  fullName: string;
  status: ClientStatus;
  goal: string | null;
  startedOn: string;
  lastCheckinAt: string | null;
  pendingReviewCount: number;
  oldestPendingReviewAt: string | null;
  nextFollowupOn: string | null;
  pendingFollowupCount: number;
  pendingAiSuggestionCount: number;
  approvalStatus: ClientApprovalStatus;
  email: string | null;
  /** La cliente ha attivato il proprio account (invito accettato o registrazione). */
  hasAccount: boolean;
  onboardingCompletedAt: string | null;
  /** Coach assegnate (numero reale solo per l'amministrazione: una coach vede solo sé stessa). */
  coachCount: number;
};

export type CheckinItem = {
  id: string;
  clientId: string;
  submittedAt: string;
  /** null se il jsonb salvato non rispetta lo schema: la UI lo segnala invece di rompersi. */
  answers: CheckinAnswers | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  coachReply: string | null;
};

/** Check-in con il nome della cliente, per le liste trasversali (dashboard, inbox). */
export type CheckinWithClient = CheckinItem & { clientName: string };

export type NoteItem = {
  id: string;
  clientId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  isOwn: boolean;
};

export type FollowupItem = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string | null;
  dueOn: string;
  status: FollowupStatus;
  completedAt: string | null;
  source: FollowupSource;
  aiAnalysisId: string | null;
};

export type FollowupSuggestion = {
  title: string;
  reason: string;
  dueInDays: number;
};

export type AIAnalysisItem = {
  id: string;
  clientId: string;
  checkinId: string;
  summary: string;
  topics: string[];
  followUpNeeded: boolean;
  followupSuggestion: FollowupSuggestion | null;
  followupDecision: FollowupDecision | null;
  suggestedQuestions: string[];
  confidence: AIConfidence;
  sensitiveContentNote: string | null;
  provider: string;
  model: string;
  isMock: boolean;
  createdAt: string;
};

/** Stato del provider AI mostrato nell'interfaccia (mai chiavi o dettagli sensibili). */
export type AIStatus =
  | { mode: "live"; providerLabel: string; model: string }
  | { mode: "mock" }
  | { mode: "not_configured" };
