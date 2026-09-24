import "server-only";
import { z } from "zod";

/**
 * Configurazione server validata all'avvio del primo utilizzo.
 * È l'unico modulo dell'app che legge process.env: il resto importa `getServerEnv()`.
 */

const DEFAULT_AI_MODEL = "claude-opus-5";
const DEFAULT_TIMEZONE = "Europe/Rome";

const booleanFlag = z
  .enum(["true", "false", ""])
  .optional()
  .transform((value) => value === "true");

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : undefined));

const serverEnvSchema = z.object({
  // Si tiene solo l'origine: la dashboard mostra anche l'URL REST (".../rest/v1/"), che spesso viene incollato per errore.
  NEXT_PUBLIC_SUPABASE_URL: z
    .url({ error: "deve essere l'URL del progetto Supabase" })
    .transform((value) => new URL(value).origin),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string({ error: "chiave anon/publishable mancante" }).min(20, {
    error: "chiave anon/publishable troppo corta",
  }),
  NEXT_PUBLIC_APP_URL: optionalString.pipe(z.url().optional()),
  APP_TIMEZONE: optionalString.transform((value) => value ?? DEFAULT_TIMEZONE),
  AI_PROVIDER: optionalString.pipe(z.enum(["anthropic"]).optional()),
  AI_API_KEY: optionalString,
  AI_MODEL: optionalString.transform((value) => value ?? DEFAULT_AI_MODEL),
  // Solo per chiavi Anthropic non legate a un workspace (es. wrkspc_…).
  AI_WORKSPACE_ID: optionalString,
  DEMO_AI_MODE: booleanFlag,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Il messaggio elenca solo i NOMI delle variabili, mai i valori.
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Configurazione non valida (.env.local): ${problems}`);
  }

  assertValidTimezone(parsed.data.APP_TIMEZONE);
  cachedEnv = parsed.data;
  return cachedEnv;
}

function assertValidTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("it-IT", { timeZone: timezone });
  } catch {
    throw new Error(`Configurazione non valida (.env.local): APP_TIMEZONE "${timezone}" non è un fuso orario IANA`);
  }
}
