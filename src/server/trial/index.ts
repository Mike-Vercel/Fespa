import "server-only";
import { getAIProvider } from "@/server/ai/providers";
import { createTrialServiceClient } from "@/server/db/supabase-service";
import { getEmailSender } from "@/server/email";
import { createTrialRepository } from "./repository";
import type { TrialDeps } from "./service";

/** Dipendenze reali della Prova FESPA, oppure null se il database della prova non è configurato. */
export function createTrialDeps(signupUrl: string): TrialDeps | null {
  const client = createTrialServiceClient();
  if (!client) {
    return null;
  }
  return { repo: createTrialRepository(client), getProvider: getAIProvider, getEmailSender, signupUrl };
}
