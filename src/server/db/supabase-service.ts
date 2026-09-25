import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/server/env";
import type { Database } from "./database.types";

/**
 * Client Supabase con la service role key: SOLO per la Prova FESPA della home (server/trial/repository.ts).
 *
 * Eccezione motivata alla regola "l'app usa solo la chiave pubblica + RLS": i visitatori della prova
 * non hanno una sessione Supabase, e le tabelle della prova non devono essere raggiungibili dal browser
 * in nessun modo (RLS senza policy, funzioni eseguibili solo da service_role).
 * La chiave resta sul server (niente prefisso NEXT_PUBLIC_) e il repository chiama soltanto le
 * funzioni trial_*: nessuna query diretta su altre tabelle.
 *
 * Restituisce null se la chiave non è configurata: la prova risulta non disponibile.
 */
export function createTrialServiceClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type TrialServiceClient = NonNullable<ReturnType<typeof createTrialServiceClient>>;
