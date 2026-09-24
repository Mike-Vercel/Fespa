import "server-only";
import { getAuthConfirmUrl } from "@/server/auth/app-url";
import { secondsUntilNextEmail } from "@/server/auth/email-rate-limit";
import { verifyPassword } from "@/server/auth/password-check";
import type { AuthenticatedContext } from "@/server/auth/session";
import { DataAccessError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * Dati di accesso della persona collegata. Vivono in Supabase Auth (non in public.profiles),
 * quindi si leggono e si cambiano con la sua sessione: nessuna chiave di servizio.
 */
export type OwnAccount = {
  email: string;
  /** Nuova email in attesa di conferma (dai link inviati a entrambi gli indirizzi). */
  pendingEmail: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

export async function getOwnAccount(context: AuthenticatedContext): Promise<OwnAccount> {
  // getUser() interroga Supabase Auth: dati aggiornati, non quelli (magari vecchi) del token.
  const { data, error } = await context.db.auth.getUser();
  if (error || !data.user) {
    throw new DataAccessError("auth.getUser", error);
  }
  const { user } = data;
  return {
    email: user.email ?? context.coach.email,
    pendingEmail: user.new_email ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

/**
 * Chiede il cambio dell'email di accesso. Con "Secure email change" attivo in Supabase parte un link
 * sia al vecchio sia al nuovo indirizzo: l'email cambia solo quando sono confermati entrambi.
 */
export async function requestOwnEmailChange(context: AuthenticatedContext, newEmail: string): Promise<void> {
  if (newEmail === context.coach.email.toLowerCase()) {
    throw new ValidationError({ email: ["È già la tua email di accesso."] });
  }

  const { error } = await context.db.auth.updateUser({ email: newEmail }, { emailRedirectTo: await getAuthConfirmUrl() });
  if (!error) {
    logger.info("auth.email_change_requested", { userId: context.coach.id });
    return;
  }

  logger.warn("auth.email_change_failed", { errorCode: error.code, status: error.status });
  if (error.code === "email_exists") {
    throw new ValidationError({ email: ["Questa email è già usata da un altro account."] });
  }
  const waitSeconds = secondsUntilNextEmail(error);
  if (waitSeconds !== null) {
    throw new ValidationError({ email: [`Ti abbiamo appena inviato un'email: aspetta ${waitSeconds} secondi e riprova.`] });
  }
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    throw new ValidationError({ email: ["In questo momento non riusciamo a inviare email. Riprova tra qualche minuto."] });
  }
  throw new DataAccessError("auth.requestEmailChange", error);
}

/** Cambio password dal profilo: prima si verifica quella attuale (vedi verifyPassword). */
export async function changeOwnPassword(
  context: AuthenticatedContext,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const check = await verifyPassword(context.coach.email, currentPassword);
  if (check === "rate_limited") {
    throw new ValidationError({ currentPassword: ["Troppi tentativi in poco tempo. Attendi qualche minuto e riprova."] });
  }
  if (check === "invalid") {
    throw new ValidationError({ currentPassword: ["La password attuale non è corretta."] });
  }

  const { error } = await context.db.auth.updateUser({ password: newPassword });
  if (!error) {
    logger.info("auth.password_changed", { userId: context.coach.id });
    return;
  }

  logger.warn("auth.password_change_failed", { errorCode: error.code, status: error.status });
  if (error.code === "same_password") {
    throw new ValidationError({ password: ["La nuova password deve essere diversa da quella attuale."] });
  }
  if (error.code === "weak_password") {
    throw new ValidationError({ password: ["La password è troppo debole: usane una più lunga, con lettere e numeri."] });
  }
  throw new DataAccessError("auth.changePassword", error);
}
