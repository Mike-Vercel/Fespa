import "server-only";
import type { z } from "zod";
import { buildPublicTrialPrompt, type PublicTrialStage } from "@/server/ai/context/public-trial";
import { buildPublicTrialSystemPrompt } from "@/server/ai/prompts";
import type { AIProvider } from "@/server/ai/providers/types";
import { publicTrialReplySchema, publicTrialSummarySchema, type PublicTrialSummaryOutput } from "@/server/ai/schemas/public-trial";
import { parseAIOutput } from "@/server/ai/schemas/parse-output";
import type { Json } from "@/server/db/database.types";
import type { EmailSender } from "@/server/email";
import { AIProviderError, DataAccessError } from "@/server/errors";
import { logger } from "@/server/logger";
import type { TrialErrorKind, TrialPublicError, TrialView } from "@/features/public-trial/types";
import { trialLeadSchema, trialMessageSchema, TRIAL_MAX_MESSAGES } from "@/validation/public-trial";
import { TrialRuleError, type TrialRepository, type TrialState } from "./repository";
import { buildTrialSummaryEmail } from "./summary-email";

/*
 * Prova FESPA: la logica. Il server è l'unica fonte di verità (conteggi e regole nelle funzioni SQL,
 * validazione con Zod, output dell'AI validato). Il client riceve solo una vista già calcolata.
 *
 * Percorso: messaggio 1 → risposta + domanda → messaggio 2 → risposta → nome/email/consenso →
 * ultima domanda → messaggio 3 → riepilogo strutturato → email. Poi la prova è chiusa.
 */

const REPLY_MAX_TOKENS = 4_000;
const SUMMARY_MAX_TOKENS = 6_000;
/** Solo un output non valido merita un secondo tentativo immediato; timeout e indisponibilità no. */
const INVALID_OUTPUT_ATTEMPTS = 2;

/** Limiti (finestra in secondi, massimo eventi). L'IP è un segnale secondario: limiti larghi. */
export const TRIAL_RATE_LIMITS = {
  aiPerTrial: { windowSeconds: 24 * 3600, max: 8 },
  aiPerIpShort: { windowSeconds: 10 * 60, max: 24 },
  aiPerIpDaily: { windowSeconds: 24 * 3600, max: 80 },
  aiGlobalDaily: { windowSeconds: 24 * 3600, max: 1_500 },
  newTrialPerIpDaily: { windowSeconds: 24 * 3600, max: 20 },
  emailPerIpDaily: { windowSeconds: 24 * 3600, max: 10 },
} as const;

export type TrialDeps = {
  repo: TrialRepository;
  /** Lancia AIProviderError("not_configured") se l'AI non è configurata. */
  getProvider: () => AIProvider;
  getEmailSender: () => EmailSender | null;
  /** URL assoluto della registrazione, per l'email. */
  signupUrl: string;
};

/** Chi sta chiamando: la prova (hash del token) e il bucket anonimo dell'IP. */
export type TrialCaller = { tokenHash: string; ipBucket: string };

export class TrialError extends Error {
  readonly kind: TrialErrorKind;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(kind: TrialErrorKind, options: { cause?: unknown; fieldErrors?: Record<string, string[]> } = {}) {
    super(`prova: ${kind}`, { cause: options.cause });
    this.name = "TrialError";
    this.kind = kind;
    this.fieldErrors = options.fieldErrors;
  }
}

const PUBLIC_ERRORS: Record<TrialErrorKind, { message: string; retryable: boolean }> = {
  unavailable: { message: "FESPA AI non è disponibile in questo momento. Riprova tra poco.", retryable: true },
  rate_limited: { message: "Troppe richieste in poco tempo. Riprova tra qualche minuto.", retryable: true },
  limit_reached: { message: "Hai utilizzato i 3 messaggi gratuiti.", retryable: false },
  busy: { message: "Sto ancora preparando la risposta precedente: un attimo.", retryable: true },
  lead_required: { message: "Prima di continuare servono nome ed email.", retryable: false },
  validation: { message: "Controlla i dati inseriti.", retryable: false },
  ai_failed: { message: "Non sono riuscita a preparare la risposta. Riprova.", retryable: true },
  email_failed: { message: "Non siamo riusciti a inviare il riepilogo. Riprova.", retryable: true },
  internal: { message: "Si è verificato un problema. Riprova tra poco.", retryable: true },
};

