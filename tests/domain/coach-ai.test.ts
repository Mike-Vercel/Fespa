import { describe, expect, it } from "vitest";
import {
  confirmationTextMatches,
  conversationGroupOf,
  formatFileSize,
  groupConversations,
  previewFromText,
  titleFromMessage,
} from "@/domain/coach-ai";
import { bytesMatchMimeType, isPlainUtf8Text, mimeTypeFromFileName, sanitizeFileName } from "@/domain/coach-ai-attachments";

const TIMEZONE = "Europe/Rome";
const NOW = new Date("2026-09-25T10:30:00Z");

describe("gruppi della barra delle chat", () => {
  it("Oggi, Ieri, 7 giorni fa e Più vecchie nel fuso della coach", () => {
    expect(conversationGroupOf("2026-09-25T06:00:00Z", NOW, TIMEZONE)).toBe("today");
    // 23:30 UTC del 24 = 01:30 del 25 a Roma: è ancora "oggi".
    expect(conversationGroupOf("2026-09-24T23:30:00Z", NOW, TIMEZONE)).toBe("today");
    expect(conversationGroupOf("2026-09-24T12:00:00Z", NOW, TIMEZONE)).toBe("yesterday");
    expect(conversationGroupOf("2026-09-18T12:00:00Z", NOW, TIMEZONE)).toBe("last7");
    expect(conversationGroupOf("2026-09-10T12:00:00Z", NOW, TIMEZONE)).toBe("older");
  });

  it("restituisce solo i gruppi non vuoti, nell'ordine previsto, mantenendo l'ordine interno", () => {
    const groups = groupConversations(
      [
        { id: "a", updatedAt: "2026-09-25T09:00:00Z" },
        { id: "b", updatedAt: "2026-09-25T08:00:00Z" },
        { id: "c", updatedAt: "2026-09-01T08:00:00Z" },
      ],
      NOW,
      TIMEZONE,
    );
    expect(groups.map((group) => group.label)).toEqual(["Oggi", "Più vecchie"]);
    expect(groups[0].items.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("titolo e anteprima automatici", () => {
  it("usa la prima riga, senza markdown, tagliata a una parola intera", () => {
    expect(titleFromMessage("**Programma** un follow-up con Sara per venerdì\naltro")).toBe("Programma un follow-up con Sara per venerdì");
    const long = titleFromMessage("puoi creare un piano di allenamento post parto per una cliente che ha tre mesi dal parto e poco tempo");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("…")).toBe(true);
    expect(long.startsWith("Puoi")).toBe(true);
  });

  it("senza testo usa il titolo predefinito", () => {
    expect(titleFromMessage("   \n  ")).toBe("Nuova chat");
    expect(previewFromText("")).toBeNull();
  });
});

describe("testo di conferma per le azioni distruttive", () => {
  it("ignora maiuscole e spazi superflui, ma non accetta testi diversi", () => {
    expect(confirmationTextMatches("  sara   BELLINI ", "Sara Bellini")).toBe(true);
    expect(confirmationTextMatches("Sara", "Sara Bellini")).toBe(false);
    expect(confirmationTextMatches(undefined, "ELIMINA")).toBe(false);
    expect(confirmationTextMatches("", "ELIMINA")).toBe(false);
  });
});

describe("allegati", () => {
  it("il nome del file non può contenere percorsi, caratteri di controllo o simboli pericolosi", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\x\\report<script>.pdf")).toBe("reportscript.pdf");
    expect(sanitizeFileName("piano\u0000\u001f.txt")).toBe("piano.txt");
    expect(sanitizeFileName("...")).toBe("allegato");
    const long = sanitizeFileName(`${"a".repeat(300)}.pdf`);
    expect(long.length).toBeLessThanOrEqual(100);
    expect(long.endsWith(".pdf")).toBe(true);
  });

  it("il tipo deriva dall'estensione ammessa", () => {
    expect(mimeTypeFromFileName("check-in.CSV")).toBe("text/csv");
    expect(mimeTypeFromFileName("foto.jpeg")).toBe("image/jpeg");
    expect(mimeTypeFromFileName("script.exe")).toBeNull();
    expect(mimeTypeFromFileName("senza-estensione")).toBeNull();
  });

  it("i byte devono corrispondere al tipo dichiarato (magic bytes)", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n...");
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(bytesMatchMimeType(pdf, "application/pdf")).toBe(true);
    expect(bytesMatchMimeType(png, "image/png")).toBe(true);
    // Un file HTML rinominato .pdf o .png viene rifiutato.
    expect(bytesMatchMimeType(html, "application/pdf")).toBe(false);
    expect(bytesMatchMimeType(html, "image/png")).toBe(false);
  });

  it("TXT e CSV devono essere testo UTF-8 senza byte nulli", () => {
    expect(isPlainUtf8Text(new TextEncoder().encode("nome;peso\nSara;62"))).toBe(true);
    expect(isPlainUtf8Text(new Uint8Array([0x61, 0x00, 0x62]))).toBe(false);
    expect(isPlainUtf8Text(new Uint8Array([0xff, 0xfe, 0xfd]))).toBe(false);
  });

  it("dimensioni leggibili", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(340 * 1024)).toBe("340 KB");
    expect(formatFileSize(4 * 1024 * 1024)).toBe("4 MB");
  });
});
