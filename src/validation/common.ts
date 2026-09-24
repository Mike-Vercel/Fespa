import { z } from "zod";

export const uuidSchema = z.uuid({ error: "Identificativo non valido." });

/** Restituisce l'UUID se valido, altrimenti null (utile per i parametri di route). */
export function parseUuid(value: unknown): string | null {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** I searchParams possono arrivare ripetuti (?a=1&a=2): si considera solo il primo valore. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
