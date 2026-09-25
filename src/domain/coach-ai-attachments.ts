import type { AttachmentKind } from "@/types/coach-ai";

/*
 * Regole sugli allegati di Coach AI (pure, condivise tra browser e server).
 * Il browser le usa per un errore immediato; il server le riapplica sempre sui byte reali.
 */

export type AllowedMimeType = "application/pdf" | "text/plain" | "text/csv" | "image/png" | "image/jpeg" | "image/webp";

export const ATTACHMENT_TYPES: Record<AllowedMimeType, { kind: AttachmentKind; extensions: readonly string[]; label: string }> = {
  "application/pdf": { kind: "pdf", extensions: ["pdf"], label: "PDF" },
  "text/plain": { kind: "text", extensions: ["txt"], label: "TXT" },
  "text/csv": { kind: "text", extensions: ["csv"], label: "CSV" },
  "image/png": { kind: "image", extensions: ["png"], label: "PNG" },
  "image/jpeg": { kind: "image", extensions: ["jpg", "jpeg"], label: "JPG" },
  "image/webp": { kind: "image", extensions: ["webp"], label: "WEBP" },
};

export const ACCEPTED_FILE_INPUT = Object.values(ATTACHMENT_TYPES)
  .flatMap((type) => type.extensions.map((extension) => `.${extension}`))
  .join(",");

export const ACCEPTED_TYPES_LABEL = "PDF, TXT, CSV, PNG, JPG o WEBP";

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return Object.hasOwn(ATTACHMENT_TYPES, value);
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Tipo dichiarato dall'estensione (il MIME inviato dal browser non è affidabile). */
export function mimeTypeFromFileName(fileName: string): AllowedMimeType | null {
  const extension = extensionOf(fileName);
  const match = (Object.entries(ATTACHMENT_TYPES) as Array<[AllowedMimeType, (typeof ATTACHMENT_TYPES)[AllowedMimeType]]>).find(
    ([, type]) => type.extensions.includes(extension),
  );
  return match ? match[0] : null;
}

const FILE_NAME_MAX_LENGTH = 100;

/**
 * Nome file sicuro da salvare e mostrare: niente percorsi, caratteri di controllo o simboli
 * che potrebbero confondere interfaccia e prompt. Il file nello storage NON usa questo nome.
 */
export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = baseName
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*`$]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim();
  if (cleaned === "") return "allegato";
  if (cleaned.length <= FILE_NAME_MAX_LENGTH) return cleaned;
  const extension = extensionOf(cleaned);
  const keep = FILE_NAME_MAX_LENGTH - (extension ? extension.length + 1 : 0);
  return extension ? `${cleaned.slice(0, keep)}.${extension}` : cleaned.slice(0, FILE_NAME_MAX_LENGTH);
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Verifica che i byte corrispondano al tipo dichiarato ("magic bytes"):
 * un eseguibile rinominato in .pdf o un HTML rinominato in .png viene rifiutato.
 */
export function bytesMatchMimeType(bytes: Uint8Array, mimeType: AllowedMimeType): boolean {
  switch (mimeType) {
    case "application/pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/webp":
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8); // RIFF....WEBP
    case "text/plain":
    case "text/csv":
      return isPlainUtf8Text(bytes);
  }
}

/** Testo UTF-8 valido, senza byte nulli (tipici dei file binari). */
export function isPlainUtf8Text(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}
