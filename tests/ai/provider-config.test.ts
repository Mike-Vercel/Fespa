import { describe, expect, it } from "vitest";
import { z } from "zod";
import { resolveAIConfig } from "@/server/ai/config";
import { toOpenAIStrictSchema } from "@/server/ai/providers/json-schema";
import type { ServerEnv } from "@/server/env";

function env(overrides: Partial<ServerEnv>): ServerEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-di-test-abbastanza-lunga",
    NEXT_PUBLIC_APP_URL: undefined,
    APP_TIMEZONE: "Europe/Rome",
    AI_PROVIDER: undefined,
    AI_API_KEY: undefined,
    ANTHROPIC_API_KEY: undefined,
    OPENAI_API_KEY: undefined,
    AI_MODEL: undefined,
    ANTHROPIC_MODEL: undefined,
    OPENAI_MODEL: undefined,
    AI_WORKSPACE_ID: undefined,
    DEMO_AI_MODE: false,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    RESEND_API_KEY: undefined,
    EMAIL_FROM: undefined,
    ...overrides,
  };
}

describe("scelta del provider AI: decide il modello", () => {
  // Stessa configurazione del progetto (.env.local e Vercel).
  const project = {
    AI_PROVIDER: "anthropic" as const,
    AI_API_KEY: "generica",
    ANTHROPIC_API_KEY: "ant",
    OPENAI_API_KEY: "oai",
    ANTHROPIC_MODEL: "claude-opus-5",
  };

  it("AI_MODEL=gpt-5.5 usa OpenAI con la sua chiave, anche se AI_PROVIDER dice anthropic", () => {
    expect(resolveAIConfig(env({ ...project, AI_MODEL: "gpt-5.5" }))).toEqual({ kind: "openai", apiKey: "oai", model: "gpt-5.5" });
  });

  it("senza AI_MODEL si usa ANTHROPIC_MODEL con la chiave Anthropic", () => {
    expect(resolveAIConfig(env(project))).toMatchObject({ kind: "anthropic", apiKey: "ant", model: "claude-opus-5" });
    expect(resolveAIConfig(env({ ...project, AI_PROVIDER: undefined }))).toMatchObject({ kind: "anthropic", model: "claude-opus-5" });
  });

  it("un modello claude-… usa sempre Anthropic", () => {
    expect(resolveAIConfig(env({ ...project, AI_MODEL: "claude-sonnet-5" }))).toMatchObject({ kind: "anthropic", apiKey: "ant", model: "claude-sonnet-5" });
  });

  it("AI_PROVIDER serve solo per nomi non riconoscibili; senza chiave né modello l'AI non è configurata", () => {
    expect(resolveAIConfig(env({ AI_MODEL: "modello-custom", AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }))).toEqual({ kind: "openai", apiKey: "k", model: "modello-custom" });
    expect(resolveAIConfig(env({ AI_MODEL: "modello-custom", OPENAI_API_KEY: "k" }))).toEqual({ kind: "none" });
    expect(resolveAIConfig(env({ AI_MODEL: "gpt-5.5" }))).toEqual({ kind: "none" });
    expect(resolveAIConfig(env({}))).toEqual({ kind: "none" });
  });

  it("senza chiave specifica usa AI_API_KEY; DEMO_AI_MODE ha la precedenza su tutto", () => {
    expect(resolveAIConfig(env({ AI_MODEL: "gpt-5.5", AI_API_KEY: "k" }))).toEqual({ kind: "openai", apiKey: "k", model: "gpt-5.5" });
    expect(resolveAIConfig(env({ ...project, AI_MODEL: "gpt-5.5", DEMO_AI_MODE: true }))).toEqual({ kind: "mock" });
  });
});

describe("JSON Schema strict per OpenAI", () => {
  it("ogni oggetto, anche annidato o vuoto, dichiara required e additionalProperties: false", () => {
    const schema = toOpenAIStrictSchema(
      z.object({ question: z.string(), options: z.array(z.object({ label: z.string(), note: z.string().nullable() })) }),
      "input",
    );
    expect(schema.required).toEqual(["question", "options"]);
    expect(schema.additionalProperties).toBe(false);
    const item = (schema.properties as { options: { items: Record<string, unknown> } }).options.items;
    expect(item.required).toEqual(["label", "note"]);
    expect(item.additionalProperties).toBe(false);
    const empty = toOpenAIStrictSchema(z.object({}).strict(), "input");
    expect(empty).toMatchObject({ type: "object", properties: {}, required: [], additionalProperties: false });
  });
});
