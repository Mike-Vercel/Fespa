"use server";

import type { AuthError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WELCOME_SEEN_COOKIE } from "@/features/dashboard/welcome-cookie";
import { getAuthConfirmUrl } from "@/server/auth/app-url";
import { getSessionContext, homePathFor } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { logger } from "@/server/logger";
import type { FieldErrors } from "@/types/results";
import { emailOnlySchema, loginSchema, newPasswordSchema, signupCodeSchema, signUpSchema } from "@/validation/auth";
import { fieldErrorsOf } from "@/validation/field-errors";
import { LOGIN_PATH, postLoginPathFor } from "@/validation/redirect";

export type AuthFormState = {
  formError?: string;
  fieldErrors?: FieldErrors;
  /** Esito positivo da mostrare al posto del form (es. "controlla la tua email"). */
  success?: string;
  /** Reinserita nel form dopo un errore, per non farla riscrivere. Mai la password. */
  email?: string;
};

function readString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

/** Messaggi volutamente generici: non rivelano se l'email esiste. */
function authErrorMessage(error: AuthError): string {
  // Limite del servizio email (non dell'utente): con l'SMTP integrato Supabase invia poche email l'ora.
  if (error.code === "over_email_send_rate_limit") {
    return "In questo momento non riusciamo a inviare l'email di conferma: il servizio email ha raggiunto il limite di invii. Riprova tra un po'.";
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Troppi tentativi in poco tempo. Attendi qualche minuto e riprova.";
  }
  if (error.code === "invalid_credentials") {
    return "Email o password non corretti.";
  }
  if (error.code === "email_not_confirmed") {
    return "Devi prima confermare la tua email: trovi il link nel messaggio che ti abbiamo inviato.";
  }
  if (error.code === "weak_password") {
    return "La password è troppo debole: usane una più lunga, con lettere e numeri.";
  }
  if (error.code === "signup_disabled") {
    return "Le registrazioni sono momentaneamente chiuse. Contatta il team FESPA.";
  }
  return "Operazione non riuscita. Riprova tra poco.";
}

// --- Login ---------------------------------------------------------------------------

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rawEmail = readString(formData, "email") ?? "";
  const parsed = loginSchema.safeParse({ email: rawEmail, password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), email: rawEmail };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Nei log: solo codice e status, mai l'email o la password tentate.
    logger.warn("auth.sign_in_failed", { errorCode: error.code, status: error.status });
    return { formError: authErrorMessage(error), email: parsed.data.email };
  }

  // Il ruolo decide l'area di destinazione: la coach alla dashboard, la cliente alla sua area.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  logger.info("auth.sign_in_succeeded", { userId: data.user.id, role: profile?.role });
  redirect(postLoginPathFor(profile?.role ?? "client", readString(formData, "next")));
}

/** Accesso senza password: link monouso via email (solo per account esistenti). */
export async function requestLoginLinkAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), email: readString(formData, "email") };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: await getAuthConfirmUrl() },
  });
  if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) {
    return { formError: authErrorMessage(error), email: parsed.data.email };
  }
  if (error) {
    logger.warn("auth.login_link_failed", { errorCode: error.code, status: error.status });
  }
  // Stessa risposta che l'account esista o no.
  return { success: "Se l'indirizzo è registrato, riceverai a breve un link per accedere. Controlla anche lo spam." };
}

// --- Registrazione (clienti) -----------------------------------------------------

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rawEmail = readString(formData, "email") ?? "";
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: rawEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), email: rawEmail };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Il ruolo NON si sceglie qui: chiunque si registri nasce cliente in attesa (trigger nel DB).
    options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: await getAuthConfirmUrl() },
  });
  if (error) {
    logger.warn("auth.sign_up_failed", { errorCode: error.code, status: error.status });
    return { formError: authErrorMessage(error), email: parsed.data.email };
  }

  logger.info("auth.sign_up_requested");
  // Supabase non rivela se l'email era già registrata: la risposta è sempre la stessa.
  // Il form passa al passo del codice di conferma per questa email.
  return {
    success: `Ti abbiamo inviato un codice di conferma a ${parsed.data.email}.`,
    email: parsed.data.email,
  };
}

/**
 * Conferma dell'email con il codice OTP ricevuto (alternativa al link nella stessa email).
 * Se il codice è giusto Supabase crea la sessione e la persona prosegue nella sua area.
 */
export async function verifySignupCodeAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupCodeSchema.safeParse({ email: formData.get("email"), code: formData.get("code") ?? "" });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
  if (error || !data.user) {
    logger.warn("auth.signup_code_failed", { errorCode: error?.code, status: error?.status });
    const isRateLimited = error?.status === 429 || error?.code === "over_request_rate_limit";
    return {
      formError: isRateLimited
        ? "Troppi tentativi in poco tempo. Attendi qualche minuto e riprova."
        : "Codice non valido o scaduto. Controlla le cifre oppure richiedine uno nuovo.",
    };
  }

  logger.info("auth.signup_code_verified", { userId: data.user.id });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  revalidatePath("/", "layout");
  redirect(homePathFor(profile?.role ?? "client"));
}

export type ResendResult = { ok: boolean; message: string };

/** Nuovo codice (e nuovo link) di conferma per un'email registrata ma non ancora confermata. */
export async function resendSignupCodeAction(email: string): Promise<ResendResult> {
  const parsed = emailOnlySchema.safeParse({ email });
  if (!parsed.success) {
    return { ok: false, message: "Email non valida: torna indietro e correggila." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: await getAuthConfirmUrl() },
  });
  if (error) {
    logger.warn("auth.signup_code_resend_failed", { errorCode: error.code, status: error.status });
    return { ok: false, message: authErrorMessage(error) };
  }
  logger.info("auth.signup_code_resent");
  return { ok: true, message: "Nuovo codice inviato: controlla anche lo spam. Il codice precedente non vale più." };
}

// --- Password ----------------------------------------------------------------------

export async function requestPasswordResetAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), email: readString(formData, "email") };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: await getAuthConfirmUrl() });
  if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) {
    return { formError: authErrorMessage(error), email: parsed.data.email };
  }
  if (error) {
    logger.warn("auth.password_reset_failed", { errorCode: error.code, status: error.status });
  }
  return { success: "Se l'indirizzo è registrato, riceverai un link per scegliere una nuova password." };
}

export async function updatePasswordAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const session = await getSessionContext();
  if (!session) {
    redirect(LOGIN_PATH);
  }

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { error } = await session.db.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logger.warn("auth.password_update_failed", { errorCode: error.code, status: error.status });
    return { formError: authErrorMessage(error) };
  }
  logger.info("auth.password_updated", { userId: session.user.id });
  redirect(homePathFor(session.user.role));
}

// --- Logout ------------------------------------------------------------------------

/** Esce da questo dispositivo. */
export async function signOutAction(): Promise<void> {
  await signOut("local");
}

/** Esce da tutti i dispositivi (revoca tutte le sessioni dell'utente). */
export async function signOutEverywhereAction(): Promise<void> {
  await signOut("global");
}

async function signOut(scope: "local" | "global"): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope });
  if (error) {
    logger.warn("auth.sign_out_failed", { errorCode: error.code, scope });
  }
  // Al prossimo accesso la dashboard mostra di nuovo il benvenuto.
  (await cookies()).delete(WELCOME_SEEN_COOKIE);
  revalidatePath("/", "layout");
  redirect(LOGIN_PATH);
}
