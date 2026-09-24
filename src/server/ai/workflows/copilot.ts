import "server-only";
import { calendarDateIn } from "@/domain/dates";
import { buildCopilotPrompt } from "@/server/ai/context/copilot";
import { runAIInteraction } from "@/server/ai/interaction";
import { buildSystemPrompt } from "@/server/ai/prompts";
import { getAIProvider } from "@/server/ai/providers";
import { copilotAnswerSchema } from "@/server/ai/schemas/copilot";
import { parseAIOutput } from "@/server/ai/schemas/parse-output";
import { SourceRegistry } from "@/server/ai/sources";
import { COPILOT_TOOLS, executeTool } from "@/server/ai/tools/registry";
import type { ToolContext } from "@/server/ai/tools/types";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { NotFoundError } from "@/server/errors";
import { findClientOverview } from "@/server/repositories/clients";
import { assertClientAccess } from "@/server/services/access";
import type { CopilotAnswer } from "@/types/ai";

/** Limite alle iterazioni con i tool: contiene costi e latenza, evita cicli. */
const MAX_TOOL_STEPS = 5;
const MAX_OUTPUT_TOKENS = 16_000;

/**
 * Coach Copilot: risponde a una domanda su UNA cliente usando i tool di lettura.
 * La cliente è fissata qui, dopo il controllo di accesso: i tool non possono cambiarla.
 * Le proposte di scrittura tornano alla UI e richiedono la conferma della coach.
 */
export async function askCopilot(
  auth: AuthenticatedContext,
  input: { clientId: string; question: string },
): Promise<CopilotAnswer> {
  const provider = getAIProvider();
  const clientId = await assertClientAccess(auth, input.clientId);
  const { APP_TIMEZONE: timezone } = getServerEnv();

  return runAIInteraction({ db: auth.db, userId: auth.coach.id }, { requestType: "copilot_question", clientId, provider: provider.info }, async () => {
    const client = await findClientOverview(auth.db, clientId);
    if (!client) {
      throw new NotFoundError();
    }

    const toolContext: ToolContext = { auth, clientId, timezone, sources: new SourceRegistry(), proposals: [] };
    const prompt = buildCopilotPrompt({ today: calendarDateIn(timezone), question: input.question, client });

    const result = await provider.runAgent({
      purpose: "copilot_question",
      context: prompt.context,
      system: buildSystemPrompt("copilot"),
      userContent: prompt.userContent,
      outputSchema: copilotAnswerSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxSteps: MAX_TOOL_STEPS,
      tools: COPILOT_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      executeTool: (name, toolInput) => executeTool(name, toolInput, toolContext),
    });
    const output = parseAIOutput(copilotAnswerSchema, result.output, "copilot_question");

    return {
      value: {
        answer: output.answer,
        // Solo fonti realmente consultate in questa richiesta: riferimenti inventati vengono scartati.
        sources: toolContext.sources.resolve(output.sources),
        dataLimitations: output.dataLimitations,
        proposals: toolContext.proposals,
        meta: {
          provider: provider.info.provider,
          model: provider.info.model,
          isMock: provider.info.isMock,
          generatedAt: new Date().toISOString(),
        },
      },
      usage: result.usage,
    };
  });
}
