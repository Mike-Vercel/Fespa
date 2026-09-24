import "server-only";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { proposeFollowupTool } from "./proposal-tools";
import {
  getClientProfileTool,
  getCoachNotesTool,
  getFollowupsTool,
  getLatestCheckinTool,
  getPreviousCheckinsTool,
} from "./read-tools";
import type { RegisteredTool, ToolContext, ToolRunResult } from "./types";

/**
 * Registry dei tool del Coach Copilot.
 *   READ     → eseguiti server-side con i permessi della coach, solo sulla cliente selezionata.
 *   PROPOSAL → registrano una proposta; la scrittura richiede sempre la conferma della coach.
 */
export const COPILOT_TOOLS: readonly RegisteredTool[] = [
  getClientProfileTool,
  getLatestCheckinTool,
  getPreviousCheckinsTool,
  getCoachNotesTool,
  getFollowupsTool,
  proposeFollowupTool,
];

const TOOLS_BY_NAME = new Map(COPILOT_TOOLS.map((tool) => [tool.name, tool]));

const TOOL_FAILURE_MESSAGE = "Errore interno durante il recupero dei dati. Rispondi con le informazioni già disponibili.";

/** Esegue un tool richiesto dal modello. Non lancia mai: gli errori diventano risultati is_error. */
export async function executeTool(name: string, rawInput: unknown, context: ToolContext): Promise<ToolRunResult> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) {
    logger.warn("ai.tool_unknown", { tool: name });
    return { isError: true, message: `Tool sconosciuto: ${name}.` };
  }

  try {
    const result = await tool.run(rawInput, context);
    logger.info("ai.tool_executed", { tool: name, kind: tool.kind, isError: result.isError });
    return result;
  } catch (error) {
    logger.error("ai.tool_failed", { tool: name, error });
    return { isError: true, message: error instanceof AppError ? error.userMessage : TOOL_FAILURE_MESSAGE };
  }
}
