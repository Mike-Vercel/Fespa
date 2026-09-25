import "server-only";
import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import type {
  FunctionTool,
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseFunctionToolCall,
  ResponseInputContent,
  ResponseInputItem,
  ResponseOutputItem,
} from "openai/resources/responses/responses";
import type { ReasoningEffort } from "openai/resources/shared";
import type { z } from "zod";
import { AIProviderError } from "@/server/errors";
import { toOpenAIStrictSchema } from "./json-schema";
import type {
  AgentConversationMessage,
  AgentRequest,
  AgentStreamRequest,
  AgentStreamResult,
  AIProvider,
  AIUsage,
  StructuredRequest,
  ToolSpec,
} from "./types";

/*
 * Adapter OpenAI (Responses API). Come quello Anthropic, è l'unico file che conosce l'SDK:
 * workflow, tool, conferme e interfaccia non cambiano.
 *
 * - Responses API e non Chat Completions: sui modelli GPT-5.x le Chat Completions non accettano
 *   tool e ragionamento insieme.
 * - store: false → OpenAI non conserva le conversazioni. Il ragionamento tra un passo e l'altro
 *   viene ripassato in forma cifrata (include: reasoning.encrypted_content), come raccomandato.
 */

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 1;
/** Modelli con ragionamento (famiglia GPT-5 e serie "o"): accettano il parametro reasoning. */
const REASONING_MODELS = /^(gpt-5|o\d)/;
const INTERACTIVE_EFFORT: ReasoningEffort = "medium";

type OpenAIConfig = { apiKey: string; model: string };

function toOpenAITool(tool: ToolSpec): FunctionTool {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: toOpenAIStrictSchema(tool.inputSchema, "input"),
    strict: true,
  };
}

function jsonFormat(name: string, schema: z.ZodType) {
  return { format: { type: "json_schema" as const, name, schema: toOpenAIStrictSchema(schema, "output"), strict: true } };
}

/** Storico neutro → input della Responses API. Gli allegati sono contenuto, non istruzioni. */
function toInputItem(message: AgentConversationMessage): ResponseInputItem {
  if (message.role === "assistant") {
    return { role: "assistant", content: message.text };
  }
  const content: ResponseInputContent[] = message.parts.map((part) => {
    switch (part.type) {
      case "text":
        return { type: "input_text", text: part.text };
      case "document":
        return { type: "input_file", filename: "allegato.pdf", file_data: `data:${part.mediaType};base64,${part.base64}` };
      case "image":
        return { type: "input_image", detail: "auto", image_url: `data:${part.mediaType};base64,${part.base64}` };
    }
  });
  return { role: "user", content };
}

function emptyUsage(): AIUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
}

function addUsage(total: AIUsage, usage: Response["usage"] | undefined): void {
  if (!usage) return;
  total.inputTokens = (total.inputTokens ?? 0) + usage.input_tokens;
  total.outputTokens = (total.outputTokens ?? 0) + usage.output_tokens;
  total.cacheReadTokens = (total.cacheReadTokens ?? 0) + (usage.input_tokens_details?.cached_tokens ?? 0);
}

function toProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;
  if (error instanceof APIConnectionTimeoutError) return new AIProviderError("timeout", error);
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return new AIProviderError("not_configured", error);
  }
  // Credito esaurito: OpenAI risponde 429 con codice "insufficient_quota". Riprovare non serve.
  if (error instanceof RateLimitError && error.code === "insufficient_quota") {
    return new AIProviderError("provider_rejected", error);
  }
  if (error instanceof BadRequestError || error instanceof NotFoundError) {
    return new AIProviderError("provider_rejected", error);
  }
  return new AIProviderError("unavailable", error);
}

function hasRefusal(output: ResponseOutputItem[]): boolean {
  return output.some((item) => item.type === "message" && item.content.some((part) => part.type === "refusal"));
}

/** Rifiuti e troncamenti non producono un output utilizzabile: si fallisce in modo esplicito. */
function assertUsable(response: Response, options: { allowTruncatedText: boolean }): void {
  const reason = response.incomplete_details?.reason;
  if (hasRefusal(response.output) || reason === "content_filter") {
    throw new AIProviderError("refused", new Error(`status: ${response.status}, reason: ${reason ?? "refusal"}`));
  }
  if (response.status === "failed") {
    throw new AIProviderError("unavailable", new Error(response.error?.message ?? "response failed"));
  }
  if (response.status === "incomplete" && !options.allowTruncatedText) {
    throw new AIProviderError("invalid_output", new Error(`incomplete: ${reason ?? "n/d"}`));
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AIProviderError("invalid_output", error);
  }
}

const INVALID_ARGUMENTS = Symbol("invalid-arguments");

/** Gli argomenti arrivano come stringa JSON: se non è leggibile, il tool non viene eseguito. */
function parseToolArguments(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return INVALID_ARGUMENTS;
  }
}

/**
 * Elementi dell'output da ripassare al passo successivo: ragionamento (cifrato), chiamate ai tool
 * e testo. Gli altri tipi (strumenti nativi di OpenAI) non vengono usati da questa app.
 */
function replayableItems(output: ResponseOutputItem[]): ResponseInputItem[] {
  return output.flatMap((item): ResponseInputItem[] =>
    item.type === "reasoning" || item.type === "function_call" || item.type === "message" ? [item] : [],
  );
}

