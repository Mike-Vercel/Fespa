import "server-only";
import type { z } from "zod";
import type { CheckinSummary, FollowupSummary, NoteSummary } from "@/server/ai/context/summaries";
import type { SourceRegistry } from "@/server/ai/sources";
import type { AuthenticatedContext } from "@/server/auth/session";
import type { FollowupProposal } from "@/types/ai";
import type { ClientStatus } from "@/types/domain";
import { fieldErrorsOf } from "@/validation/field-errors";

/** Contesto dei tool di LETTURA: client Supabase della coach (RLS) e cliente fissata dal server. */
export type ReadToolContext = {
  auth: AuthenticatedContext;
  /** Verificata con assertClientAccess prima del loop: il modello non può cambiarla. */
  clientId: string;
  timezone: string;
  sources: SourceRegistry;
};

/**
 * Contesto dei tool di PROPOSTA: volutamente senza accesso al database.
 * Possono solo aggiungere una proposta che la coach vedrà e deciderà se confermare.
 */
export type ProposalToolContext = {
  proposals: FollowupProposal[];
};

export type ToolContext = ReadToolContext & ProposalToolContext;

/** Risultati tipizzati dei tool (serializzati in JSON per il modello). */
export type ToolPayload =
  | {
      tool: "get_client_profile";
      profile: { firstName: string; status: ClientStatus; startedOn: string; goal: string | null; lastCheckinOn: string | null };
    }
  | { tool: "get_latest_checkin"; checkin: CheckinSummary | null }
  | { tool: "get_previous_checkins"; checkins: CheckinSummary[] }
  | { tool: "get_coach_notes"; notes: NoteSummary[] }
  | { tool: "get_followups"; followups: FollowupSummary[] }
  | { tool: "propose_followup"; recorded: boolean; message: string };

export type ToolRunResult = { isError: false; payload: ToolPayload } | { isError: true; message: string };

export type RegisteredTool = {
  name: string;
  description: string;
  kind: "read" | "proposal";
  inputSchema: z.ZodType;
  run: (rawInput: unknown, context: ToolContext) => Promise<ToolRunResult>;
};

function invalidInput(error: z.ZodError): ToolRunResult {
  const details = Object.entries(fieldErrorsOf(error))
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join("; ");
  return { isError: true, message: `Input non valido. ${details || "Controlla i parametri."}` };
}

/** Tool di lettura: input validato con Zod, eseguito con i permessi della coach. */
export function defineReadTool<TSchema extends z.ZodType>(definition: {
  name: string;
  description: string;
  inputSchema: TSchema;
  execute: (input: z.output<TSchema>, context: ReadToolContext) => Promise<ToolPayload>;
}): RegisteredTool {
  return {
    name: definition.name,
    description: definition.description,
    kind: "read",
    inputSchema: definition.inputSchema,
    run: async (rawInput, context) => {
      const parsed = definition.inputSchema.safeParse(rawInput);
      if (!parsed.success) return invalidInput(parsed.error);
      return { isError: false, payload: await definition.execute(parsed.data, context) };
    },
  };
}

/**
 * Tool di "scrittura" per il modello, in realtà solo PROPOSTE.
 * La firma di `propose` non riceve il database: scrivere è impossibile per costruzione.
 * La scrittura vera avviene solo quando la coach conferma, tramite le normali Server Action.
 */
export function defineProposalTool<TSchema extends z.ZodType>(definition: {
  name: string;
  description: string;
  inputSchema: TSchema;
  propose: (input: z.output<TSchema>, context: ProposalToolContext) => ToolPayload;
}): RegisteredTool {
  return {
    name: definition.name,
    description: definition.description,
    kind: "proposal",
    inputSchema: definition.inputSchema,
    run: async (rawInput, context) => {
      const parsed = definition.inputSchema.safeParse(rawInput);
      if (!parsed.success) return invalidInput(parsed.error);
      return { isError: false, payload: definition.propose(parsed.data, { proposals: context.proposals }) };
    },
  };
}
