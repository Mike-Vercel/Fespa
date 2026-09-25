import { toConversationSummary } from "@/server/ai/agent/messages";
import { startCoachAgentTurn, streamCoachAgentTurn, type TurnSetup } from "@/server/ai/agent/runtime";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { assertSameOrigin, errorResponse, readJsonBody } from "@/server/http/json-route";
import type { CoachAIStreamEvent } from "@/types/coach-ai";
import { chatRequestSchema } from "@/validation/coach-ai";
import { fieldErrorsOf } from "@/validation/field-errors";

// Più passi con i tool e testo in streaming: serve un margine maggiore di una singola chiamata.
export const maxDuration = 120;

/**
 * Coach AI: un turno di conversazione in streaming (NDJSON, un evento JSON per riga).
 *
 * Prima dello stream (risposte JSON con lo status corretto): origine, sessione, body, provider,
 * proprietà della conversazione, allegati e rate limit. Poi lo stream: testo, attività dei tool,
 * schede azione ed esito finale. Chiudere la connessione ("Stop") interrompe la generazione.
 */
export async function POST(request: Request): Promise<Response> {
  let setup: TurnSetup;
  try {
    assertSameOrigin(request);
    const auth = await requireCoachOrThrow();
    const parsed = chatRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new ValidationError(fieldErrorsOf(parsed.error));
    }
    setup = await startCoachAgentTurn(auth, parsed.data);
  } catch (error) {
    return errorResponse("coachAi.chat", error);
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: CoachAIStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Il browser ha chiuso la connessione: la risposta viene comunque salvata.
        }
      };
      emit({
        type: "start",
        conversation: toConversationSummary(setup.conversation),
        userMessage: setup.userMessage,
        assistantMessageId: setup.assistantMessageId,
      });
      await streamCoachAgentTurn(setup, { signal: abort.signal, emit });
      try {
        controller.close();
      } catch {
        // Già chiuso dal browser.
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Niente buffering dei proxy: il testo deve arrivare mentre viene scritto.
      "X-Accel-Buffering": "no",
    },
  });
}
