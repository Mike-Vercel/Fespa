import "server-only";
import type { z } from "zod";
import type { AuthenticatedContext } from "@/server/auth/session";
import type { Json } from "@/server/db/database.types";
import type { ActionField, EditableField, EntityLink, RiskLevel } from "@/types/coach-ai";
import type { CoachRole } from "@/types/domain";
import { fieldErrorsOf } from "@/validation/field-errors";

/*
 * Definizione dei tool di Coach AI.
 *
 * Ogni tool dichiara: nome, descrizione per il modello, schema Zod dell'input, livello di rischio,
 * ruoli ammessi e metadati di audit. Il runtime NON si fida della scelta del modello:
 * valida l'input, ricontrolla il ruolo e passa sempre dai service esistenti, che a loro volta
 * verificano l'accesso (assertClientAccess) prima di toccare il database (RLS).
 *
 * Tipi di tool:
 *  - read:   legge e restituisce dati minimizzati (automatico);
 *  - action: modifica dati. `prepare` costruisce l'anteprima SENZA scrivere; `commit` esegue,
 *            e viene chiamato solo dopo la conferma della coach (server/ai/agent/actions.ts);
 *  - draft:  prepara una bozza di un'azione (es. risposta a un check-in) senza chiedere l'invio;
 *  - control: strumenti di conversazione gestiti dal runtime (chiarimenti, riproposta di un'azione).
 */

/** Contesto di esecuzione: SEMPRE l'utente autenticato, mai privilegi dell'AI. */
export type AgentContext = {
  auth: AuthenticatedContext;
  timezone: string;
  /** "YYYY-MM-DD" nel fuso dell'app. */
  today: string;
  now: Date;
};

export type ReadOutput = {
  /** Dati per il modello: minimizzati, con i testi liberi già neutralizzati. */
  data: unknown;
  /** Riga di attività per l'interfaccia, es. "4 check-in analizzati". */
  summary: string;
  links?: EntityLink[];
};

export type ActionTarget = { type: string; id: string; label: string };

/** Anteprima di un'azione: cosa cambierà. Nessuna scrittura è avvenuta. */
export type PreparedAction = {
  title: string;
  fields: ActionField[];
  warnings: string[];
  confirmLabel: string;
  /** Obbligatorio per le azioni distruttive: il testo che la coach deve digitare. */
  typedConfirmation?: string;
  editable?: EditableField[];
  copyText?: string;
  target: ActionTarget | null;
  /** Descrizione breve per il modello (cosa è stato preparato). */
  summaryForModel: string;
};

export type CommitOutcome = { message: string; link: EntityLink | null };

type Validation = { ok: true; value: unknown } | { ok: false; message: string };

type ToolCommon = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  risk: RiskLevel;
  allowedRoles: readonly CoachRole[];
  /** Tipo di entità coinvolta, per il registro delle azioni. */
  auditTarget: string | null;
  /** Valida l'input grezzo (dal modello o dal database) con lo schema Zod del tool. */
  validate(raw: unknown): Validation;
  /** Stato sintetico mostrato mentre il tool lavora: "Sto cercando Sara…". */
  runningLabel(input: unknown): string;
};

export type AgentReadTool = ToolCommon & {
  kind: "read";
  run(context: AgentContext, input: unknown): Promise<ReadOutput>;
};

export type AgentActionTool = ToolCommon & {
  kind: "action";
  risk: "write" | "high_risk" | "destructive";
  prepare(context: AgentContext, input: unknown): Promise<PreparedAction>;
  commit(context: AgentContext, input: unknown): Promise<CommitOutcome>;
  /** Nuovo input grezzo dopo una "Modifica" della coach (poi rivalidato). */
  applyEdits(rawInput: Record<string, unknown>, fields: Record<string, string>): Record<string, unknown>;
  /** Input minimizzato per il registro: solo id e campi strutturati, mai testi liberi. */
  auditSummary(input: unknown): Json;
};

export type AgentDraftTool = ToolCommon & {
  kind: "draft";
  risk: "draft";
  /** L'azione che la bozza prepara (la sua esecuzione richiederà comunque la conferma). */
  target: AgentActionTool;
  toTargetInput(input: unknown): Record<string, unknown>;
};

export type AgentControlTool = ToolCommon & {
  kind: "control";
  control: "ask_clarification" | "present_action";
};

