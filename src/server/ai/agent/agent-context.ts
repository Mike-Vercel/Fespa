import "server-only";
import { calendarDateIn } from "@/domain/dates";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import type { AgentContext } from "./tools/define";

/** Contesto di esecuzione di Coach AI: sempre l'utente autenticato, con data e fuso dell'app. */
export function createAgentContext(auth: AuthenticatedContext, now = new Date()): AgentContext {
  const timezone = getServerEnv().APP_TIMEZONE;
  return { auth, timezone, today: calendarDateIn(timezone, now), now };
}
