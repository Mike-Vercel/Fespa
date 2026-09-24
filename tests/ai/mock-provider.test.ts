import { describe, expect, it, vi } from "vitest";
import { buildCheckinAnalysisPrompt } from "@/server/ai/context/checkin-analysis";
import { createMockProvider } from "@/server/ai/providers/mock";
import { checkinAnalysisSchema } from "@/server/ai/schemas/checkin-analysis";
import { copilotAnswerSchema } from "@/server/ai/schemas/copilot";
import type { ToolRunResult } from "@/server/ai/tools/types";
import { fakeCheckin } from "../support/fakes";

vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1000 });

const provider = createMockProvider();

function analysisRequest(challenges: string) {
  const checkin = fakeCheckin({
    answers: { ...fakeCheckin().answers!, sleepQuality: 2, stress: 4, challenges },
  });
  const { context, userContent } = buildCheckinAnalysisPrompt({
    today: "2026-09-24",
    timezone: "Europe/Rome",
    client: { status: "active", startedOn: "2026-04-01", goal: null },
    checkin,
    previousCheckins: [],
    notes: [],
  });
  return {
    purpose: "checkin_analysis" as const,
    context,
    userContent,
    system: "test",
    outputSchema: checkinAnalysisSchema,
    maxOutputTokens: 1000,
  };
}

describe("provider mock (DEMO_AI_MODE)", () => {
  it("si dichiara come mock", () => {
    expect(provider.info.isMock).toBe(true);
  });

  it("produce analisi conformi allo schema reale", async () => {
    const result = await provider.generateStructured(analysisRequest("Dormo poco per le scadenze di lavoro."));
    expect(checkinAnalysisSchema.safeParse(result.output).success).toBe(true);
  });

  it("segnala i contenuti sensibili senza conclusioni cliniche", async () => {
    const result = await provider.generateStructured(
      analysisRequest("Quando sono sotto pressione salto i pasti e poi mi sento in colpa."),
    );
    const analysis = checkinAnalysisSchema.parse(result.output);

    expect(analysis.sensitiveContentNote).toMatch(/professionista/);
    expect(analysis.followUpNeeded).toBe(true);
    expect(analysis.followUpSuggestion).not.toBeNull();
  });

  it("nel Copilot passa dal tool registry e cita solo fonti restituite dai tool", async () => {
    const executeTool = vi.fn(async (name: string): Promise<ToolRunResult> => {
      if (name === "get_followups") {
        return {
          isError: false,
          payload: {
            tool: "get_followups",
            followups: [
              { ref: "F1", title: "Chiamata", description: null, dueOn: "2026-09-20", status: "completed", completedOn: "2026-09-20" },
            ],
          },
        };
      }
      return { isError: true, message: "non previsto" };
    });

    const result = await provider.runAgent({
      purpose: "copilot_question",
      context: { today: "2026-09-24", question: "Quando è stato l'ultimo follow-up?", client: { firstName: "Sara", status: "active", startedOn: "2026-04-01" } },
      userContent: "test",
      system: "test",
      outputSchema: copilotAnswerSchema,
      maxOutputTokens: 1000,
      maxSteps: 5,
      tools: [],
      executeTool,
    });

    expect(executeTool).toHaveBeenCalledWith("get_followups", { status: "all", limit: 5 });
    const answer = copilotAnswerSchema.parse(result.output);
    expect(answer.sources).toEqual(["F1"]);
    expect(answer.answer).toMatch(/dimostrativa/);
  });
});
