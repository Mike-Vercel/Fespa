import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import { STAFF_ROLES } from "@/domain/roles";
import type { Json, TableRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import type {
  ClientApprovalStatus,
  CoachRole,
  UserRole,
  ClientPersonalProfile,
  HealthFollowup,
  HealthProfile,
  HealthQuestionsSource,
} from "@/types/domain";

/*
 * Account, dati personali e iscrizioni delle clienti.
 * Le scritture passano dalle funzioni RPC del database (controlli di ruolo e stato lato DB);
 * qui si traducono i loro codici d'errore in errori applicativi comprensibili.
 */

const RPC_ERRORS: Record<string, () => Error> = {
  FC001: () => new ForbiddenError(),
  FC002: () => new ValidationError({}, "Hai già inviato un check-in nelle ultime ore. Potrai inviarne un altro domani."),
  FC003: () => new ForbiddenError("Conferma prima la tua email: trovi il link nel messaggio che ti abbiamo inviato."),
  FC004: () => new ValidationError({ privacyConsent: ["Per proseguire serve il consenso al trattamento dei dati."] }),
  FC005: () => new ValidationError({ coachId: ["Seleziona una coach valida."] }),
  FC006: () => new NotFoundError("L'elemento richiesto non esiste più."),
  FC007: () => new ValidationError({}, "Non puoi modificare il tuo ruolo: chiedilo a un altro super admin."),
  // Violazione di unicità: l'email identifica una sola cliente.
  "23505": () => new ValidationError({ email: ["Esiste già una cliente con questa email."] }),
};

function toAppError(operation: string, error: PostgrestError): Error {
  return RPC_ERRORS[error.code]?.() ?? new DataAccessError(operation, error);
}

// --- Letture -----------------------------------------------------------------------

const PROFILE_COLUMNS =
  "full_name, email, phone, birth_date, goal, experience_level, weekly_availability, preferred_contact, notes_for_coach, onboarding_completed_at";

type ProfileRow = Pick<
  TableRow<"clients">,
  | "full_name"
  | "email"
  | "phone"
  | "birth_date"
  | "goal"
  | "experience_level"
  | "weekly_availability"
  | "preferred_contact"
  | "notes_for_coach"
  | "onboarding_completed_at"
>;

function toPersonalProfile(row: ProfileRow): ClientPersonalProfile {
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date,
    goal: row.goal,
    experienceLevel: row.experience_level,
    weeklyAvailability: row.weekly_availability,
    preferredContact: row.preferred_contact,
    notesForCoach: row.notes_for_coach,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

const followupSchema = z.array(z.object({ question: z.string(), answer: z.string() }));
const QUESTION_SOURCES: readonly HealthQuestionsSource[] = ["ai", "mock", "standard"];

function toHealthProfile(row: TableRow<"client_health_profiles">): HealthProfile {
  const followup = followupSchema.safeParse(row.followup);
  const source = QUESTION_SOURCES.find((candidate) => candidate === row.questions_source) ?? null;
  return {
    hasInjuries: row.has_injuries,
    description: row.description,
    followup: followup.success ? followup.data : [],
    questionsSource: source,
    consentAt: row.consent_at,
  };
}

/** Dati personali di una cliente (visibili alla coach assegnata, all'admin e alla cliente stessa). */
export async function findPersonalProfile(db: AppSupabaseClient, clientId: string): Promise<ClientPersonalProfile | null> {
  const { data, error } = await db.from("clients").select(PROFILE_COLUMNS).eq("id", clientId).maybeSingle();
  if (error) {
    throw new DataAccessError("clientAccounts.findPersonalProfile", error);
  }
  return data ? toPersonalProfile(data) : null;
}

export async function findHealthProfile(db: AppSupabaseClient, clientId: string): Promise<HealthProfile | null> {
  const { data, error } = await db.from("client_health_profiles").select("*").eq("client_id", clientId).maybeSingle();
  if (error) {
    throw new DataAccessError("clientAccounts.findHealthProfile", error);
  }
  return data ? toHealthProfile(data) : null;
}

export type OwnClientRecord = {
  id: string;
  status: TableRow<"clients">["status"];
  approvalStatus: ClientApprovalStatus;
  profile: ClientPersonalProfile;
};

/** La scheda della cliente autenticata (RLS: solo la propria). null se non ha ancora completato l'ingresso. */
export async function findOwnClientRecord(db: AppSupabaseClient, userId: string): Promise<OwnClientRecord | null> {
  const { data, error } = await db
    .from("clients")
    .select(`id, status, approval_status, ${PROFILE_COLUMNS}`)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("clientAccounts.findOwnRecord", error);
  }
  if (!data) {
    return null;
  }
  return { id: data.id, status: data.status, approvalStatus: data.approval_status, profile: toPersonalProfile(data) };
}

/** Nomi delle coach della cliente autenticata (la RLS espone solo le sue). */
export async function listOwnCoachNames(db: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await db.from("profiles").select("full_name").in("role", STAFF_ROLES).order("full_name");
  if (error) {
    throw new DataAccessError("clientAccounts.listOwnCoachNames", error);
  }
  return data.map((row) => row.full_name);
}

// --- Iscrizioni (admin) ------------------------------------------------------------

export type RegistrationRecord = {
  id: string;
  approvalStatus: ClientApprovalStatus;
  reviewedAt: string | null;
  profile: ClientPersonalProfile;
  health: HealthProfile | null;
};

const REGISTRATIONS_LIMIT = 100;

/** Auto-iscrizioni in un dato stato (la RLS le espone solo all'admin), le più vecchie prima. */
export async function listRegistrations(
  db: AppSupabaseClient,
  status: Exclude<ClientApprovalStatus, "approved">,
): Promise<RegistrationRecord[]> {
  const { data, error } = await db
    .from("clients")
    .select(`id, approval_status, reviewed_at, ${PROFILE_COLUMNS}`)
    .eq("approval_status", status)
    .order("onboarding_completed_at", { ascending: status === "pending" })
    .limit(REGISTRATIONS_LIMIT);
  if (error) {
    throw new DataAccessError("clientAccounts.listRegistrations", error);
  }
  if (data.length === 0) {
    return [];
  }

  const { data: healthRows, error: healthError } = await db
    .from("client_health_profiles")
    .select("*")
    .in(
      "client_id",
      data.map((row) => row.id),
    );
  if (healthError) {
    throw new DataAccessError("clientAccounts.listRegistrationHealth", healthError);
  }
  const healthByClient = new Map(healthRows.map((row) => [row.client_id, toHealthProfile(row)]));

  return data.map((row) => ({
    id: row.id,
    approvalStatus: row.approval_status,
    reviewedAt: row.reviewed_at,
    profile: toPersonalProfile(row),
    health: healthByClient.get(row.id) ?? null,
  }));
}

export async function countPendingRegistrations(db: AppSupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("approval_status", "pending");
  if (error) {
    throw new DataAccessError("clientAccounts.countPendingRegistrations", error);
  }
  return count ?? 0;
}

export type StaffMember = { id: string; fullName: string; role: CoachRole };

/** Coach e admin a cui si può assegnare una cliente. */
export async function listStaffMembers(db: AppSupabaseClient): Promise<StaffMember[]> {
  const { data, error } = await db.from("profiles").select("id, full_name, role").in("role", STAFF_ROLES).order("full_name");
  if (error) {
    throw new DataAccessError("clientAccounts.listStaffMembers", error);
  }
  return data.flatMap((row) => (row.role === "client" ? [] : [{ id: row.id, fullName: row.full_name, role: row.role }]));
}

// --- Scritture (RPC) -----------------------------------------------------------------

export async function createClientByStaff(
  db: AppSupabaseClient,
  input: { fullName: string; email: string | null; goal: string | null; startedOn: string },
): Promise<string> {
  const { data, error } = await db.rpc("create_client_by_staff", {
    p_full_name: input.fullName,
    p_email: input.email ?? "",
    p_goal: input.goal ?? "",
    p_started_on: input.startedOn,
  });
  if (error) {
    throw toAppError("clientAccounts.createByStaff", error);
  }
  return data;
}

export type OnboardingPayload = {
  profile: Omit<ClientPersonalProfile, "email" | "onboardingCompletedAt"> & { privacyConsent: true };
  health: {
    hasInjuries: boolean;
    description: string | null;
    followup: HealthFollowup[];
    questionsSource: HealthQuestionsSource | null;
  } | null;
};

export async function completeOnboarding(db: AppSupabaseClient, payload: OnboardingPayload): Promise<ClientApprovalStatus> {
  const { data, error } = await db.rpc("complete_client_onboarding", {
    p_profile: payload.profile satisfies Json,
    p_health: payload.health satisfies Json,
  });
  if (error) {
    throw toAppError("clientAccounts.completeOnboarding", error);
  }
  return data;
}

export async function submitOwnCheckin(db: AppSupabaseClient, answers: Json): Promise<string> {
  const { data, error } = await db.rpc("submit_client_checkin", { p_answers: answers });
  if (error) {
    throw toAppError("clientAccounts.submitCheckin", error);
  }
  return data;
}

export async function reviewRegistration(
  db: AppSupabaseClient,
  input: { clientId: string; decision: "pending" | "approved" | "rejected"; coachId: string | null },
): Promise<void> {
  const { error } = await db.rpc("review_client_registration", {
    p_client_id: input.clientId,
    p_decision: input.decision,
    // Per un rifiuto la coach non serve.
    p_coach_id: input.coachId,
  });
  if (error) {
    throw toAppError("clientAccounts.reviewRegistration", error);
  }
}

// --- Utenti e ruoli (amministrazione) ------------------------------------------------

export type RegisteredUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  /** Solo per chi ha una scheda cliente (dopo il questionario d'ingresso). */
  approvalStatus: ClientApprovalStatus | null;
  clientId: string | null;
  assignedClientCount: number;
};

