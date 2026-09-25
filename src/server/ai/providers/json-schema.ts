import "server-only";
import { transformJSONSchema } from "@anthropic-ai/sdk/lib/transform-json-schema";
import { z } from "zod";

/*
 * Zod → JSON Schema per gli output strutturati e i tool "strict" dei provider.
 * I vincoli non supportati (lunghezze, pattern…) finiscono nella descrizione:
 * la validazione vera resta sempre quella Zod, lato server.
 */

type JsonSchemaObject = { type: "object"; [key: string]: unknown };

export function toStrictJsonSchema(schema: z.ZodType, io: "input" | "output"): JsonSchemaObject {
  const jsonSchema = z.toJSONSchema(schema, { io });
  delete jsonSchema.$schema;
  return { ...transformJSONSchema(jsonSchema), type: "object" };
}

/**
 * Variante per OpenAI (strict mode): ogni oggetto deve dichiarare tutte le proprietà in `required`
 * e `additionalProperties: false`, anche quelli annidati.
 */
export function toOpenAIStrictSchema(schema: z.ZodType, io: "input" | "output"): JsonSchemaObject {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== "object") return node;
    const entries = Object.entries(node as Record<string, unknown>).map(([key, value]) => [key, visit(value)] as const);
    const copy: Record<string, unknown> = Object.fromEntries(entries);
    if (copy.type === "object") {
      const properties = (copy.properties as Record<string, unknown> | undefined) ?? {};
      copy.properties = properties;
      copy.required = Object.keys(properties);
      copy.additionalProperties = false;
    }
    return copy;
  };
  return visit(toStrictJsonSchema(schema, io)) as JsonSchemaObject;
}