export function toTrialPublicError(error: unknown): TrialPublicError {
  const kind = classify(error);
  const fieldErrors = error instanceof TrialError ? error.fieldErrors : undefined;
  return { kind, ...PUBLIC_ERRORS[kind], ...(fieldErrors ? { fieldErrors } : {}) };
}

function classify(error: unknown): TrialErrorKind {
  if (error instanceof TrialError) return error.kind;
  if (error instanceof TrialRuleError) {
    switch (error.rule) {
      case "limit_reached":
        return "limit_reached";
      case "busy":
        return "busy";
      case "lead_required":
        return "lead_required";
      case "not_found":
      case "invalid_state":
        return "internal";
    }
  }
  if (error instanceof AIProviderError) {
    return error.reason === "not_configured" || error.reason === "demo_unsupported" || error.reason === "provider_rejected"
      ? "unavailable"
      : "ai_failed";
  }
  return "internal";
}

// --- Vista per il browser ------------------------------------------------------------------

function assistantCount(state: TrialState): number {
  return state.messages.filter((message) => message.role === "assistant").length;
}

/** Cosa va generato adesso, oppure null se la prova aspetta la persona (o è chiusa). */
export function nextStage(state: TrialState): PublicTrialStage | null {
  if (state.completedAt) return null;
  const last = state.messages.at(-1);
  if (last?.role === "user") {
    if (state.messageCount >= TRIAL_MAX_MESSAGES) return "summary";
    return state.messageCount === 1 ? "first_reply" : "lead_bridge";
  }
  if (state.messageCount === 2 && state.leadEmail && assistantCount(state) < 3) return "final_question";
  return null;
}

function summaryOf(state: TrialState): PublicTrialSummaryOutput | null {
  const parsed = publicTrialSummarySchema.safeParse(state.summary);
  return parsed.success ? parsed.data : null;
}

export function toTrialView(state: TrialState): TrialView {
  const stage = nextStage(state);
  const completed = state.completedAt !== null;
  const phase = completed
    ? "completed"
    : stage !== null
      ? "awaiting_reply"
      : state.messageCount === 2 && !state.leadEmail
        ? "lead_required"
        : "ready";
  const summary = completed ? summaryOf(state) : null;
  const emailStatus =
    state.emailStatus === "not_requested" ? "not_sent" : state.emailStatus === "sending" ? "sending" : state.emailStatus;

  return {
    phase,
    remaining: Math.max(0, TRIAL_MAX_MESSAGES - state.messageCount),
    pending: state.generationLocked,
    messages: state.messages.map((message) => ({ id: `m${message.seq}`, role: message.role, content: message.content })),
    lead: state.leadName && state.leadEmail ? { name: state.leadName, email: state.leadEmail } : null,
    result: summary ? { insights: summary.insights } : null,
    email: {
      status: emailStatus,
      canRetry: completed && emailStatus !== "sent" && emailStatus !== "sending" && state.emailAttempts < 3,
    },
  };
}

// --- Limiti ----------------------------------------------------------------------------------

async function enforce(repo: TrialRepository, bucket: string, limit: { windowSeconds: number; max: number }): Promise<void> {
  if (!(await repo.hitRateLimit(bucket, limit.windowSeconds, limit.max))) {
    throw new TrialError("rate_limited");
  }
}

/** Da chiamare prima di ogni generazione: per prova, per IP e tetto globale ai costi. */
async function enforceAIQuota(deps: TrialDeps, caller: TrialCaller): Promise<void> {
  await enforce(deps.repo, `ai:trial:${caller.tokenHash.slice(0, 32)}`, TRIAL_RATE_LIMITS.aiPerTrial);
  await enforce(deps.repo, `ai:ip10m:${caller.ipBucket}`, TRIAL_RATE_LIMITS.aiPerIpShort);
  await enforce(deps.repo, `ai:ipday:${caller.ipBucket}`, TRIAL_RATE_LIMITS.aiPerIpDaily);
  await enforce(deps.repo, "ai:global", TRIAL_RATE_LIMITS.aiGlobalDaily);
}

