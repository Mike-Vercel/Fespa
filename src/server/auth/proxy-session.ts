import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/server/db/database.types";
import { getServerEnv } from "@/server/env";
import { LOGIN_PATH, POST_LOGIN_PATH, PUBLIC_PATHS as PUBLIC_PATH_LIST, sanitizeRedirectPath } from "@/validation/redirect";

/** Raggiungibili senza sessione. */
const PUBLIC_PATHS: ReadonlySet<string> = new Set(PUBLIC_PATH_LIST);
/** Pagine per chi non è autenticato: chi ha già una sessione va alla propria area. */
const GUEST_ONLY_PATHS: ReadonlySet<string> = new Set(["/login", "/registrati", "/password-dimenticata"]);
const API_PREFIX = "/api/";

/**
 * Eseguito da proxy.ts su ogni richiesta di pagina/API:
 *  1. rinnova il token Supabase se sta per scadere (scrivendo i nuovi cookie);
 *  2. fa redirect ottimistici (login ↔ area riservata).
 *
 * NON è un controllo di sicurezza: pagine, Server Actions e Route Handlers
 * verificano di nuovo la sessione, e il database applica la RLS.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getServerEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Header anti-cache forniti da @supabase/ssr: una risposta che imposta
        // cookie di sessione non deve mai finire nella cache di un CDN.
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Nessuna logica tra la creazione del client e getClaims(): è questa chiamata che rinnova il token.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims.sub);
  const { pathname, search } = request.nextUrl;

  // Le API rispondono da sole con 401 JSON: un redirect HTML non avrebbe senso per fetch().
  if (pathname.startsWith(API_PREFIX)) {
    return response;
  }

  if (!isAuthenticated && !PUBLIC_PATHS.has(pathname)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const requestedPath = sanitizeRedirectPath(`${pathname}${search}`);
    if (requestedPath !== POST_LOGIN_PATH) {
      loginUrl.searchParams.set("next", requestedPath);
    }
    return redirectKeepingSession(loginUrl, response);
  }

  if (isAuthenticated && GUEST_ONLY_PATHS.has(pathname)) {
    return redirectKeepingSession(new URL(POST_LOGIN_PATH, request.url), response);
  }

  return response;
}

/** Un redirect deve portarsi dietro gli eventuali cookie di sessione appena rinnovati. */
function redirectKeepingSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  const cacheControl = sessionResponse.headers.get("Cache-Control");
  if (cacheControl) {
    redirect.headers.set("Cache-Control", cacheControl);
  }
  return redirect;
}