function functionCalls(output: ResponseOutputItem[]): ResponseFunctionToolCall[] {
  return output.flatMap((item) => (item.type === "function_call" ? [item] : []));
}

export function createOpenAIProvider(config: OpenAIConfig): AIProvider {
  const client = new OpenAI({ apiKey: config.apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });
  const isReasoningModel = REASONING_MODELS.test(config.model);
  const common = {
    model: config.model,
    store: false,
    ...(isReasoningModel ? { reasoning: { effort: INTERACTIVE_EFFORT }, include: ["reasoning.encrypted_content" as const] } : {}),
  };

  async function send(params: ResponseCreateParamsNonStreaming): Promise<Response> {
    try {
      return await client.responses.create(params);
    } catch (error) {
      throw toProviderError(error);
    }
  }

  return {
    info: { provider: "openai", model: config.model, isMock: false },

    async generateStructured(request: StructuredRequest) {
      const response = await send({
        ...common,
        instructions: request.system,
        input: request.userContent,
        text: jsonFormat(request.purpose, request.outputSchema),
        max_output_tokens: request.maxOutputTokens,
      });
      const usage = emptyUsage();
      addUsage(usage, response.usage);
      assertUsable(response, { allowTruncatedText: false });
      return { output: parseJson(response.output_text), usage };
    },

    async runAgent(request: AgentRequest) {
      const tools = request.tools.map(toOpenAITool);
      const input: ResponseInputItem[] = [{ role: "user", content: request.userContent }];
      const usage = emptyUsage();

      for (let step = 1; step <= request.maxSteps; step += 1) {
        const response = await send({
          ...common,
          instructions: request.system,
          input,
          tools,
          tool_choice: step === request.maxSteps ? "none" : "auto",
          parallel_tool_calls: false,
          text: jsonFormat(request.purpose, request.outputSchema),
          max_output_tokens: request.maxOutputTokens,
        });
        addUsage(usage, response.usage);
        assertUsable(response, { allowTruncatedText: false });
        const calls = functionCalls(response.output);
        if (calls.length === 0) {
          return { output: parseJson(response.output_text), usage, steps: step };
        }
        input.push(...replayableItems(response.output));
        for (const call of calls) {
          const result = await request.executeTool(call.name, parseToolArguments(call.arguments));
          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: result.isError ? result.message : JSON.stringify(result.payload),
          });
        }
      }
      throw new AIProviderError("invalid_output", new Error("tool loop without final answer"));
    },

    async streamAgent(request: AgentStreamRequest): Promise<AgentStreamResult> {
      const tools = request.tools.map(toOpenAITool);
      const input: ResponseInputItem[] = request.messages.map(toInputItem);
      const usage = emptyUsage();
      let text = "";

      for (let step = 1; step <= request.maxSteps; step += 1) {
        // All'ultimo passo niente più tool: il modello deve rispondere con ciò che ha raccolto.
        const isLastStep = step === request.maxSteps;
        let stepText = "";
        let final: Response | null = null;

        try {
          const stream = await client.responses.create(
            {
              ...common,
              instructions: request.system,
              input,
              tools,
              tool_choice: isLastStep ? "none" : "auto",
              // Con i tool "strict" le chiamate parallele non garantiscono lo schema: una alla volta.
              parallel_tool_calls: false,
              max_output_tokens: request.maxOutputTokens,
              stream: true,
            },
            { signal: request.signal },
          );
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              // Testi di passi diversi (prima e dopo i tool) restano paragrafi separati.
              const separator = stepText === "" && text !== "" ? "\n\n" : "";
              stepText += event.delta;
              text += separator + event.delta;
              request.onTextDelta(separator + event.delta);
            } else if (event.type === "response.completed" || event.type === "response.incomplete" || event.type === "response.failed") {
              final = event.response;
            } else if (event.type === "error") {
              throw new AIProviderError("unavailable", new Error(`${event.code ?? "error"}: ${event.message}`));
            }
          }
        } catch (error) {
          throw toProviderError(error);
        }

        if (!final) {
          throw new AIProviderError("unavailable", new Error("stream ended without a final response"));
        }
        addUsage(usage, final.usage);
        const calls = functionCalls(final.output);
        // Un testo troncato si restituisce così com'è; argomenti di tool troncati no.
        assertUsable(final, { allowTruncatedText: calls.length === 0 });
        if (calls.length === 0) {
          return { text, usage, steps: step, finish: "completed" };
        }

        input.push(...replayableItems(final.output));
        let endTurn = false;
        for (const call of calls) {
          const parsed = parseToolArguments(call.arguments);
          const result =
            parsed === INVALID_ARGUMENTS
              ? { content: JSON.stringify({ status: "FAILED", message: "Argomenti non validi (JSON non leggibile)." }), isError: true }
              : await request.executeTool({ id: call.call_id, name: call.name, input: parsed });
          input.push({ type: "function_call_output", call_id: call.call_id, output: result.content });
          endTurn ||= "endTurn" in result && result.endTurn === true;
        }
        if (endTurn) {
          return { text, usage, steps: step, finish: "ended_by_tool" };
        }
      }

      throw new AIProviderError("invalid_output", new Error("agent loop without final answer"));
    },
  };
}