export async function enforceNewTrialQuota(deps: TrialDeps, ipBucket: string): Promise<void> {
  await enforce(deps.repo, `new:ip:${ipBucket}`, TRIAL_RATE_LIMITS.newTrialPerIpDaily);
}

// --- Generazione -----------------------------------------------------------------------------

function firstNameOf(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first.slice(0, 40) : null;
}

async function generate<TSchema extends z.ZodType>(
  provider: AIProvider,
  stage: PublicTrialStage,
  state: TrialState,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const isSummary = stage === "summary";
  const prompt = buildPublicTrialPrompt({
    stage,
    firstName: firstNameOf(state.leadName),
    transcript: state.messages.map((message) => ({ role: message.role, content: message.content })),
  });
  const purpose = isSummary ? "public_trial_summary" : "public_trial_reply";

  for (let attempt = 1; ; attempt += 1) {
    try {
      const result = await provider.generateStructured({
        purpose,
        context: prompt.context,
        system: buildPublicTrialSystemPrompt(isSummary ? "summary" : "reply"),
        userContent: prompt.userContent,
        outputSchema: schema,
        maxOutputTokens: isSummary ? SUMMARY_MAX_TOKENS : REPLY_MAX_TOKENS,
      });
      return parseAIOutput(schema, result.output, purpose);
    } catch (error) {
      const invalidOutput = error instanceof AIProviderError && error.reason === "invalid_output";
      if (!invalidOutput || attempt >= INVALID_OUTPUT_ATTEMPTS) throw error;
    }
  }
}

export type TrialOutcome = { state: TrialState; error: TrialPublicError | null };

/**
 * Genera il passo successivo (risposta, ultima domanda o riepilogo) con la generazione già
 * bloccata per questa prova. Se qualcosa fallisce il blocco viene rilasciato: si può riprovare.
 */
async function runStage(
  deps: TrialDeps,
  caller: TrialCaller,
  state: TrialState,
  options: { quotaChecked: boolean } = { quotaChecked: false },
): Promise<TrialOutcome> {
  const stage = nextStage(state);
  if (!stage) return { state, error: null };

  try {
    if (!options.quotaChecked) await enforceAIQuota(deps, caller);
    const provider = deps.getProvider();
    if (provider.info.isMock) {
      // La prova è una conversazione reale con i visitatori: niente risposte dimostrative.
      throw new AIProviderError("demo_unsupported");
    }

    if (stage === "summary") {
      const summary = await generate(provider, stage, state, publicTrialSummarySchema);
      const completed = await deps.repo.complete(caller.tokenHash, summary as Json);
      return await sendSummaryEmail(deps, caller, completed);
    }

    const { reply } = await generate(provider, stage, state, publicTrialReplySchema);
    return { state: await deps.repo.addAssistantMessage(caller.tokenHash, reply), error: null };
  } catch (error) {
    logger.warn("trial.stage_failed", { stage, reason: errorName(error) });
    const released = await deps.repo.releaseGeneration(caller.tokenHash).catch(() => state);
    return { state: released, error: toTrialPublicError(error) };
  }
}

function errorName(error: unknown): string {
  if (error instanceof AIProviderError) return `ai:${error.reason}`;
  if (error instanceof TrialError) return error.kind;
  if (error instanceof DataAccessError) return `db:${error.operation}`;
  return error instanceof Error ? error.name : "unknown";
}

// --- Operazioni ------------------------------------------------------------------------------

export async function loadTrial(deps: TrialDeps, tokenHash: string): Promise<TrialState | null> {
  return deps.repo.get(tokenHash);
}

