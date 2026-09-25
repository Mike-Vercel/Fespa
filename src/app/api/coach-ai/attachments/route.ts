import { NextResponse } from "next/server";
import { formatFileSize } from "@/domain/coach-ai";
import { uploadAttachment } from "@/server/ai/agent/attachments";
import { requireCoachOrThrow } from "@/server/auth/session";
import { ValidationError } from "@/server/errors";
import { assertSameOrigin, errorResponse, NO_STORE_HEADERS } from "@/server/http/json-route";
import { ATTACHMENT_MAX_BYTES } from "@/validation/coach-ai";

/** Margine per l'involucro multipart intorno al file. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const TOO_LARGE = `Il file supera il limite di ${formatFileSize(ATTACHMENT_MAX_BYTES)}.`;

/**
 * Caricamento di un allegato per Coach AI (multipart/form-data, campo "file").
 * Dimensione, tipo reale e nome vengono verificati sul server; il file va nel bucket privato
 * con la sessione dell'utente (policy dello storage: solo la sua cartella).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const auth = await requireCoachOrThrow();
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      throw new ValidationError({}, "Formato della richiesta non supportato.");
    }
    if (Number(request.headers.get("content-length") ?? 0) > ATTACHMENT_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
      throw new ValidationError({ file: [TOO_LARGE] }, TOO_LARGE);
    }

    const form = await request.formData().catch(() => {
      throw new ValidationError({}, "Richiesta non valida.");
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError({ file: ["Seleziona un file."] }, "Seleziona un file.");
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw new ValidationError({ file: [TOO_LARGE] }, TOO_LARGE);
    }

    const attachment = await uploadAttachment(auth, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    return NextResponse.json({ ok: true, data: attachment }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return errorResponse("coachAi.uploadAttachment", error);
  }
}
