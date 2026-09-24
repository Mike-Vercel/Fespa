import { z } from "zod";
import type { FieldErrors } from "@/types/results";

/** Come fieldErrorsOf, ma per oggetti annidati: le chiavi sono i percorsi completi ("profile.birthDate"). */
export function fieldErrorsByPath(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "form";
    result[path] = [...(result[path] ?? []), issue.message];
  }
  return result;
}

/** Converte un errore Zod nella mappa campo → messaggi usata dai form. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const { fieldErrors } = z.flattenError(error);
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      result[field] = messages;
    }
  }
  return result;
}
