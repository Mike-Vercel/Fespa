import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));

/**
 * Riproduce le parti di Supabase da cui dipendono le migration:
 * ruoli anon/authenticated/service_role, auth.users e auth.uid().
 * auth.uid() legge il "sub" dal JWT esattamente come in Supabase (request.jwt.claims).
 */
const SUPABASE_SHIM = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text not null,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;

  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);

  const migrationFiles = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const sql = await readFile(`${MIGRATIONS_DIR}${file}`, "utf8");
    await db.exec(sql);
  }

  return db;
}

/** Crea un utente Auth (il trigger crea il profilo con ruolo "client") e ne imposta il ruolo applicativo. */
export async function createUser(
  db: PGlite,
  user: { id: string; email: string; fullName: string; role: "client" | "coach" | "admin" | "super_admin"; emailConfirmed?: boolean },
): Promise<void> {
  await db.query(
    "insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, $3, $4)",
    [user.id, user.email, user.emailConfirmed === false ? null : new Date().toISOString(), JSON.stringify({ full_name: user.fullName })],
  );
  await db.query("update public.profiles set role = $1 where id = $2", [user.role, user.id]);
}

/** Esegue `run` come un utente autenticato di Supabase (ruolo authenticated + JWT con sub). */
export async function asUser<T>(db: PGlite, userId: string, run: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  try {
    return await run();
  } finally {
    await resetSession(db);
  }
}

/** Esegue `run` come visitatore non autenticato (ruolo anon, nessun JWT). */
export async function asAnonymous<T>(db: PGlite, run: () => Promise<T>): Promise<T> {
  await db.exec("set role anon");
  try {
    return await run();
  } finally {
    await resetSession(db);
  }
}

async function resetSession(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', '', false)");
}
