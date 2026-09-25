import "server-only";
import { z } from "zod";

/**
 * Configurazione server validata all'avvio del primo utilizzo.
 * È l'unico modulo dell'app che legge process.env: il resto importa `getServerEnv()`.
 */

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
  // Facoltativo: il provider si deduce dal nome del modello (vedi server/ai/config.ts).
  AI_PROVIDER: optionalString.pipe(z.enum(["anthropic", "openai"]).optional()),
  // Chiave generica; se presenti, hanno la precedenza quelle specifiche del provider scelto.
  AI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  // Modello: AI_MODEL decide anche il provider ("gpt-…" → OpenAI, "claude-…" → Anthropic).
  AI_MODEL: optionalString,
  ANTHROPIC_MODEL: optionalString,
  OPENAI_MODEL: optionalString,
  // Solo per chiavi Anthropic non legate a un workspace (es. wrkspc_…).
  AI_WORKSPACE_ID: optionalString,
  DEMO_AI_MODE: booleanFlag,
  // Solo server, solo per la Prova FESPA della home (server/trial): i visitatori non hanno una
  // sessione Supabase e le tabelle della prova non sono accessibili con la chiave pubblica.
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  // Email transazionali (riepilogo della Prova FESPA). Senza, l'invio fallisce in modo dichiarato.
  RESEND_API_KEY: optionalString,
  // Mittente verificato sul provider, es. "FESPA <riepilogo@tuodominio.it>".
  EMAIL_FROM: optionalString,
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
