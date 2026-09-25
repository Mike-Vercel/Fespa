import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/server/db/database.types";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { insertActionLog, type ActionLogEvent } from "@/server/repositories/ai-action-logs";
import {
  findActionRequest,
  insertActionRequest,
  transitionActionRequest,
  updateActionRequestPayload,
  type ActionRequestRecord,
} from "@/server/repositories/ai-action-requests";
import type { ActionRequestView } from "@/types/coach-ai";
import { assertConfirmation, confirmationFor, isToolAllowed, PENDING_ACTION_TTL_MS, type ConfirmationInput } from "./policy";
import type { AgentActionTool, AgentContext, PreparedAction } from "./tools/define";
import { findActionTool } from "./tools/registry";

/*
 * Ciclo di vita delle richieste di azione di Coach AI.
 *
 *   draft ─┐
 *          ├─(conferma della coach)→ executing → succeeded | failed (riprovabile se sicuro)
 *   pending┘                ↘ cancelled | expired
 *
 * La conferma:
 *  1. rilegge la richiesta con il client dell'utente (RLS: solo le proprie);
 *  2. ricontrolla ruolo, scadenza e livello di conferma richiesto (policy);
 *  3. rivalida l'input salvato con lo schema Zod del tool;
 *  4. passa ATOMICAMENTE a "executing" (un secondo clic non esegue di nuovo);
 *  5. esegue tramite il service esistente, che verifica di nuovo l'accesso;
 *  6. registra tutto nel registro append-only.
 */

// --- Anteprima salvata ------------------------------------------------------------------

const linkSchema = z.object({ label: z.string(), href: z.string().startsWith("/") });

/** Forma dell'anteprima nel database: riletta con Zod, perché il JSON salvato non è tipizzato. */
const storedPreviewSchema = z.object({
  title: z.string(),
  fields: z.array(z.object({ label: z.string(), value: z.string(), multiline: z.boolean().optional() })),
  warnings: z.array(z.string()),
  confirmLabel: z.string(),
  typedConfirmation: z.string().nullable(),
  editable: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      kind: z.enum(["text", "textarea", "date"]),
      value: z.string(),
      maxLength: z.number().optional(),
    }),
  ),
  copyText: z.string().nullable(),
});

const storedResultSchema = z.object({
  message: z.string(),
  link: linkSchema.nullable(),
  retryable: z.boolean().optional(),
});

type StoredPreview = z.infer<typeof storedPreviewSchema>;

function toStoredPreview(prepared: PreparedAction): StoredPreview {
  return {
    title: prepared.title,
    fields: prepared.fields,
    warnings: prepared.warnings,
    confirmLabel: prepared.confirmLabel,
    typedConfirmation: prepared.typedConfirmation ?? null,
    editable: prepared.editable ?? [],
    copyText: prepared.copyText ?? null,
  };
}

function effectiveStatus(record: ActionRequestRecord, now: Date): ActionRequestView["status"] {
  if (record.status === "pending" && record.expiresAt && new Date(record.expiresAt).getTime() < now.getTime()) {
    return "expired";
  }
  return record.status;
}

