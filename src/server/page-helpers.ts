import "server-only";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/server/errors";

/**
 * Nelle pagine, una risorsa inesistente o non accessibile diventa la pagina 404
 * (not-found.tsx del segmento). Ogni altro errore prosegue verso error.tsx.
 */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
