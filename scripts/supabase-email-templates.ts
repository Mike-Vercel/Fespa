/**
 * Carica in Supabase Auth i template email del progetto (supabase/templates) con i loro oggetti.
 *
 *   npm run email:templates            applica i template
 *   npm run email:templates -- --check mostra solo quali template sono già aggiornati
 *
 * Usa la Management API di Supabase con SUPABASE_ACCESS_TOKEN (Account → Access Tokens), letto da
 * .env.local: è un token personale con accesso al tuo account Supabase, quindi mai nel codice o in chat.
 * Il progetto si ricava da NEXT_PUBLIC_SUPABASE_URL.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const MANAGEMENT_API = "https://api.supabase.com/v1";
const TEMPLATES_DIR = path.resolve("supabase", "templates");

/** Template del progetto → campi della configurazione di Supabase Auth. */
const TEMPLATES = [
  { file: "confirmation.html", key: "confirmation", subject: "Il tuo codice FESPA" },
  { file: "magic-link.html", key: "magic_link", subject: "Il tuo link di accesso a FESPA" },
  { file: "recovery.html", key: "recovery", subject: "Reimposta la tua password FESPA" },
  { file: "invite.html", key: "invite", subject: "Il tuo invito a FESPA" },
  { file: "email-change.html", key: "email_change", subject: "Conferma il tuo nuovo indirizzo email" },
  { file: "reauthentication.html", key: "reauthentication", subject: "Il tuo codice di verifica FESPA" },
] as const;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function requireEnv(name: string, hint: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(`Manca ${name} in .env.local. ${hint}`);
  return value;
}

type AuthConfig = Record<string, unknown>;

function isRecord(value: unknown): value is AuthConfig {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function managementRequest(url: string, token: string, init: RequestInit = {}): Promise<AuthConfig> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    // Il corpo dell'errore non contiene segreti: aiuta a capire (token scaduto, progetto sbagliato…).
    fail(`Supabase ha risposto ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const body: unknown = await response.json();
  return isRecord(body) ? body : {};
}

async function main(): Promise<void> {
  const token = requireEnv("SUPABASE_ACCESS_TOKEN", "Crealo in Supabase → Account preferences → Access Tokens.");
  const projectRef = new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL", "")).hostname.split(".")[0];
  const configUrl = `${MANAGEMENT_API}/projects/${projectRef}/config/auth`;
  const checkOnly = process.argv.includes("--check");

  const templates = await Promise.all(
    TEMPLATES.map(async (template) => ({
      ...template,
      content: await readFile(path.join(TEMPLATES_DIR, template.file), "utf8"),
    })),
  );

  if (!checkOnly) {
    const update: Record<string, string> = {};
    for (const template of templates) {
      update[`mailer_subjects_${template.key}`] = template.subject;
      update[`mailer_templates_${template.key}_content`] = template.content;
    }
    await managementRequest(configUrl, token, { method: "PATCH", body: JSON.stringify(update) });
    console.log(`Template caricati sul progetto ${projectRef}.\n`);
  }

  // Verifica: rilegge la configurazione e confronta con i file del progetto.
  const current = await managementRequest(configUrl, token);
  for (const template of templates) {
    const subject = current[`mailer_subjects_${template.key}`];
    const content = current[`mailer_templates_${template.key}_content`];
    const isCurrent = subject === template.subject && content === template.content;
    console.log(`  ${isCurrent ? "✓" : "✗"} ${template.key.padEnd(17)} ${isCurrent ? "aggiornato" : "diverso dal file del progetto"} — oggetto: ${String(subject ?? "(predefinito)")}`);
  }

  if (!checkOnly) {
    // Supabase Auth tiene in memoria ogni template già usato (TemplateMaxAge, predefinito 10 minuti).
    console.log("\nNota: le email inviate nei prossimi 10 minuti possono usare ancora la versione precedente.");
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