export type AgentTool = AgentReadTool | AgentActionTool | AgentDraftTool | AgentControlTool;

function validator<TSchema extends z.ZodType>(schema: TSchema) {
  return (raw: unknown): Validation => {
    const parsed = schema.safeParse(raw);
    if (parsed.success) return { ok: true, value: parsed.data };
    const details = Object.entries(fieldErrorsOf(parsed.error))
      .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
      .join("; ");
    return { ok: false, message: `Input non valido. ${details || "Controlla i parametri."}` };
  };
}

/*
 * Nei wrapper qui sotto `input as z.output<TSchema>` è sicuro: il runtime chiama run/prepare/commit
 * solo con il `value` restituito da `validate`, cioè l'output dello stesso schema.
 */

type Definition<TSchema extends z.ZodType> = {
  name: string;
  description: string;
  inputSchema: TSchema;
  allowedRoles: readonly CoachRole[];
  auditTarget: string | null;
  runningLabel: (input: z.output<TSchema>) => string;
};

export function defineReadTool<TSchema extends z.ZodType>(
  definition: Definition<TSchema> & { run: (context: AgentContext, input: z.output<TSchema>) => Promise<ReadOutput> },
): AgentReadTool {
  return {
    kind: "read",
    risk: "read",
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    allowedRoles: definition.allowedRoles,
    auditTarget: definition.auditTarget,
    validate: validator(definition.inputSchema),
    runningLabel: (input) => definition.runningLabel(input as z.output<TSchema>),
    run: (context, input) => definition.run(context, input as z.output<TSchema>),
  };
}

export function defineActionTool<TSchema extends z.ZodType>(
  definition: Definition<TSchema> & {
    risk: "write" | "high_risk" | "destructive";
    prepare: (context: AgentContext, input: z.output<TSchema>) => Promise<PreparedAction>;
    commit: (context: AgentContext, input: z.output<TSchema>) => Promise<CommitOutcome>;
    /** Campi che la coach può modificare prima di confermare → nome del campo nell'input. */
    editableKeys?: readonly string[];
    auditSummary: (input: z.output<TSchema>) => Json;
  },
): AgentActionTool {
  const editableKeys = new Set(definition.editableKeys ?? []);
  return {
    kind: "action",
    risk: definition.risk,
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    allowedRoles: definition.allowedRoles,
    auditTarget: definition.auditTarget,
    validate: validator(definition.inputSchema),
    runningLabel: (input) => definition.runningLabel(input as z.output<TSchema>),
    prepare: (context, input) => definition.prepare(context, input as z.output<TSchema>),
    commit: (context, input) => definition.commit(context, input as z.output<TSchema>),
    // Solo i campi dichiarati modificabili: gli identificativi (cliente, check-in…) non cambiano mai.
    applyEdits: (rawInput, fields) => {
      const next = { ...rawInput };
      for (const [key, value] of Object.entries(fields)) {
        if (editableKeys.has(key)) next[key] = value;
      }
      return next;
    },
    auditSummary: (input) => definition.auditSummary(input as z.output<TSchema>),
  };
}

export function defineDraftTool<TSchema extends z.ZodType>(
  definition: Definition<TSchema> & {
    target: AgentActionTool;
    toTargetInput: (input: z.output<TSchema>) => Record<string, unknown>;
  },
): AgentDraftTool {
  return {
    kind: "draft",
    risk: "draft",
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    allowedRoles: definition.allowedRoles,
    auditTarget: definition.auditTarget,
    validate: validator(definition.inputSchema),
    runningLabel: (input) => definition.runningLabel(input as z.output<TSchema>),
    target: definition.target,
    toTargetInput: (input) => definition.toTargetInput(input as z.output<TSchema>),
  };
}

export function defineControlTool<TSchema extends z.ZodType>(
  definition: Definition<TSchema> & { control: AgentControlTool["control"]; risk: "read" | "draft" },
): AgentControlTool {
  return {
    kind: "control",
    risk: definition.risk,
    control: definition.control,
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    allowedRoles: definition.allowedRoles,
    auditTarget: definition.auditTarget,
    validate: validator(definition.inputSchema),
    runningLabel: (input) => definition.runningLabel(input as z.output<TSchema>),
  };
}
