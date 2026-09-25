import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
  BetaTool,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { AIProviderError } from "@/server/errors";
import { toStrictJsonSchema } from "./json-schema";
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
 * Adapter Anthropic (Claude). È l'unico file dell'app che conosce l'SDK del provider.
 */

/** Timeout per singola chiamata: la coach sta aspettando una risposta interattiva. */
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 1;
/** Richieste interattive: effort medio bilancia qualità e tempi di attesa. */
const INTERACTIVE_EFFORT = "medium";
/** Haiku 4.5 e Sonnet 4.5 non accettano il parametro effort. */
const MODELS_WITHOUT_EFFORT = /^claude-(haiku-4-5|sonnet-4-5)/;
/**
 * Fallback lato server (beta Anthropic): se il modello declina una richiesta per policy,
 * l'API la riesegue su un modello di riserva nella stessa chiamata.
 */
const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MODELS_WITH_SERVER_SIDE_FALLBACK = new Set(["claude-opus-5", "claude-fable-5-1"]);

type AnthropicConfig = {
  apiKey: string;
  model: string;
  /** Richiesto solo dalle chiavi non legate a un workspace (header anthropic-workspace-id). */
  workspaceId?: string;
};

function toAnthropicTool(tool: ToolSpec): BetaTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: toStrictJsonSchema(tool.inputSchema, "input"),
    strict: true,
  };
}

function emptyUsage(): AIUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
}

function addUsage(total: AIUsage, message: BetaMessage): void {
  total.inputTokens = (total.inputTokens ?? 0) + message.usage.input_tokens;
  total.outputTokens = (total.outputTokens ?? 0) + message.usage.output_tokens;
  total.cacheReadTokens = (total.cacheReadTokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0);
}

/** Rifiuti e troncamenti non producono un output utilizzabile: si fallisce in modo esplicito. */
function assertUsableResponse(message: BetaMessage): void {
  if (message.stop_reason === "refusal") {
    throw new AIProviderError("refused", new Error(`refusal category: ${message.stop_details?.category ?? "n/d"}`));
  }
  if (message.stop_reason === "max_tokens" || message.stop_reason === "model_context_window_exceeded") {
    throw new AIProviderError("invalid_output", new Error(`stop_reason: ${message.stop_reason}`));
  }
}

function parseJsonText(message: BetaMessage): unknown {
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AIProviderError("invalid_output", error);
  }
}

/** Storico neutro → messaggi Anthropic. Gli allegati diventano blocchi document/image (contenuto, non istruzioni). */
function toAnthropicMessage(message: AgentConversationMessage): BetaMessageParam {
  if (message.role === "assistant") {
    return { role: "assistant", content: message.text };
  }
  const content: BetaContentBlockParam[] = message.parts.map((part) => {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };
      case "document":
        return { type: "document", source: { type: "base64", media_type: part.mediaType, data: part.base64 } };
      case "image":
        return { type: "image", source: { type: "base64", media_type: part.mediaType, data: part.base64 } };
    }
  });
  return { role: "user", content };
}

/**
 * Contenuto dell'assistente da rimandare al turno successivo. Dopo un fallback a metà risposta,
 * prima dell'ultimo blocco "fallback" si tengono solo i testi: thinking e tool_use del modello
 * che ha declinato non vanno rimandati (e quei tool non vanno eseguiti).
 */
function contentAfterFallback(content: BetaContentBlock[]): { echo: BetaContentBlock[]; active: BetaContentBlock[] } {
  const boundary = content.findLastIndex((block) => block.type === "fallback");
  if (boundary === -1) {
    return { echo: content, active: content };
  }
  const before = content.slice(0, boundary).filter((block) => block.type === "text");
  const after = content.slice(boundary + 1);
  return { echo: [...before, ...after], active: after };
}

function toProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new AIProviderError("timeout", error);
  // Chiave errata o senza permessi: è un problema di configurazione, non un guasto temporaneo.
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AIProviderError("not_configured", error);
  }
  // 400/404: richiesta rifiutata per configurazione o account (credito, modello, workspace). Non è temporaneo.
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    return new AIProviderError("provider_rejected", error);
  }
  // 429, 5xx, rete: guasti temporanei, ha senso riprovare.
  return new AIProviderError("unavailable", error);
}