/** Vista per l'interfaccia. Una richiesta con dati illeggibili non viene mostrata (null). */
export function toActionView(record: ActionRequestRecord, now = new Date()): ActionRequestView | null {
  const preview = storedPreviewSchema.safeParse(record.preview);
  if (!preview.success) {
    logger.warn("coachAi.action_preview_invalid", { actionId: record.id });
    return null;
  }
  const result = record.result ? storedResultSchema.safeParse(record.result) : null;
  const status = effectiveStatus(record, now);
  return {
    id: record.id,
    toolName: record.toolName,
    title: preview.data.title,
    riskLevel: record.riskLevel,
    confirmation: confirmationFor(record.riskLevel),
    status,
    fields: preview.data.fields,
    warnings: preview.data.warnings,
    confirmLabel: preview.data.confirmLabel,
    typedConfirmation: preview.data.typedConfirmation,
    editable: status === "draft" || status === "pending" ? preview.data.editable : [],
    copyText: preview.data.copyText,
    source: record.automationId ? "automation" : "chat",
    result: status === "succeeded" && result?.success ? { message: result.data.message, link: result.data.link } : null,
    error:
      status === "failed"
        ? { message: record.errorMessage ?? "Operazione non riuscita.", retryable: result?.success ? result.data.retryable === true : false }
        : null,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

function requireView(record: ActionRequestRecord): ActionRequestView {
  const view = toActionView(record);
  if (!view) throw new NotFoundError("Azione non trovata.");
  return view;
}

// --- Registro ----------------------------------------------------------------------------

async function log(
  context: AgentContext,
  record: Pick<ActionRequestRecord, "id" | "conversationId" | "automationId" | "toolName" | "riskLevel" | "targetType" | "targetId">,
  event: ActionLogEvent,
  details: { inputSummary?: Json; errorCode?: string | null } = {},
): Promise<void> {
  await insertActionLog(context.auth.db, {
    actorId: context.auth.coach.id,
    conversationId: record.conversationId,
    actionRequestId: record.id,
    automationId: record.automationId,
    toolName: record.toolName,
    riskLevel: record.riskLevel,
    event,
    targetType: record.targetType,
    targetId: record.targetId,
    inputSummary: details.inputSummary ?? {},
    errorCode: details.errorCode ?? null,
  });
}

/** Tentativo di usare un tool non consentito al ruolo: finisce nel registro anche se non esiste una richiesta. */
export async function logDeniedTool(
  context: AgentContext,
  entry: { conversationId: string | null; toolName: string; riskLevel: ActionRequestRecord["riskLevel"] },
): Promise<void> {
  try {
    await insertActionLog(context.auth.db, {
      actorId: context.auth.coach.id,
      conversationId: entry.conversationId,
      actionRequestId: null,
      toolName: entry.toolName,
      riskLevel: entry.riskLevel,
      event: "denied",
      errorCode: "FORBIDDEN",
    });
  } catch (error) {
    logger.error("coachAi.audit_denied_failed", { tool: entry.toolName, error });
  }
}

// --- Creazione -----------------------------------------------------------------------------

/** JSON canonico (chiavi ordinate): lo stesso input produce sempre la stessa impronta. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Chiave di idempotenza: stesso tool + stesso input nello stesso contesto (turno o evento) = stessa richiesta. */
export function actionIdempotencyKey(scope: string, toolName: string, rawInput: unknown): string {
  const digest = createHash("sha256").update(canonicalJson(rawInput)).digest("hex").slice(0, 32);
  return `${scope}:${toolName}:${digest}`;
}

export async function createActionRequest(
  context: AgentContext,
  input: {
    tool: AgentActionTool;
    rawInput: Record<string, unknown>;
    validInput: unknown;
    prepared: PreparedAction;
    status: "draft" | "pending";
    conversationId: string | null;
    messageId: string | null;
    automationId: string | null;
    idempotencyScope: string;
  },
): Promise<ActionRequestView> {
  const { tool, prepared } = input;
  if (tool.risk === "destructive" && !prepared.typedConfirmation) {
    // Garanzia strutturale: un'azione distruttiva senza testo di conferma non può esistere.
    throw new Error(`Il tool distruttivo ${tool.name} non ha definito il testo di conferma.`);
  }

  const { record, created } = await insertActionRequest(context.auth.db, {
    ownerId: context.auth.coach.id,
    conversationId: input.conversationId,
    messageId: input.messageId,
    automationId: input.automationId,
    toolName: tool.name,
    riskLevel: tool.risk,
    status: input.status,
    input: input.rawInput as Json,
    preview: toStoredPreview(prepared) as Json,
    targetType: prepared.target?.type ?? tool.auditTarget,
    targetId: prepared.target?.id ?? null,
    idempotencyKey: actionIdempotencyKey(input.idempotencyScope, tool.name, input.rawInput),
    expiresAt: input.status === "pending" ? new Date(context.now.getTime() + PENDING_ACTION_TTL_MS).toISOString() : null,
  });

  if (created) {
    await log(context, record, input.status === "draft" ? "draft_created" : "proposed", {
      inputSummary: tool.auditSummary(input.validInput),
    });
  }
  return requireView(record);
}

// --- Operazioni della coach ---------------------------------------------------------------

async function loadOwnRequest(context: AgentContext, actionId: string): Promise<{ record: ActionRequestRecord; tool: AgentActionTool }> {
  // RLS: una richiesta di un altro utente semplicemente non esiste per chi chiama.
  const record = await findActionRequest(context.auth.db, actionId);
  const tool = record ? findActionTool(record.toolName) : undefined;
  if (!record || !tool) {
    throw new NotFoundError("Azione non trovata.");
  }
  if (!isToolAllowed(context.auth.coach.role, tool)) {
    await log(context, record, "denied", { errorCode: "FORBIDDEN" });
    throw new ForbiddenError("Il tuo ruolo non consente questa operazione.");
  }
  return { record, tool };
}

function asRecord(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const CONFIRMABLE: readonly ActionRequestRecord["status"][] = ["draft", "pending"];

export async function confirmAction(
  context: AgentContext,
  actionId: string,
  confirmation: ConfirmationInput,
): Promise<ActionRequestView> {
  const { record, tool } = await loadOwnRequest(context, actionId);

  // Idempotenza: un'azione già eseguita non si ripete, si restituisce l'esito.
  if (record.status === "succeeded") return requireView(record);
  if (record.status === "executing") {
    throw new ValidationError({}, "Questa azione è già in esecuzione.");
  }
  if (effectiveStatus(record, context.now) === "expired") {
    await transitionActionRequest(context.auth.db, record.id, ["pending"], { status: "expired" });
    await log(context, record, "expired");
    throw new ValidationError({}, "Questa richiesta è scaduta: chiedi di nuovo a Coach AI di prepararla.");
  }
  const retryable = storedResultSchema.safeParse(record.result).data?.retryable === true;
  const allowedFrom = record.status === "failed" && retryable ? (["failed"] as const) : CONFIRMABLE;
  if (!allowedFrom.includes(record.status)) {
    throw new ValidationError({}, "Questa azione non è più confermabile.");
  }

  const preview = storedPreviewSchema.parse(record.preview);
  assertConfirmation(tool.risk, confirmation, preview.typedConfirmation);

  // L'input salvato viene rivalidato: è ciò che la coach ha visto nell'anteprima.
  const validation = tool.validate(record.input);
  if (!validation.ok) {
    throw new ValidationError({}, "I dati di questa azione non sono più validi: chiedi di nuovo a Coach AI di prepararla.");
  }

  const claimed = await transitionActionRequest(context.auth.db, record.id, allowedFrom, {
    status: "executing",
    confirmedAt: context.now.toISOString(),
  });
  if (!claimed) {
    // Un'altra conferma (doppio clic, altra scheda) è arrivata prima: niente doppia esecuzione.
    const current = await findActionRequest(context.auth.db, record.id);
    if (current?.status === "succeeded") return requireView(current);
    throw new ValidationError({}, "Questa azione è già stata gestita.");
  }
  await log(context, claimed, "confirmed", { inputSummary: tool.auditSummary(validation.value) });

  try {
    const outcome = await tool.commit(context, validation.value);
    const done = await transitionActionRequest(context.auth.db, record.id, ["executing"], {
      status: "succeeded",
      executedAt: new Date().toISOString(),
      result: { message: outcome.message, link: outcome.link } as Json,
      errorCode: null,
      errorMessage: null,
    });
    await log(context, claimed, "succeeded").catch((error) => logger.error("coachAi.audit_failed", { actionId, error }));
    logger.info("coachAi.action_succeeded", { actionId, tool: tool.name });
    return requireView(done ?? claimed);
  } catch (error) {
    // Nessun successo simulato: l'errore viene salvato e mostrato. Si può riprovare solo se
    // l'errore è "atteso" (validazione, permessi, dati cambiati): in quel caso nulla è stato scritto.
    const expected = error instanceof AppError && error.httpStatus < 500;
    const message = error instanceof AppError ? error.userMessage : "Si è verificato un errore imprevisto. Nulla è stato confermato.";
    const failed = await transitionActionRequest(context.auth.db, record.id, ["executing"], {
      status: "failed",
      executedAt: new Date().toISOString(),
      errorCode: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      errorMessage: message.slice(0, 300),
      result: { message, link: null, retryable: expected && error.code !== "FORBIDDEN" } as Json,
    });
    await log(context, claimed, "failed", { errorCode: error instanceof AppError ? error.code : "INTERNAL_ERROR" }).catch((auditError) =>
      logger.error("coachAi.audit_failed", { actionId, error: auditError }),
    );
    logger.warn("coachAi.action_failed", { actionId, tool: tool.name, error });
    return requireView(failed ?? claimed);
  }
}

export async function cancelAction(context: AgentContext, actionId: string): Promise<ActionRequestView> {
  const { record } = await loadOwnRequest(context, actionId);
  if (record.status === "cancelled") return requireView(record);
  const cancelled = await transitionActionRequest(context.auth.db, record.id, ["draft", "pending", "failed"], { status: "cancelled" });
  if (!cancelled) {
    throw new ValidationError({}, "Questa azione non si può più annullare.");
  }
  await log(context, cancelled, "cancelled");
  return requireView(cancelled);
}

/**
 * "Modifica": la coach cambia i campi consentiti (es. il testo della risposta).
 * Il nuovo input viene rivalidato e l'anteprima ricostruita dal tool, con gli stessi controlli di accesso.
 */
export async function editAction(context: AgentContext, actionId: string, fields: Record<string, string>): Promise<ActionRequestView> {
  const { record, tool } = await loadOwnRequest(context, actionId);
  if (!CONFIRMABLE.includes(record.status) || effectiveStatus(record, context.now) === "expired") {
    throw new ValidationError({}, "Questa azione non è più modificabile.");
  }
  const nextRaw = tool.applyEdits(asRecord(record.input), fields);
  const validation = tool.validate(nextRaw);
  if (!validation.ok) {
    throw new ValidationError({}, validation.message);
  }
  const prepared = await tool.prepare(context, validation.value);
  const updated = await updateActionRequestPayload(context.auth.db, record.id, {
    input: nextRaw as Json,
    preview: toStoredPreview(prepared) as Json,
  });
  if (!updated) {
    throw new ValidationError({}, "Questa azione non è più modificabile.");
  }
  return requireView(updated);
}

/** Una bozza (o un'azione in attesa) ripresentata per la conferma, es. dopo "inviala". */
export async function presentAction(
  context: AgentContext,
  actionId: string,
  conversation: { conversationId: string; messageId: string },
): Promise<ActionRequestView> {
  const { record } = await loadOwnRequest(context, actionId);
  if (record.conversationId !== null && record.conversationId !== conversation.conversationId && !record.automationId) {
    throw new NotFoundError("Azione non trovata in questa conversazione.");
  }
  if (!CONFIRMABLE.includes(record.status) || effectiveStatus(record, context.now) === "expired") {
    throw new ValidationError({}, "Questa azione non è più aperta: va preparata di nuovo.");
  }
  const presented = await transitionActionRequest(context.auth.db, record.id, CONFIRMABLE, {
    status: "pending",
    messageId: conversation.messageId,
  });
  if (!presented) {
    throw new ValidationError({}, "Questa azione non è più aperta: va preparata di nuovo.");
  }
  return requireView(presented);
}
