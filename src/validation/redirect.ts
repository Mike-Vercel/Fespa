import type { UserRole } from "@/types/domain";

export const LOGIN_PATH = "/login";
export const STAFF_HOME_PATH = "/dashboard";
export const CLIENT_HOME_PATH = "/area-cliente";
/** Destinazione di default quando `next` non è utilizzabile. */
export const POST_LOGIN_PATH = STAFF_HOME_PATH;

/** Pagine raggiungibili senza sessione: la home pubblica, autenticazione e registrazione. */
export const PUBLIC_PATHS = ["/", "/login", "/registrati", "/password-dimenticata", "/auth/confirm"] as const;

const MAX_REDIRECT_LENGTH = 512;

/**
 * Accetta come destinazione post-login solo path interni all'app.
 * Blocca gli open redirect: "https://evil.com", "//evil.com", "/\\evil.com",
 * caratteri di controllo e il ritorno alla pagina di login stessa.
 */
export function sanitizeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate || candidate.length > MAX_REDIRECT_LENGTH) {
    return POST_LOGIN_PATH;
  }

  const startsWithSingleSlash = candidate.startsWith("/") && !candidate.startsWith("//");
  const hasBackslash = candidate.includes("\\");
  const hasControlCharacters = /[\u0000-\u001f\u007f]/.test(candidate);

  if (!startsWithSingleSlash || hasBackslash || hasControlCharacters) {
    return POST_LOGIN_PATH;
  }

  const pathname = candidate.split(/[?#]/, 1)[0];
  if (pathname === LOGIN_PATH || pathname === "/") {
    return POST_LOGIN_PATH;
  }

  return candidate;
}

function isClientAreaPath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname === CLIENT_HOME_PATH || pathname.startsWith(`${CLIENT_HOME_PATH}/`);
}

/**
 * Dopo il login: la pagina richiesta solo se appartiene all'area del ruolo,
 * altrimenti la home del ruolo (una cliente non viene mai mandata nell'area staff, e viceversa).
 */
export function postLoginPathFor(role: UserRole, requested: string | null | undefined): string {
  const home = role === "client" ? CLIENT_HOME_PATH : STAFF_HOME_PATH;
  const safePath = sanitizeRedirectPath(requested);
  if (safePath === POST_LOGIN_PATH) {
    return home;
  }
  const requestedClientArea = isClientAreaPath(safePath);
  return (role === "client") === requestedClientArea ? safePath : home;
}
