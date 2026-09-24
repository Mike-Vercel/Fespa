import { randomUUID } from "node:crypto";
import type { AuthenticatedContext } from "@/server/auth/session";
import type { AppSupabaseClient } from "@/server/db/supabase";
import type { CheckinItem } from "@/types/domain";

/**
 * Client database che fallisce a ogni utilizzo: nei test dei service i repository sono mockati,
 * quindi un accesso diretto al DB indicherebbe un bug (es. un controllo saltato).
 */
export function unusableDatabase(): AppSupabaseClient {
  const fail = (): never => {
    throw new Error("Accesso al database non previsto in questo test");
  };
  const database = {
    from: fail,
    rpc: fail,
    schema: fail,
    get auth(): never {
      return fail();
    },
  };
  // Cast confinato ai test: un finto client che non deve mai essere usato per query reali.
  return database as unknown as AppSupabaseClient;
}

export function fakeAuth(overrides: { role?: "coach" | "admin"; coachId?: string } = {}): AuthenticatedContext {
  return {
    db: unusableDatabase(),
    coach: {
      id: overrides.coachId ?? randomUUID(),
      email: "coach@example.com",
      fullName: "Giulia Test",
      role: overrides.role ?? "coach",
      avatarUrl: null,
    },
  };
}

export function fakeCheckin(overrides: Partial<CheckinItem> = {}): CheckinItem {
  return {
    id: randomUUID(),
    clientId: randomUUID(),
    submittedAt: "2026-09-23T17:00:00Z",
    reviewedAt: null,
    reviewedByName: null,
    coachReply: null,
    answers: {
      version: 1,
      energy: 3,
      sleepQuality: 3,
      stress: 3,
      nutritionAdherence: 3,
      trainingSessionsDone: 2,
      trainingSessionsPlanned: 3,
      wins: "Ho completato due allenamenti.",
      challenges: "Settimana impegnativa al lavoro.",
      questionsForCoach: null,
    },
    ...overrides,
  };
}
