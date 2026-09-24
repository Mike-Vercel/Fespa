/**
 * Supabase invia al massimo un'email di conferma al minuto allo stesso utente. Se se ne chiede
 * un'altra prima, risponde "For security purposes, you can only request this after 43 seconds.":
 * vuol dire che un codice è partito da poco ed è ancora valido.
 * Il limite generale del servizio email ha lo stesso codice di errore ma un messaggio diverso.
 */

const RETRY_AFTER_PATTERN = /after (\d{1,4}) seconds?/i;

type SupabaseEmailError = { code?: string; message: string };

/** Secondi prima di poter chiedere un nuovo codice, oppure null se l'errore è di altro tipo. */
export function secondsUntilNextEmail(error: SupabaseEmailError): number | null {
  if (error.code !== "over_email_send_rate_limit") {
    return null;
  }
  const match = RETRY_AFTER_PATTERN.exec(error.message);
  return match ? Number(match[1]) : null;
}
