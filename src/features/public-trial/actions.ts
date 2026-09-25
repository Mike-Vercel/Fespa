"use server";

import { cookies, headers } from "next/headers";
import { SIGNUP_PATH } from "@/features/marketing/content";
import { getServerEnv } from "@/server/env";
import { logger } from "@/server/logger";
import { createTrialDeps } from "@/server/trial";
import {
  enforceNewTrialQuota,
  loadTrial,
  resumeTrial,
  retryTrialEmail,
  sendTrialMessage,
  submitTrialLead,
  toTrialPublicError,
  toTrialView,
  TrialError,
  type TrialCaller,
  type TrialDeps,
  type TrialOutcome,
} from "@/server/trial/service";
import {
  clientIpFrom,
  generateTrialToken,
  hashTrialToken,
  ipBucketKey,
  parseTrialToken,
  TRIAL_COOKIE_MAX_AGE_SECONDS,
  TRIAL_COOKIE_NAME,
} from "@/server/trial/token";
import type { TrialActionResult } from "./types";

/*
 * Azioni della Prova FESPA (chat pubblica della home). Il browser invia solo testo e dati del
 * modulo: identità (cookie HttpOnly), limiti e regole li decide il server.
 */

type Context = { deps: TrialDeps; caller: TrialCaller | null; isNewTrial: boolean };

function originFrom(headerList: Headers): string {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * Prova del visitatore dal cookie. Con createIfMissing crea un token nuovo (e il cookie) se manca
 * o se la prova è scaduta: il limite di nuove prove per IP frena chi cancella i cookie di continuo.
 */
async function trialContext(createIfMissing: boolean): Promise<Context> {
  const env = getServerEnv();
  const headerList = await headers();
  const cookieStore = await cookies();

  const deps = createTrialDeps(new URL(SIGNUP_PATH, env.NEXT_PUBLIC_APP_URL ?? originFrom(headerList)).toString());
  if (!deps || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new TrialError("unavailable");
  }
  const ipBucket = ipBucketKey(clientIpFrom(headerList.get("x-forwarded-for"), headerList.get("x-real-ip")), env.SUPABASE_SERVICE_ROLE_KEY);

  let token = parseTrialToken(cookieStore.get(TRIAL_COOKIE_NAME)?.value);
  if (token && !(await deps.repo.get(hashTrialToken(token)))) {
    token = null; // scaduta o sconosciuta
  }
  if (token) {
    return { deps, caller: { tokenHash: hashTrialToken(token), ipBucket }, isNewTrial: false };
  }
  if (!createIfMissing) {
    return { deps, caller: null, isNewTrial: false };
  }

  await enforceNewTrialQuota(deps, ipBucket);
  token = generateTrialToken();
  cookieStore.set(TRIAL_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRIAL_COOKIE_MAX_AGE_SECONDS,
  });
  return { deps, caller: { tokenHash: hashTrialToken(token), ipBucket }, isNewTrial: true };
}

/** Esegue un'operazione e restituisce sempre una vista aggiornata quando esiste, anche con errori. */
async function run(
  createIfMissing: boolean,
  operation: (context: Context & { caller: TrialCaller }) => Promise<TrialOutcome>,
): Promise<TrialActionResult> {
  let context: Context | null = null;
  try {
    context = await trialContext(createIfMissing);
    if (!context.caller) {
      return { view: null, error: null };
    }
    const outcome = await operation({ ...context, caller: context.caller });
    return { view: toTrialView(outcome.state), error: outcome.error };
  } catch (error) {
    if (!(error instanceof TrialError)) {
      logger.error("trial.action_failed", { error: error instanceof Error ? error.name : "unknown" });
    }
    const latest = context?.caller ? await context.deps.repo.get(context.caller.tokenHash).catch(() => null) : null;
    return { view: latest ? toTrialView(latest) : null, error: toTrialPublicError(error) };
  }
}

/** Stato attuale (al caricamento della pagina). Non crea nulla: la prova nasce al primo messaggio. */
export async function loadTrialAction(): Promise<TrialActionResult> {
  return run(false, async ({ deps, caller }) => {
    const state = await loadTrial(deps, caller.tokenHash);
    if (!state) throw new TrialError("internal");
    return { state, error: null };
  });
}

export async function sendTrialMessageAction(input: { clientMessageId: string; text: string }): Promise<TrialActionResult> {
  return run(true, ({ deps, caller, isNewTrial }) => sendTrialMessage(deps, caller, input, { isNewTrial }));
}

export async function submitTrialLeadAction(input: { name: string; email: string; privacyConsent: boolean }): Promise<TrialActionResult> {
  return run(false, ({ deps, caller }) => submitTrialLead(deps, caller, input));
}

export async function resumeTrialAction(): Promise<TrialActionResult> {
  return run(false, ({ deps, caller }) => resumeTrial(deps, caller));
}

export async function retryTrialEmailAction(): Promise<TrialActionResult> {
  return run(false, ({ deps, caller }) => retryTrialEmail(deps, caller));
}
