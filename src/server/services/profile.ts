import "server-only";
import type { AuthenticatedContext } from "@/server/auth/session";
import { DataAccessError, NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";

/** La coach può modificare solo il proprio nome (la colonna "role" non è aggiornabile: vedi grant nel DB). */
export async function updateOwnName(context: AuthenticatedContext, fullName: string): Promise<void> {
  const { data, error } = await context.db
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", context.coach.id)
    .select("id");
  if (error) {
    throw new DataAccessError("profiles.updateName", error);
  }
  if (data.length === 0) {
    throw new NotFoundError("Profilo non trovato.");
  }
  logger.info("profiles.name_updated", { coachId: context.coach.id });
}
