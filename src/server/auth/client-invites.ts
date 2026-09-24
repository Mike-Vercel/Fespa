import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import { getServerEnv } from "@/server/env";
import { logger } from "@/server/logger";
import { getAppUrl, getAuthConfirmUrl } from "./app-url";

export type InviteDelivery = "sent" | "rate_limited" | "failed";

/**
 * Invia alla cliente il link per entrare nell'area clienti; l'account nasce al primo invio.
 * Usa un client Supabase senza sessione e con la sola chiave pubblica: è la stessa richiesta
 * che farebbe la cliente registrandosi, e non tocca i cookie della coach che invita.
 */
export async function sendClientAccessLink(email: string, fullName: string): Promise<InviteDelivery> {
  const env = getServerEnv();
  const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: await getAuthConfirmUrl(), data: { full_name: fullName } },
  });
  if (!error) {
    return "sent";
  }
  logger.warn("clients.invite_delivery_failed", { errorCode: error.code, status: error.status });
  return error.status === 429 || error.code === "over_email_send_rate_limit" ? "rate_limited" : "failed";
}

/**
 * Link da condividere a mano (WhatsApp, SMS…) se l'email non parte.
 * Registrandosi con la stessa email, la cliente viene collegata all'invito dopo la verifica.
 */
export async function getClientSignupUrl(email: string): Promise<string> {
  const url = new URL("/registrati", await getAppUrl());
  url.searchParams.set("email", email);
  return url.toString();
}
