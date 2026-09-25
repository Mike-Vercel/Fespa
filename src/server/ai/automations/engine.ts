import "server-only";
import { createActionRequest } from "@/server/ai/agent/actions";
import { createAgentContext } from "@/server/ai/agent/agent-context";
import { sendCheckinReplyTool } from "@/server/ai/agent/tools/checkins";
import { resolveAIConfig } from "@/server/ai/config";
import { draftReply } from "@/server/ai/workflows/reply-draft";
import type { AuthenticatedContext } from "@/server/auth/session";
import { AppError, NotFoundError, RateLimitError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  claimAutomationEvent,
  finishAutomationEvent,
  findAutomation,
  listPendingAutomationEvents,
  recordAutomationRun,
  type AutomationEventRecord,
} from "@/server/repositories/ai-automations";
import { getAccessibleCheckin } from "@/server/services/checkins";

/*
 * MOTORE DELLE AUTOMAZIONI di Coach AI.
 *
 * Evento: il database registra un NEW_CHECKIN (trigger sui check-in) per ogni coach
 * che segue la cliente e ha la regola attiva. Nessun polling e nessuna service role:
 * gli eventi vengono elaborati quando la coach apre l'app, con la SUA sessione
 * (stessi permessi, stessa RLS, stesso rate limit AI).
 *
 * Azione GENERATE_REPLY_DRAFT: riusa il workflow "Prepara risposta" esistente e salva il risultato
 * come BOZZA (richiesta di azione in stato "draft"). L'invio richiede sempre la conferma umana:
 * il motore non chiama mai commit().
 */

/** Poche bozze per volta: ogni bozza è una richiesta AI (costi, tempi, rate limit). */
export const MAX_EVENTS_PER_RUN = 3;
const MAX_ATTEMPTS = 3;

export type AutomationRunSummary = { processed: number; drafts: number; skipped: number; failed: number };

type EventOutcome = "draft" | "skipped" | "failed" | "retry_later";

async function processEvent(auth: AuthenticatedContext, event: AutomationEventRecord): Promise<EventOutcome> {
  const automation = await findAutomation(auth.db, event.automationId);
  if (!automation?.enabled || !event.checkinId) {
    await finishAutomationEvent(auth.db, event.id, { status: "skipped", errorCode: "AUTOMATION_DISABLED" });
    return "skipped";
  }

  try {
    // Accesso verificato come in qualsiasi altra operazione della coach.
    const checkin = await getAccessibleCheckin(auth, event.checkinId);
    if (checkin.coachReply) {
      await finishAutomationEvent(auth.db, event.id, { status: "skipped", errorCode: "ALREADY_REPLIED" });
      return "skipped";
    }

    const draft = await draftReply(auth, { checkinId: checkin.id, instructions: null });
    const context = createAgentContext(auth);
    const rawInput = { checkinId: checkin.id, text: draft.draft };
    const validation = sendCheckinReplyTool.validate(rawInput);
    if (!validation.ok) {
      await finishAutomationEvent(auth.db, event.id, { status: "failed", errorCode: "INVALID_DRAFT" });
      return "failed";
    }
    const prepared = await sendCheckinReplyTool.prepare(context, validation.value);
    const view = await createActionRequest(context, {
      tool: sendCheckinReplyTool,
      rawInput,
      validInput: validation.value,
      prepared: {
        ...prepared,
        warnings: [
          "Preparata automaticamente: non è stata inviata. Rileggila prima di confermare.",
          ...(draft.meta.isMock ? ["Bozza dimostrativa (modalità demo, nessuna AI reale)."] : []),
          ...draft.notesForCoach,
          ...prepared.warnings,
        ],
      },
      status: "draft",
      conversationId: null,
      messageId: null,
      automationId: automation.id,
      idempotencyScope: `automation-event:${event.id}`,
    });
    await finishAutomationEvent(auth.db, event.id, { status: "done", actionRequestId: view.id });
    return "draft";
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Limite AI raggiunto: l'evento torna in coda e verrà ripreso più tardi.
      await finishAutomationEvent(auth.db, event.id, { status: "pending", errorCode: "RATE_LIMITED" });
      return "retry_later";
    }
    if (error instanceof NotFoundError) {
      // Check-in non più accessibile (cliente riassegnata o archiviata): niente bozza.
      await finishAutomationEvent(auth.db, event.id, { status: "skipped", errorCode: "NOT_ACCESSIBLE" });
      return "skipped";
    }
    const errorCode = error instanceof AppError ? error.code : "INTERNAL_ERROR";
    const retry = event.attempts + 1 < MAX_ATTEMPTS && !(error instanceof AppError && error.httpStatus < 500);
    await finishAutomationEvent(auth.db, event.id, { status: retry ? "pending" : "failed", errorCode });
    logger.warn("automations.event_failed", { eventId: event.id, errorCode, retry });
    return retry ? "retry_later" : "failed";
  }
}

/**
 * Elabora gli eventi in attesa dell'utente corrente. Ogni evento viene "preso in carico"
 * in modo atomico: due schede aperte non generano due bozze per lo stesso check-in.
 */
export async function runPendingAutomations(auth: AuthenticatedContext): Promise<AutomationRunSummary> {
  const summary: AutomationRunSummary = { processed: 0, drafts: 0, skipped: 0, failed: 0 };
  // Senza provider AI non c'è nulla da generare: gli eventi restano in coda.
  if (resolveAIConfig().kind === "none") return summary;

  const events = await listPendingAutomationEvents(auth.db, MAX_EVENTS_PER_RUN);
  const runs = new Map<string, EventOutcome[]>();

  for (const event of events) {
    if (!(await claimAutomationEvent(auth.db, event))) continue;
    const outcome = await processEvent(auth, event);
    runs.set(event.automationId, [...(runs.get(event.automationId) ?? []), outcome]);
    summary.processed += 1;
    if (outcome === "draft") summary.drafts += 1;
    if (outcome === "skipped") summary.skipped += 1;
    if (outcome === "failed") summary.failed += 1;
    if (outcome === "retry_later") break;
  }

  for (const [automationId, outcomes] of runs) {
    const failures = outcomes.filter((outcome) => outcome === "failed").length;
    const status = failures === 0 ? "success" : failures === outcomes.length ? "failed" : "partial";
    await recordAutomationRun(auth.db, automationId, { status, errorCode: failures > 0 ? "DRAFT_FAILED" : null }).catch((error) =>
      logger.error("automations.record_run_failed", { automationId, error }),
    );
  }
  if (summary.processed > 0) {
    logger.info("automations.run", { ...summary });
  }
  return summary;
}
