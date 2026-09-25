import type { PublicError } from "./results";

/**
 * Contratti di Coach AI condivisi tra server e browser.
 * Contengono solo dati da mostrare: mai prompt, ragionamenti del modello o JSON grezzi dei tool.
 */

/** Livello di rischio di un tool: decide la politica di conferma (server/ai/agent/policy.ts). */
export type RiskLevel = "read" | "draft" | "write" | "high_risk" | "destructive";

/**
 * Conferma richiesta prima di eseguire:
 *  - none: lettura e bozze, automatiche;
 *  - standard: un clic su "Conferma";
 *  - explicit: spunta "Ho verificato" + conferma (azioni ad alto rischio);
 *  - typed: bisogna digitare il testo indicato (azioni distruttive).
 */
export type ConfirmationMode = "none" | "standard" | "explicit" | "typed";

export type ActionStatus = "draft" | "pending" | "executing" | "succeeded" | "failed" | "cancelled" | "expired";

/** Esito dichiarato di ogni operazione: l'AI non può far passare un fallimento per un successo. */
export type ActionOutcome = "success" | "failed" | "partial" | "requires_confirmation";

export type ConversationSummary = {
  id: string;
  title: string;
  preview: string | null;
  updatedAt: string;
  archived: boolean;
};

export type EntityLink = { label: string; href: string };

/** Riga discreta "✓ 4 check-in analizzati" sotto una risposta. */
export type ToolActivity = {
  id: string;
  tool: string;
  status: "running" | "success" | "failed" | "requires_confirmation" | "denied";
  /** Testo breve già pronto per l'interfaccia. */
  label: string;
  links: EntityLink[];
};

export type ActionField = {
  label: string;
  value: string;
  /** Testo lungo (es. la risposta alla cliente): mostrato su più righe. */
  multiline?: boolean;
};

/** Campo modificabile dalla coach prima di confermare ("Modifica"). */
export type EditableField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date";
  value: string;
  maxLength?: number;
};

export type ActionRequestView = {
  id: string;
  toolName: string;
  /** Es. "Nuovo follow-up", "Risposta pronta per Sara". */
  title: string;
  riskLevel: RiskLevel;
  confirmation: ConfirmationMode;
  status: ActionStatus;
  fields: ActionField[];
  /** Conseguenze da conoscere prima di confermare. */
  warnings: string[];
  confirmLabel: string;
  /** Solo per le azioni "typed": il testo da digitare. */
  typedConfirmation: string | null;
  editable: EditableField[];
  /** Testo copiabile (es. la bozza di risposta). */
  copyText: string | null;
  source: "chat" | "automation";
  result: { message: string; link: EntityLink | null } | null;
  error: { message: string; retryable: boolean } | null;
  createdAt: string;
  expiresAt: string | null;
};

export type ClarificationOption = { label: string; description: string | null; reply: string };

/** Domanda di chiarimento strutturata: la coach sceglie invece di lasciar indovinare l'AI. */
export type Clarification = { question: string; options: ClarificationOption[] };

export type AttachmentKind = "pdf" | "text" | "image";

export type AttachmentView = {
  id: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  sizeBytes: number;
};

export type ChatMessageStatus = "streaming" | "complete" | "stopped" | "failed";

export type ChatMessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: ChatMessageStatus;
  createdAt: string;
  activities: ToolActivity[];
  actions: ActionRequestView[];
  clarification: Clarification | null;
  attachments: AttachmentView[];
  error: PublicError | null;
};

export type AutomationView = {
  id: string;
  trigger: "new_checkin";
  action: "generate_reply_draft";
  enabled: boolean;
  description: string;
  lastRunAt: string | null;
  lastStatus: "success" | "failed" | "partial" | null;
};

/** Eventi dello streaming di una risposta (una riga JSON ciascuno). */
export type CoachAIStreamEvent =
  | { type: "start"; conversation: ConversationSummary; userMessage: ChatMessageView; assistantMessageId: string }
  | { type: "text"; delta: string }
  | { type: "activity"; activity: ToolActivity }
  | { type: "action"; action: ActionRequestView }
  | { type: "clarification"; clarification: Clarification }
  | { type: "done"; message: ChatMessageView; conversation: ConversationSummary }
  | { type: "error"; error: PublicError; message: ChatMessageView | null };

export type ConversationPage = { conversation: ConversationSummary; messages: ChatMessageView[]; hasMore: boolean };

/** Dati iniziali della pagina Coach AI (dal server). */
export type CoachAIPageData = {
  conversations: ConversationSummary[];
  active: ConversationPage | null;
  automations: AutomationView[];
  /** Bozze preparate dalle automazioni, in attesa di revisione. */
  drafts: ActionRequestView[];
  pendingAutomationEvents: number;
};