/** Tutti gli account (RPC riservata all'amministrazione: include l'email da Supabase Auth). */
export async function listRegisteredUsers(db: AppSupabaseClient): Promise<RegisteredUser[]> {
  const { data, error } = await db.rpc("admin_list_users");
  if (error) {
    throw toAppError("clientAccounts.listRegisteredUsers", error);
  }
  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    emailConfirmed: row.email_confirmed,
    approvalStatus: row.approval_status,
    clientId: row.client_id,
    assignedClientCount: row.assigned_client_count,
  }));
}

export async function setUserRole(db: AppSupabaseClient, input: { userId: string; role: UserRole }): Promise<void> {
  const { error } = await db.rpc("set_user_role", { p_user_id: input.userId, p_role: input.role });
  if (error) {
    throw toAppError("clientAccounts.setUserRole", error);
  }
}

export async function setClientCoaches(db: AppSupabaseClient, input: { clientId: string; coachIds: string[] }): Promise<void> {
  const { error } = await db.rpc("set_client_coaches", { p_client_id: input.clientId, p_coach_ids: input.coachIds });
  if (error) {
    throw toAppError("clientAccounts.setClientCoaches", error);
  }
}

/** Coach attualmente assegnate a una cliente (visibili all'amministrazione). */
export async function listClientCoachIds(db: AppSupabaseClient, clientId: string): Promise<string[]> {
  const { data, error } = await db.from("coach_clients").select("coach_id").eq("client_id", clientId);
  if (error) {
    throw new DataAccessError("clientAccounts.listClientCoachIds", error);
  }
  return data.map((row) => row.coach_id);
}