/** Crea la prova se serve, registra il messaggio (il database controlla il limite) e risponde. */
export async function sendTrialMessage(
  deps: TrialDeps,
  caller: TrialCaller,
  input: unknown,
  options: { isNewTrial: boolean },
): Promise<TrialOutcome> {
  const parsed = trialMessageSchema.safeParse(input);
  if (!parsed.success) {
    throw new TrialError("validation", { fieldErrors: { text: parsed.error.issues.map((issue) => issue.message) } });
  }

  if (options.isNewTrial) {
    await deps.repo.start(caller.tokenHash);
  }
  // Prima i limiti, poi il messaggio: se si è oltre, il messaggio non viene consumato.
  await enforceAIQuota(deps, caller);

  const state = await deps.repo.addUserMessage(caller.tokenHash, parsed.data.clientMessageId, parsed.data.text);
  if (state.inserted === false) {
    // Invio ripetuto (doppio clic, retry): la risposta la sta già preparando la prima richiesta.
    return { state, error: null };
  }
  return runStage(deps, caller, state, { quotaChecked: true });
}

/** Nome, email e consenso (validati qui, normalizzati), poi l'ultima domanda. */
export async function submitTrialLead(deps: TrialDeps, caller: TrialCaller, input: unknown): Promise<TrialOutcome> {
  const parsed = trialLeadSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      (fieldErrors[field] ??= []).push(issue.message);
    }
    throw new TrialError("validation", { fieldErrors });
  }

  const saved = await deps.repo.saveLead(caller.tokenHash, parsed.data);
  if (nextStage(saved) !== "final_question") {
    return { state: saved, error: null };
  }
  const claimed = await deps.repo.claimGeneration(caller.tokenHash);
  return runStage(deps, caller, claimed);
}

/** Riprova il passo in sospeso (risposta, ultima domanda o riepilogo), una generazione alla volta. */
export async function resumeTrial(deps: TrialDeps, caller: TrialCaller): Promise<TrialOutcome> {
  const state = await deps.repo.get(caller.tokenHash);
  if (!state) throw new TrialRuleError("not_found");
  if (!nextStage(state)) return { state, error: null };
  const claimed = await deps.repo.claimGeneration(caller.tokenHash);
  return runStage(deps, caller, claimed);
}

/** Invia il riepilogo: "inviato" solo se il provider conferma. Idempotente (vedi trial_begin_email). */
export async function sendSummaryEmail(deps: TrialDeps, caller: TrialCaller, state: TrialState): Promise<TrialOutcome> {
  const failed = (current: TrialState): TrialOutcome => ({ state: current, error: toTrialPublicError(new TrialError("email_failed")) });

  const sender = deps.getEmailSender();
  if (!sender) {
    // Nessun tentativo consumato: quando il provider sarà configurato si potrà riprovare.
    logger.warn("trial.email_not_configured", {});
    return failed(state);
  }
  const summary = summaryOf(state);
  if (!summary || !state.leadEmail || !state.leadName) {
    return failed(state);
  }

  await enforce(deps.repo, `mail:ip:${caller.ipBucket}`, TRIAL_RATE_LIMITS.emailPerIpDaily);
  const sending = await deps.repo.beginEmail(caller.tokenHash);
  if (sending.emailStatus !== "sending") {
    return { state: sending, error: null }; // già inviata
  }

  const message = buildTrialSummaryEmail({
    to: sending.leadEmail ?? state.leadEmail,
    name: sending.leadName ?? state.leadName,
    summary,
    signupUrl: deps.signupUrl,
    idempotencyKey: `fespa-trial-summary-${caller.tokenHash.slice(0, 40)}`,
  });
  try {
    await sender.send(message);
    return { state: await deps.repo.finishEmail(caller.tokenHash, true), error: null };
  } catch (error) {
    logger.warn("trial.email_failed", { provider: sender.provider, reason: errorName(error) });
    return failed(await deps.repo.finishEmail(caller.tokenHash, false));
  }
}

export async function retryTrialEmail(deps: TrialDeps, caller: TrialCaller): Promise<TrialOutcome> {
  const state = await deps.repo.get(caller.tokenHash);
  if (!state) throw new TrialRuleError("not_found");
  if (!state.completedAt || state.emailStatus === "sent") return { state, error: null };
  return sendSummaryEmail(deps, caller, state);
}
