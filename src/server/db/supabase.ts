import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/server/env";
import type { Database } from "./database.types";

/**
 * Client Supabase con la sessione della coach (cookie httpOnly).
 * Usa SOLO la chiave anon/publishable: ogni query passa dalla Row Level Security.
 * L'applicazione non usa mai la service role key.
 *
 * Va creato per ogni richiesta: non va mai condiviso tra richieste diverse.
 */
export async function createSupabaseServerClient() {
  // Prima i cookie: rende la richiesta esplicitamente dinamica anche prima di leggere la configurazione.
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Nei Server Components i cookie sono in sola lettura:
          // il rinnovo della sessione avviene in proxy.ts.
        }
      },
    },
  });
}

export type AppSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
