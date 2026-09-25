import "server-only";
import type { z } from "zod";
import type { CheckinAnalysisContext } from "@/server/ai/context/checkin-analysis";
import type { CopilotContext } from "@/server/ai/context/copilot";
import type { OnboardingQuestionsContext } from "@/server/ai/context/onboarding-questions";
import type { PublicTrialContext } from "@/server/ai/context/public-trial";
import type { ReplyDraftContext } from "@/server/ai/context/reply-draft";
import type { ToolRunResult } from "@/server/ai/tools/types";

/**
 * Interfaccia indipendente dal provider. Il resto dell'applicazione conosce SOLO questa:
 * aggiungere un provider (es. OpenAI) significa scrivere un nuovo file in questa cartella.
 *
 * Gli output sono `unknown` di proposito: il provider non è una fonte affidabile,
 * la validazione avviene sempre nei workflow (schemas/parse-output.ts).
 */

export type AIProviderInfo = {
  provider: string;
  model: string;
  /** true solo per il provider dimostrativo: i risultati vengono marcati come mock ovunque. */
  isMock: boolean;
};

export type AIUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
};

type BaseRequest = {
  system: string;
  userContent: string;
  outputSchema: z.ZodType;
  maxOutputTokens: number;
};

/**
 * Il `context` strutturato è lo stesso usato per costruire il prompt: il provider reale
 * usa il testo, il provider mock usa i dati strutturati per produrre un risultato plausibile.
 */
export type StructuredRequest = BaseRequest &
  (
    | { purpose: "checkin_analysis"; context: CheckinAnalysisContext }
    | { purpose: "reply_draft"; context: ReplyDraftContext }
    | { purpose: "onboarding_questions"; context: OnboardingQuestionsContext }
    | { purpose: "public_trial_reply" | "public_trial_summary"; context: PublicTrialContext }
  );

export type ToolSpec = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
};

export type ToolExecutor = (name: string, input: unknown) => Promise<ToolRunResult>;

export type AgentRequest = BaseRequest & {
  purpose: "copilot_question";
  context: CopilotContext;
  tools: ToolSpec[];
  executeTool: ToolExecutor;
  /** Limite alle iterazioni del loop con i tool (costi, latenza, cicli). */
  maxSteps: number;
};

export type StructuredResult = { output: unknown; usage: AIUsage };
export type AgentResult = StructuredResult & { steps: number };

// --- Agente conversazionale con streaming (Coach AI) ---------------------------------------

/** Allegato binario passato al modello come contenuto (mai come istruzione). */
export type AgentAttachmentPart =
  | { type: "document"; mediaType: "application/pdf"; base64: string }
  | { type: "image"; mediaType: "image/png" | "image/jpeg" | "image/webp"; base64: string };

export type AgentUserPart = { type: "text"; text: string } | AgentAttachmentPart;

/** Storico in forma neutra: il provider lo traduce nel formato della propria API. */
export type AgentConversationMessage =
  | { role: "user"; parts: AgentUserPart[] }
  | { role: "assistant"; text: string };

export type AgentToolCall = { id: string; name: string; input: unknown };

export type AgentToolResult = {
  /** Testo (di solito JSON) restituito al modello. */
  content: string;
  isError: boolean;
  /** true: il turno finisce qui senza richiamare il modello (es. domanda di chiarimento mostrata alla coach). */
  endTurn?: boolean;
};

export type AgentStreamRequest = {
  purpose: "coach_agent";
  system: string;
  messages: AgentConversationMessage[];
  tools: ToolSpec[];
  /** Limite alle iterazioni del loop con i tool (costi, latenza, cicli). */
  maxSteps: number;
  maxOutputTokens: number;
  /** Interrompe la generazione (pulsante "Stop" o chiusura della pagina). */
  signal: AbortSignal;
  onTextDelta: (delta: string) => void;
  executeTool: (call: AgentToolCall) => Promise<AgentToolResult>;
};

export type AgentStreamResult = {
  text: string;
  usage: AIUsage;
  steps: number;
  finish: "completed" | "ended_by_tool";
};

export interface AIProvider {
  readonly info: AIProviderInfo;
  generateStructured(request: StructuredRequest): Promise<StructuredResult>;
  runAgent(request: AgentRequest): Promise<AgentResult>;
  streamAgent(request: AgentStreamRequest): Promise<AgentStreamResult>;
}
