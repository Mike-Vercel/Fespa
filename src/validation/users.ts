import { z } from "zod";
import { USER_ROLES } from "@/types/domain";
import { uuidSchema } from "./common";

/** Una cliente raramente ha più di una o due coach: il limite evita richieste abnormi. */
export const MAX_COACHES_PER_CLIENT = 5;

export const roleChangeSchema = z.object({
  userId: uuidSchema,
  role: z.enum(USER_ROLES, { error: "Ruolo non valido." }),
});

export type RoleChange = z.infer<typeof roleChangeSchema>;

export const clientCoachesSchema = z.object({
  clientId: uuidSchema,
  coachIds: z
    .array(uuidSchema)
    .max(MAX_COACHES_PER_CLIENT, { error: `Al massimo ${MAX_COACHES_PER_CLIENT} coach per cliente.` })
    .transform((ids) => [...new Set(ids)]),
});

export type ClientCoaches = z.infer<typeof clientCoachesSchema>;
