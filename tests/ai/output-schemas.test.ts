import { describe, expect, it } from "vitest";
import { toStrictJsonSchema } from "@/server/ai/providers/anthropic";
import { checkinAnalysisSchema } from "@/server/ai/schemas/checkin-analysis";
import { copilotAnswerSchema } from "@/server/ai/schemas/copilot";
import { parseAIOutput } from "@/server/ai/schemas/parse-output";
import { replyDraftSchema } from "@/server/ai/schemas/reply-draft";
import { COPILOT_TOOLS } from "@/server/ai/tools/registry";
import { AIProviderError } from "@/server/errors";

const validAnalysis = {
  summary: "Settimana con sonno scarso legato al lavoro, allenamenti ridotti a due su quattro.",
  topics: ["Sonno", "Stress lavorativo"],
  followUpNeeded: true,
  followUpSuggestion: { title: "Chiamata sul sonno", reason: "Sonno 2/5 per la seconda volta in un mese.", dueInDays: 2 },
  suggestedQuestions: ["Cosa ti tiene sveglia la sera?"],
  confidence: "medium",
  sensitiveContentNote: null,
};

describe("schema dell'analisi check-in", () => {
  it("accetta un output conforme", () => {
    expect(checkinAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("rifiuta un follow-up necessario senza proposta (incoerenza)", () => {
    const result = checkinAnalysisSchema.safeParse({ ...validAnalysis, followUpSuggestion: null });
    expect(result.success).toBe(false);
  });

  it("rifiuta campi extra e valori fuori dominio", () => {
    expect(checkinAnalysisSchema.safeParse({ ...validAnalysis, diagnosis: "..." }).success).toBe(false);
    expect(checkinAnalysisSchema.safeParse({ ...validAnalysis, confidence: "certa" }).success).toBe(false);
    expect(checkinAnalysisSchema.safeParse({ ...validAnalysis, topics: [] }).success).toBe(false);
  });
});

describe("schema del Copilot e della bozza", () => {
  it("accetta solo riferimenti alle fonti nel formato previsto", () => {
    const base = { answer: "Il sonno era già basso a inizio mese.", dataLimitations: null };
    expect(copilotAnswerSchema.safeParse({ ...base, sources: ["C1", "N2"] }).success).toBe(true);
    expect(copilotAnswerSchema.safeParse({ ...base, sources: ["https://evil.example"] }).success).toBe(false);
  });

  it("rifiuta bozze vuote o troppo lunghe", () => {
    expect(replyDraftSchema.safeParse({ draft: "Ciao", notesForCoach: [] }).success).toBe(false);
    expect(replyDraftSchema.safeParse({ draft: "a".repeat(3000), notesForCoach: [] }).success).toBe(false);
  });
});

describe("parseAIOutput", () => {
  it("restituisce i dati validati", () => {
    expect(parseAIOutput(checkinAnalysisSchema, validAnalysis, "test").topics).toEqual(["Sonno", "Stress lavorativo"]);
  });

  it("trasforma un output non conforme in AIProviderError gestito", () => {
    expect(() => parseAIOutput(checkinAnalysisSchema, { summary: "?" }, "test")).toThrow(AIProviderError);
    try {
      parseAIOutput(checkinAnalysisSchema, "non è JSON strutturato", "test");
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect((error as AIProviderError).reason).toBe("invalid_output");
    }
  });
});

describe("JSON Schema inviato al provider", () => {
  function collectObjects(node: unknown, found: Array<Record<string, unknown>> = []) {
    if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (record.type === "object") found.push(record);
      Object.values(record).forEach((value) => collectObjects(value, found));
    }
    return found;
  }

  it("è strict: ogni oggetto vieta proprietà aggiuntive e non ci sono vincoli non supportati", () => {
    const schema = toStrictJsonSchema(checkinAnalysisSchema, "output");
    const serialized = JSON.stringify(schema);

    expect(schema.$schema).toBeUndefined();
    expect(collectObjects(schema).every((object) => object.additionalProperties === false)).toBe(true);
    expect(serialized).not.toMatch(/"(minLength|maxLength|minimum|maximum)"/);
  });

  it("vale anche per gli input dei tool", () => {
    for (const tool of COPILOT_TOOLS) {
      const schema = toStrictJsonSchema(tool.inputSchema, "input");
      expect(schema.type, tool.name).toBe("object");
      expect(schema.additionalProperties, tool.name).toBe(false);
      expect(JSON.stringify(schema), tool.name).not.toContain("clientId");
    }
  });
});
