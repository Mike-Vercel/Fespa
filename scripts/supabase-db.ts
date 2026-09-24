/**
 * Migration del database dal terminale, senza passare dal SQL Editor (Supabase CLI).
 *
 *   npm run db:migrate                     applica le migration mancanti (supabase db push)
 *   npm run db:migrate -- --dry-run        mostra cosa verrebbe applicato, senza applicarlo
 *   npm run db:migrations                  confronta le migration locali con quelle del database
 *   npm run db:mark-applied -- <versione>  registra come già applicata una migration eseguita a mano
 *   npm run db:mark-reverted -- <versione> toglie dallo storico una versione (es. file rinominato)
 *
 * La connessione arriva da SUPABASE_DB_URL in .env.local: contiene la password del database,
 * quindi non va mai nel codice, nei log o in chat. La CLI viene avviata senza shell, così la
 * password non passa per l'interprete dei comandi e non viene mai stampata.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const COMMANDS = {
  push: ["db", "push", "--yes"],
  list: ["migration", "list"],
  "mark-applied": ["migration", "repair", "--status", "applied", "--yes"],
  "mark-reverted": ["migration", "repair", "--status", "reverted", "--yes"],
} as const;

type CommandName = keyof typeof COMMANDS;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function isCommandName(value: string | undefined): value is CommandName {
  return value !== undefined && Object.hasOwn(COMMANDS, value);
}

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * La CLI vuole la password codificata (percent-encoding). Chi copia l'URI dalla dashboard
 * di solito incolla la password in chiaro: la si ricodifica qui, anche se contiene "@" o "#".
 */
function normalizeDatabaseUrl(raw: string): string {
  const match = /^(postgres(?:ql)?:\/\/)([^:/@]+):(.*)@([^@]+)$/.exec(raw.trim());
  if (!match) {
    fail("SUPABASE_DB_URL non sembra una stringa di connessione Postgres (postgresql://utente:password@host:porta/postgres).");
  }
  const [, scheme, user, rawPassword, hostAndDatabase] = match;
  if (!rawPassword || rawPassword.includes("YOUR-PASSWORD")) {
    fail("In SUPABASE_DB_URL sostituisci [YOUR-PASSWORD] con la password del database.");
  }
  // Errore tipico: si sostituisce YOUR-PASSWORD ma restano le parentesi quadre del segnaposto.
  const isBracketed = rawPassword.length > 2 && rawPassword.startsWith("[") && rawPassword.endsWith("]");
  if (isBracketed) {
    console.warn("ℹ Tolte le parentesi quadre attorno alla password (resti del segnaposto [YOUR-PASSWORD]).");
  }
  const password = isBracketed ? rawPassword.slice(1, -1) : rawPassword;
  return `${scheme}${user}:${encodeURIComponent(decodeSafely(password))}@${hostAndDatabase}`;
}

const [commandName, ...extraArgs] = process.argv.slice(2);
if (!isCommandName(commandName)) {
  fail(`Comando sconosciuto. Usa uno tra: ${Object.keys(COMMANDS).join(", ")}.`);
}

const rawUrl = process.env.SUPABASE_DB_URL?.trim();
if (!rawUrl) {
  fail(
    "Manca SUPABASE_DB_URL in .env.local.\n" +
      "  Supabase → Connect → Session pooler: copia l'URI e sostituisci [YOUR-PASSWORD] con la password del database.",
  );
}

const cliPath = path.resolve("node_modules", "supabase", "dist", "supabase.js");
const result = spawnSync(
  process.execPath,
  [cliPath, ...COMMANDS[commandName], ...extraArgs, "--db-url", normalizeDatabaseUrl(rawUrl)],
  { stdio: "inherit" },
);

if (result.error) {
  fail(`Impossibile avviare la Supabase CLI (${result.error.message}). Hai eseguito npm install?`);
}
process.exit(result.status ?? 1);
