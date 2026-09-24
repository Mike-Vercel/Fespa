import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { homePathFor } from "@/server/auth/session";
import { createSupabaseServerClient, type AppSupabaseClient } from "@/server/db/supabase";
import { logger } from "@/server/logger";
import { LOGIN_PATH } from "@/validation/redirect";

/**
 * Destinazione dei link inviati via email (conferma registrazione, accesso con link,
 * invito, recupero password). Il token viene verificato sul server; in caso di successo
 * Supabase imposta i cookie di sessione e l'utente va nella sua area.
 */

const SUPPORTED_TYPES: readonly EmailOtpType[] = ["email", "signup", "invite", "magiclink", "recovery", "email_change"];
const RESET_PASSWORD_PATH = "/reimposta-password";
/** Il cambio email si chiede solo dal profilo dello staff: lì si mostra l'esito. */
const PROFILE_PATH = "/profile";
const MAX_TOKEN_LENGTH = 512;

function parseOtpType(value: string | null): EmailOtpType | null {
  return SUPPORTED_TYPES.find((type) => type === value) ?? null;
}

/** Ruolo dell'utente appena autenticato → pagina iniziale giusta. */
async function redirectHome(request: NextRequest, supabase: AppSupabaseClient, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return NextResponse.redirect(new URL(homePathFor(profile?.role ?? "client"), request.url));
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const code = request.nextUrl.searchParams.get("code");
  const type = parseOtpType(request.nextUrl.searchParams.get("type"));
  const failureUrl = new URL(`${LOGIN_PATH}?link=non-valido`, request.url);
  const supabase = await createSupabaseServerClient();

  // Formato dei template predefiniti di Supabase (?code=, flusso PKCE): funziona se il link si apre
  // nello stesso browser da cui è partita la richiesta. I nostri template usano token_hash, valido ovunque.
  if (!tokenHash && code && code.length <= MAX_TOKEN_LENGTH) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      logger.warn("auth.link_code_exchange_failed", { errorCode: error?.code });
      return NextResponse.redirect(failureUrl);
    }
    logger.info("auth.link_verified", { type: "code", userId: data.user.id });
    return redirectHome(request, supabase, data.user.id);
  }

  if (!tokenHash || tokenHash.length > MAX_TOKEN_LENGTH || !type) {
    return NextResponse.redirect(failureUrl);
  }

  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  // Cambio email con "Secure email change": il primo dei due link è valido ma non restituisce
  // né utente né sessione. Manca ancora quello inviato all'altro indirizzo.
  if (!error && !data.user && type === "email_change") {
    logger.info("auth.email_change_first_link_confirmed");
    return NextResponse.redirect(new URL(`${PROFILE_PATH}?email=primo-link`, request.url));
  }
  if (error || !data.user) {
    logger.warn("auth.link_verification_failed", { type, errorCode: error?.code });
    return NextResponse.redirect(failureUrl);
  }

  logger.info("auth.link_verified", { type, userId: data.user.id });
  if (type === "recovery") {
    return NextResponse.redirect(new URL(RESET_PASSWORD_PATH, request.url));
  }
  if (type === "email_change") {
    return NextResponse.redirect(new URL(`${PROFILE_PATH}?email=aggiornata`, request.url));
  }

  return redirectHome(request, supabase, data.user.id);
}
