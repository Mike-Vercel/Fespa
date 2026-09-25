import { z } from "zod";
import { uuidSchema } from "./common";

export const COACH_AI_MESSAGE_MAX_LENGTH = 4000;
export const CONVERSATION_TITLE_MAX_LENGTH = 80;
export const CONVERSATION_SEARCH_MAX_LENGTH = 80;
export const MAX_ATTACHMENTS_PER_MESSAGE = 3;
/** Sotto il limite di 4,5 MB del corpo delle richieste delle funzioni serverless di Vercel. */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
/** Testo digitato per confermare un'azione distruttiva. */
export const TYPED_CONFIRMATION_MAX_LENGTH = 200;
const EDIT_VALUE_MAX_LENGTH = 5000;

export const chatRequestSchema = z
  .object({
    /** null = nuova conversazione, creata dal server al primo messaggio. */
    conversationId: uuidSchema.nullable(),
    /** Generato dal browser: se la stessa richiesta arriva due volte, il messaggio non si duplica. */
    clientMessageId: uuidSchema,
    text: z
      .string()
      .trim()
      .max(COACH_AI_MESSAGE_MAX_LENGTH, { error: `Il messaggio può avere al massimo ${COACH_AI_MESSAGE_MAX_LENGTH} caratteri.` }),
    attachmentIds: z
      .array(uuidSchema)
      .max(MAX_ATTACHMENTS_PER_MESSAGE, { error: `Al massimo ${MAX_ATTACHMENTS_PER_MESSAGE} allegati per messaggio.` })
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .refine((request) => request.text !== "" || request.attachmentIds.length > 0, {
    error: "Scrivi un messaggio.",
    path: ["text"],
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const renameConversationSchema = z.object({
  conversationId: uuidSchema,
  title: z
    .string({ error: "Scrivi un titolo." })
    .trim()
    .min(1, { error: "Scrivi un titolo." })
    .max(CONVERSATION_TITLE_MAX_LENGTH, { error: `Massimo ${CONVERSATION_TITLE_MAX_LENGTH} caratteri.` }),
});

export const conversationArchiveSchema = z.object({
  conversationId: uuidSchema,
  archived: z.boolean(),
});

export const conversationIdSchema = z.object({ conversationId: uuidSchema });

export const olderMessagesSchema = z.object({
  conversationId: uuidSchema,
  before: z.iso.datetime({ offset: true }),
});

export const conversationSearchSchema = z.object({
  query: z.string().trim().max(CONVERSATION_SEARCH_MAX_LENGTH).default(""),
  archived: z.boolean().default(false),
});

export const actionOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("confirm"),
    actionId: uuidSchema,
    /** Azioni ad alto rischio: la coach ha spuntato "Ho verificato". */
    acknowledged: z.boolean().optional(),
    /** Azioni distruttive: il testo digitato dalla coach. */
    typedConfirmation: z.string().max(TYPED_CONFIRMATION_MAX_LENGTH).optional(),
  }),
  z.object({ op: z.literal("cancel"), actionId: uuidSchema }),
  z.object({
    op: z.literal("edit"),
    actionId: uuidSchema,
    fields: z.record(z.string().regex(/^[a-zA-Z]{1,40}$/), z.string().max(EDIT_VALUE_MAX_LENGTH)),
  }),
]);

export type ActionOperation = z.infer<typeof actionOperationSchema>;

export const automationToggleSchema = z.object({
  automationId: uuidSchema,
  enabled: z.boolean(),
});
