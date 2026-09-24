import { z } from "zod";
import { CLIENT_STATUSES } from "@/types/domain";
import { emailField } from "./auth";
import { firstParam } from "./common";

export const CLIENT_SORTS = ["priority", "name", "last_checkin", "next_followup"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

export const CLIENT_STATUS_FILTERS = ["all", ...CLIENT_STATUSES] as const;
export type ClientStatusFilter = (typeof CLIENT_STATUS_FILTERS)[number];

const MAX_SEARCH_LENGTH = 80;

/**
 * Parametri della lista clienti letti dall'URL.
 * Valori non validi non rompono la pagina: ricadono sui default (.catch).
 */
const clientListQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).catch(""),
  status: z.enum(CLIENT_STATUS_FILTERS).catch("all"),
  sort: z.enum(CLIENT_SORTS).catch("priority"),
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

export function parseClientListQuery(searchParams: Record<string, string | string[] | undefined>): ClientListQuery {
  return clientListQuerySchema.parse({
    q: firstParam(searchParams.q) ?? "",
    status: firstParam(searchParams.status) ?? "all",
    sort: firstParam(searchParams.sort) ?? "priority",
  });
}

const MAX_CLIENT_NAME_LENGTH = 120;
const MAX_CLIENT_GOAL_LENGTH = 500;

/** Nuova cliente creata dalla coach. Con l'email parte l'invito a completare il profilo. */
export const newClientSchema = z.object({
  fullName: z
    .string({ error: "Inserisci nome e cognome." })
    .trim()
    .min(2, { error: "Inserisci nome e cognome." })
    .max(MAX_CLIENT_NAME_LENGTH, { error: `Massimo ${MAX_CLIENT_NAME_LENGTH} caratteri.` }),
  email: z.union([z.literal(""), emailField]).transform((value) => (value === "" ? null : value)),
  goal: z
    .string()
    .trim()
    .max(MAX_CLIENT_GOAL_LENGTH, { error: `Massimo ${MAX_CLIENT_GOAL_LENGTH} caratteri.` })
    .transform((value) => (value === "" ? null : value)),
  startedOn: z.iso.date({ error: "Inserisci una data valida." }),
});

export type NewClientInput = z.infer<typeof newClientSchema>;
