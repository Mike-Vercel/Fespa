import "server-only";
import { confirmationTextMatches } from "@/domain/coach-ai";
import { ValidationError } from "@/server/errors";
import type { ConfirmationMode, RiskLevel } from "@/types/coach-ai";
import type { CoachRole } from "@/types/domain";

/*
 * ACTION POLICY centralizzata di Coach AI. È il server a decidere il livello di conferma,
 * in base al rischio dichiarato dal tool: il modello non può abbassarlo né saltarlo.
 *
 *   READ, DRAFT   → automatici
 *   WRITE         → conferma
 *   HIGH_RISK     → conferma esplicita ("Ho verificato")
 *   DESTRUCTIVE   → conferma rafforzata (testo digitato)
 */

export const CONFIRMATION_BY_RISK: Readonly<Record<RiskLevel, ConfirmationMode>> = {
  read: "none",
  draft: "none",
  write: "standard",
  high_risk: "explicit",
  destructive: "typed",
};

/** Una richiesta in attesa di conferma scade: una conferma giorni dopo agirebbe su dati cambiati. */
export const PENDING_ACTION_TTL_MS = 24 * 60 * 60 * 1000;

export function confirmationFor(risk: RiskLevel): ConfirmationMode {
  return CONFIRMATION_BY_RISK[risk];
}

export function requiresConfirmation(risk: RiskLevel): boolean {
  return confirmationFor(risk) !== "none";
}

/** Il ruolo dell'utente autenticato può usare questo tool? (Controllato a ogni chiamata, non solo nella lista.) */
export function isToolAllowed(role: CoachRole, tool: { allowedRoles: readonly CoachRole[] }): boolean {
  return tool.allowedRoles.includes(role);
}

/** Solo i tool del ruolo arrivano al modello: una coach non vede nemmeno quelli dell'amministrazione. */
export function toolsForRole<TTool extends { allowedRoles: readonly CoachRole[] }>(role: CoachRole, tools: readonly TTool[]): TTool[] {
  return tools.filter((tool) => isToolAllowed(role, tool));
}

export type ConfirmationInput = { acknowledged?: boolean; typedConfirmation?: string };

/**
 * Verifica che la conferma ricevuta sia adeguata al rischio. Controllo SERVER-SIDE:
 * una chiamata diretta all'API senza spunta o senza testo digitato viene rifiutata.
 */
export function assertConfirmation(
  risk: RiskLevel,
  confirmation: ConfirmationInput,
  expectedTypedText: string | null,
): void {
  switch (confirmationFor(risk)) {
    case "none":
    case "standard":
      return;
    case "explicit":
      if (confirmation.acknowledged !== true) {
        throw new ValidationError({ acknowledged: ["Conferma di aver verificato l'operazione."] }, "Serve la conferma esplicita per questa operazione.");
      }
      return;
    case "typed":
      if (!expectedTypedText || !confirmationTextMatches(confirmation.typedConfirmation, expectedTypedText)) {
        throw new ValidationError(
          { typedConfirmation: [`Scrivi esattamente “${expectedTypedText ?? ""}” per confermare.`] },
          "Il testo di conferma non corrisponde.",
        );
      }
      return;
  }
}
