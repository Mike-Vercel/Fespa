import "server-only";

/**
 * Delimitazione dei dati NON AFFIDABILI inviati al modello.
 *
 * Check-in, note e testi delle clienti possono contenere qualsiasi cosa, anche frasi come
 * "ignora le istruzioni precedenti". Per questo:
 *  1. vengono racchiusi in <dati_non_affidabili>, e il system prompt dice che sono solo dati;
 *  2. i caratteri < e > vengono sostituiti, così il testo non può chiudere il tag e
 *     fingersi contenuto dell'applicazione;
 *  3. caratteri di controllo rimossi e lunghezza limitata (anche per contenere i costi).
 */

export const UNTRUSTED_TAG = "dati_non_affidabili";
const DEFAULT_MAX_LENGTH = 1500;

export function sanitizeUntrustedText(text: string, maxLength = DEFAULT_MAX_LENGTH): string {
  const withoutControlCharacters = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  const neutralized = withoutControlCharacters.replace(/</g, "‹").replace(/>/g, "›");
  const trimmed = neutralized.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}… [troncato]` : trimmed;
}

/** Valore di attributo sicuro: solo lettere, cifre e pochi separatori. */
function sanitizeAttribute(value: string): string {
  return value.replace(/[^\p{L}\p{N} _.:/-]/gu, "").slice(0, 60);
}

export function untrustedBlock(field: string, text: string, maxLength?: number): string {
  return `<${UNTRUSTED_TAG} campo="${sanitizeAttribute(field)}">${sanitizeUntrustedText(text, maxLength)}</${UNTRUSTED_TAG}>`;
}
