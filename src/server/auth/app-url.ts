import "server-only";
import { headers } from "next/headers";
import { getServerEnv } from "@/server/env";

/**
 * URL pubblico dell'app, usato nei link inviati via email.
 * Preferisce NEXT_PUBLIC_APP_URL; in sviluppo ricade sull'origine della richiesta.
 */
export async function getAppUrl(): Promise<string> {
  const configured = getServerEnv().NEXT_PUBLIC_APP_URL;
  if (configured) {
    return new URL(configured).origin;
  }
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

/** Destinazione dei link email: verifica il token e porta l'utente nella sua area. */
export async function getAuthConfirmUrl(): Promise<string> {
  return `${await getAppUrl()}/auth/confirm`;
}
