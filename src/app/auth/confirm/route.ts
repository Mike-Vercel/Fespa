import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { homePathFor } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { logger } from "@/server/logger";
import { LOGIN_PATH } from "@/validation/redirect";

/**
 * Destinazione dei link inviati via email (conferma registrazione, accesso con link,
 * invito, recupero password). Il token viene verificato sul server; in caso di successo
 * Supabase imposta i cookie di sessione e l'utente va nella sua area.
 */

const SUPPORTED_TYPES: readonly EmailOtpType[] = ["email", "signup", "invite", "magiclink", "recovery", "email_change"];
const RESET_PASSWORD_PATH = "/reimposta-password";
const MAX_TOKEN_LENGTH = 512;

function parseOtpType(value: string | null): EmailOtpType | null {
  return SUPPORTED_TYPES.find((type) => type === value) ?? null;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = parseOtpType(request.nextUrl.searchParams.get("type"));
  const failureUrl = new URL(`${LOGIN_PATH}?link=non-valido`, request.url);

  if (!tokenHash || tokenHash.length > MAX_TOKEN_LENGTH || !type) {
    return NextResponse.redirect(failureUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) {
    logger.warn("auth.link_verification_failed", { type, errorCode: error?.code });
    return NextResponse.redirect(failureUrl);
  }

  logger.info("auth.link_verified", { type, userId: data.user.id });
  if (type === "recovery") {
    return NextResponse.redirect(new URL(RESET_PASSWORD_PATH, request.url));
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return NextResponse.redirect(new URL(homePathFor(profile?.role ?? "client"), request.url));
}
