import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import { getServerEnv } from "@/server/env";
import { DataAccessError } from "@/server/errors";

export type PasswordCheck = "valid" | "invalid" | "rate_limited";

/**
 * Verifica la password attuale prima di cambiarla: chi trova una sessione aperta (es. un computer
 * condiviso) non può sostituirla e chiudere fuori la proprietaria dell'account.
 * Usa un client senza cookie, così la sessione del browser non viene toccata;
 * la sessione aperta solo per la verifica viene chiusa subito.
 */
export async function verifyPassword(email: string, password: string): Promise<PasswordCheck> {
  const env = getServerEnv();
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) {
    await supabase.auth.signOut({ scope: "local" });
    return "valid";
  }
  if (error.code === "invalid_credentials") {
    return "invalid";
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "rate_limited";
  }
  throw new DataAccessError("auth.verifyPassword", error);
}