export function createAnthropicProvider(config: AnthropicConfig): AIProvider {
  const client = new Anthropic({ apiKey: config.apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });

  function buildParams(
    request: { system: string; outputSchema: z.ZodType; maxOutputTokens: number },
    messages: BetaMessageParam[],
    options: { tools?: BetaTool[]; forceFinalAnswer?: boolean } = {},
  ): MessageCreateParamsNonStreaming {
    return {
      model: config.model,
      max_tokens: request.maxOutputTokens,
      // System prompt stabile: la cache del prefisso (tool + system) riduce costi e latenza.
      system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
      messages,
      ...(options.tools
        ? { tools: options.tools, tool_choice: options.forceFinalAnswer ? { type: "none" } : { type: "auto" } }
        : {}),
      output_config: {
        format: { type: "json_schema", schema: toStrictJsonSchema(request.outputSchema, "output") },
        ...(MODELS_WITHOUT_EFFORT.test(config.model) ? {} : { effort: INTERACTIVE_EFFORT }),
      },
      ...(MODELS_WITH_SERVER_SIDE_FALLBACK.has(config.model)
        ? { betas: [SERVER_SIDE_FALLBACK_BETA], fallbacks: "default" }
        : {}),
      ...(config.workspaceId ? { workspace_id: config.workspaceId } : {}),
    };
  }

  /** Parametri per l'agente conversazionale: testo libero in streaming, niente output JSON. */
  function buildStreamParams(
    request: AgentStreamRequest,
    messages: BetaMessageParam[],
    tools: BetaTool[],
    forceFinalAnswer: boolean,
  ): BetaMessageStreamParams {
    return {
      model: config.model,
      max_tokens: request.maxOutputTokens,
      system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
      messages,
      tools,
      tool_choice: forceFinalAnswer ? { type: "none" } : { type: "auto" },
      ...(MODELS_WITHOUT_EFFORT.test(config.model) ? {} : { output_config: { effort: INTERACTIVE_EFFORT } }),
      ...(MODELS_WITH_SERVER_SIDE_FALLBACK.has(config.model)
        ? { betas: [SERVER_SIDE_FALLBACK_BETA], fallbacks: "default" }
        : {}),
      ...(config.workspaceId ? { workspace_id: config.workspaceId } : {}),
    };
  }

  async function send(params: MessageCreateParamsNonStreaming): Promise<BetaMessage> {
    try {
      return await client.beta.messages.create(params);
    } catch (error) {
      throw toProviderError(error);
    }
  }

  return {
    info: { provider: "anthropic", model: config.model, isMock: false },

    async generateStructured(request: StructuredRequest) {
      const response = await send(buildParams(request, [{ role: "user", content: request.userContent }]));
      const usage = emptyUsage();
      addUsage(usage, response);
      assertUsableResponse(response);
      return { output: parseJsonText(response), usage };
    },

    async runAgent(request: AgentRequest) {
      const tools = request.tools.map(toAnthropicTool);
      const messages: BetaMessageParam[] = [{ role: "user", content: request.userContent }];
      const usage = emptyUsage();

      for (let step = 1; step <= request.maxSteps; step += 1) {
        // All'ultimo passo niente più tool: il modello deve rispondere con ciò che ha raccolto.
        const isLastStep = step === request.maxSteps;
        const response = await send(buildParams(request, messages, { tools, forceFinalAnswer: isLastStep }));
        addUsage(usage, response);
        assertUsableResponse(response);

        if (response.stop_reason !== "tool_use") {
          return { output: parseJsonText(response), usage, steps: step };
        }

        // Il contenuto dell'assistente va rimandato intatto (inclusi eventuali blocchi di thinking).
        messages.push({ role: "assistant", content: response.content });
        const toolUses = response.content.filter((block): block is BetaToolUseBlock => block.type === "tool_use");
        const results = await Promise.all(
          toolUses.map(async (block): Promise<BetaToolResultBlockParam> => {
            const result = await request.executeTool(block.name, block.input);
            return {
              type: "tool_result",
              tool_use_id: block.id,
              content: result.isError ? result.message : JSON.stringify(result.payload),
              is_error: result.isError,
            };
          }),
        );
        // Tutti i risultati in un unico messaggio: così il modello continua a usare chiamate parallele.
        messages.push({ role: "user", content: results });
      }

      throw new AIProviderError("invalid_output", new Error("tool loop without final answer"));
    },

    async streamAgent(request: AgentStreamRequest): Promise<AgentStreamResult> {
      const tools = request.tools.map(toAnthropicTool);
      const messages = request.messages.map(toAnthropicMessage);
      const usage = emptyUsage();
      let text = "";

      for (let step = 1; step <= request.maxSteps; step += 1) {
        // All'ultimo passo niente più tool: il modello deve rispondere con ciò che ha raccolto.
        const isLastStep = step === request.maxSteps;
        const stream = client.beta.messages.stream(buildStreamParams(request, messages, tools, isLastStep), {
          signal: request.signal,
        });

        let stepHasText = false;
        stream.on("text", (delta) => {
          // Testi di passi diversi (prima e dopo i tool) restano paragrafi separati.
          const separator = !stepHasText && text !== "" ? "\n\n" : "";
          stepHasText = true;
          text += separator + delta;
          request.onTextDelta(separator + delta);
        });

        let response: BetaMessage;
        try {
          response = await stream.finalMessage();
        } catch (error) {
          throw toProviderError(error);
        }
        addUsage(usage, response);

        if (response.stop_reason === "refusal") {
          throw new AIProviderError("refused", new Error(`refusal category: ${response.stop_details?.category ?? "n/d"}`));
        }

        const { echo, active } = contentAfterFallback(response.content);
        const toolUses = active.filter((block): block is BetaToolUseBlock => block.type === "tool_use");
        if (toolUses.length === 0) {
          return { text, usage, steps: step, finish: "completed" };
        }
        // Un input troncato può sembrare valido: non si esegue nulla.
        if (response.stop_reason === "max_tokens") {
          throw new AIProviderError("invalid_output", new Error("tool input truncated by max_tokens"));
        }

        messages.push({ role: "assistant", content: echo });
        // In sequenza: l'ordine delle azioni mostrate alla coach resta quello deciso dal modello.
        const results: BetaToolResultBlockParam[] = [];
        let endTurn = false;
        for (const block of toolUses) {
          const result = await request.executeTool({ id: block.id, name: block.name, input: block.input });
          results.push({ type: "tool_result", tool_use_id: block.id, content: result.content, is_error: result.isError });
          endTurn ||= result.endTurn === true;
        }
        if (endTurn) {
          return { text, usage, steps: step, finish: "ended_by_tool" };
        }
        messages.push({ role: "user", content: results });
      }

      throw new AIProviderError("invalid_output", new Error("agent loop without final answer"));
    },
  };
}
