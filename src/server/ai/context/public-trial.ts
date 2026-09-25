import "server-only";
import { sanitizeUntrustedText, untrustedBlock } from "@/server/ai/untrusted";
import { TRIAL_MESSAGE_MAX_LENGTH } from "@/validation/public-trial";

/*
 * Contesto della Prova FESPA per il modello. Privacy by design: arrivano SOLO la conversazione,
 * la fase e il nome che la persona ha scritto (per rivolgersi a lei). Niente email, IP, cookie,
 * token o altri dati tecnici.
 */

/** Primo messaggio di FESPA AI, mostrato dall'interfaccia (non generato). */
export const TRIAL_GREETING =
  "Ciao 👋 Raccontami qual è la cosa che oggi ti rende più difficile mantenere delle abitudini con costanza.";

/**
 * - first_reply: risposta al primo messaggio + seconda domanda;
 * - lead_bridge: risposta al secondo messaggio, senza domande (l'app chiede nome ed email);
 * - final_question: dopo nome ed email, l'ultima domanda;
 * - summary: riepilogo strutturato dopo il terzo messaggio.
 */
export type PublicTrialStage = "first_reply" | "lead_bridge" | "final_question" | "summary";

export type PublicTrialTurn = { role: "user" | "assistant"; content: string };

export type PublicTrialContext = {
  stage: PublicTrialStage;
  firstName: string | null;
  transcript: PublicTrialTurn[];
};

const STAGE_INSTRUCTIONS: Record<PublicTrialStage, string> = {
  first_reply:
    "Fase: risposta al PRIMO messaggio. Accogli ciò che ha scritto in una o due frasi, poi fai UNA sola domanda pertinente per capire meglio la difficoltà o il contesto.",
  lead_bridge:
    "Fase: risposta al SECONDO messaggio. Riconosci in una o due frasi ciò che hai capito finora. NON fare domande: chiudi dicendo che, per prepararle un piccolo riepilogo e inviarglielo, qui sotto le verranno chiesti nome ed email.",
  final_question:
    "Fase: ULTIMA domanda. La persona ha appena inserito nome ed email per ricevere il riepilogo. Ringraziala per nome in poche parole e fai UNA sola domanda finale, la più utile per completare il quadro (per esempio cosa vorrebbe migliorare per prima cosa, o un aspetto del contesto non ancora emerso).",
  summary:
    "Fase: RIEPILOGO. La conversazione è conclusa. Prepara il riepilogo strutturato richiesto dallo schema, basandoti solo su ciò che la persona ha scritto.",
};

export function buildPublicTrialPrompt(context: PublicTrialContext): { context: PublicTrialContext; userContent: string } {
  const firstName = context.firstName ? sanitizeUntrustedText(context.firstName, 40) : null;
  const transcript = context.transcript.map((turn) => ({
    role: turn.role,
    content: sanitizeUntrustedText(turn.content, TRIAL_MESSAGE_MAX_LENGTH),
  }));

  let visitorMessages = 0;
  const lines = [`FESPA AI: ${TRIAL_GREETING}`];
  for (const turn of transcript) {
    if (turn.role === "assistant") {
      lines.push(`FESPA AI: ${turn.content}`);
    } else {
      visitorMessages += 1;
      lines.push(`Persona: ${untrustedBlock(`messaggio ${visitorMessages}`, turn.content, TRIAL_MESSAGE_MAX_LENGTH)}`);
    }
  }

  const userContent = [
    "<contesto_applicativo>",
    "Prova gratuita di FESPA AI nella home del Metodo FESPA: al massimo 3 messaggi della persona.",
    STAGE_INSTRUCTIONS[context.stage],
    firstName ? `Nome indicato dalla persona nel modulo: ${untrustedBlock("nome", firstName, 40)}` : "Nome: non ancora indicato.",
    "</contesto_applicativo>",
    "",
    "Conversazione finora:",
    ...lines,
    "",
    "Rispondi solo con il JSON richiesto.",
  ].join("\n");

  return { context: { stage: context.stage, firstName, transcript }, userContent };
}
