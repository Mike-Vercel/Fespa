import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isAdminRole } from "@/domain/roles";
import { createSupabaseServerClient, type AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError, ForbiddenError, UnauthorizedError } from "@/server/errors";
import type { CurrentCoach, CurrentUser } from "@/types/domain";
import { CLIENT_HOME_PATH, LOGIN_PATH, STAFF_HOME_PATH } from "@/validation/redirect";

/**
 * Utente autenticato (qualsiasi ruolo) + client Supabase legato alla sua sessione (soggetto a RLS).
 */
export type SessionContext = {
  readonly user: CurrentUser;
  readonly db: AppSupabaseClient;
};

/**
 * Contesto dello STAFF (coach o admin). I service dell'area coach accettano solo questo:
 * non si può leggere nulla "per conto di nessuno", né per conto di una cliente.
 */
export type AuthenticatedContext = {
  readonly coach: CurrentCoach;
  readonly db: AppSupabaseClient;
};

/**
 * Verifica la sessione una sola volta per richiesta (React cache).
 * - getClaims() valida la firma del JWT (non si fida del cookie così com'è);
 * - il ruolo arriva dalla tabella profiles, MAI da user_metadata (modificabile dall'utente).
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const db = await createSupabaseServerClient();

  const { data: claimsData, error: claimsError } = await db.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (claimsError || !userId) {
    return null;
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new DataAccessError("profiles.getCurrent", profileError);
  }
  if (!profile) {
    return null;
  }

  return {
    db,
    user: {
      id: profile.id,
      email: typeof claimsData.claims.email === "string" ? claimsData.claims.email : "",
      fullName: profile.full_name,
      role: profile.role,
      avatarUrl: profile.avatar_url,
    },
  };
});

function toStaffContext(session: SessionContext): AuthenticatedContext | null {
  const { user, db } = session;
  if (user.role === "client") {
    return null;
  }
  return { db, coach: { ...user, role: user.role } };
}

/** Pagina iniziale giusta per il ruolo. */
export function homePathFor(role: CurrentUser["role"]): string {
  return role === "client" ? CLIENT_HOME_PATH : STAFF_HOME_PATH;
}

// --- Staff (coach e admin) --------------------------------------------------------

/** Per pagine e layout dell'area staff: senza sessione → login; una cliente → la sua area. */
export async function requireCoach(): Promise<AuthenticatedContext> {
  const session = await getSessionContext();
  if (!session) {
    redirect(LOGIN_PATH);
  }
  const staff = toStaffContext(session);
  if (!staff) {
    redirect(CLIENT_HOME_PATH);
  }
  return staff;
}

/** Per Route Handler e Server Action dello staff: 401 senza sessione, 403 per le clienti. */
export async function requireCoachOrThrow(): Promise<AuthenticatedContext> {
  const session = await getSessionContext();
  if (!session) {
    throw new UnauthorizedError();
  }
  const staff = toStaffContext(session);
  if (!staff) {
    throw new ForbiddenError();
  }
  return staff;
}

/** Area amministrazione: chi non è admin non deve nemmeno sapere che esiste (404). */
export async function requireAdmin(): Promise<AuthenticatedContext> {
  const staff = await requireCoach();
  if (!isAdminRole(staff.coach.role)) {
    notFound();
  }
  return staff;
}

export async function requireAdminOrThrow(): Promise<AuthenticatedContext> {
  const staff = await requireCoachOrThrow();
  if (!isAdminRole(staff.coach.role)) {
    throw new ForbiddenError();
  }
  return staff;
}

// --- Clienti -----------------------------------------------------------------------

/** Per pagine e layout dell'area cliente: senza sessione → login; lo staff → la sua area. */
export async function requireClient(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) {
    redirect(LOGIN_PATH);
  }
  if (session.user.role !== "client") {
    redirect(STAFF_HOME_PATH);
  }
  return session;
}

export async function requireClientOrThrow(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) {
    throw new UnauthorizedError();
  }
  if (session.user.role !== "client") {
    throw new ForbiddenError();
  }
  return session;
}
