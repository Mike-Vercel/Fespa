export type BriefingInput = {
  /** Clienti con almeno un motivo ad alta priorità (follow-up scaduto, check-in in ritardo). */
  urgentClients: number;
  followupsToday: number;
  activeClients: number;
  /** Clienti attive che hanno inviato un check-in negli ultimi 7 giorni. */
  activeWithRecentCheckin: number;
};

/** Quota di clienti attive con un check-in recente oltre la quale la continuità è "ottima" o "buona". */
const GOOD_CONTINUITY = 0.7;
const FAIR_CONTINUITY = 0.4;

/**
 * "AI Briefing di oggi": tre frasi costruite dai numeri della dashboard. Nessuna chiamata al modello:
 * sarebbero costo e attesa inutili per dati che il sistema conosce già con certezza.
 */
export function dailyBriefing(input: BriefingInput): string[] {
  const lines = [urgentLine(input.urgentClients), followupsLine(input.followupsToday)];
  if (input.activeClients > 0) {
    lines.push(continuityLine(input.activeWithRecentCheckin, input.activeClients));
  }
  return lines;
}

function urgentLine(count: number): string {
  if (count === 0) return "Nessuna cliente richiede attenzione urgente.";
  if (count === 1) return "1 cliente necessita di attenzione urgente.";
  return `${count} clienti necessitano di attenzione urgente.`;
}

function followupsLine(count: number): string {
  if (count === 0) return "Nessun follow-up in programma oggi.";
  if (count === 1) return "1 follow-up è in programma oggi.";
  return `${count} follow-up sono in programma oggi.`;
}

function continuityLine(withCheckin: number, active: number): string {
  const share = withCheckin / active;
  if (share >= GOOD_CONTINUITY) {
    return "Ottima continuità sui check-in questa settimana! 💪";
  }
  // Frasi brevi: nel riquadro del briefing stanno su una riga.
  const who = `${withCheckin} ${withCheckin === 1 ? "cliente" : "clienti"} su ${active}`;
  return share >= FAIR_CONTINUITY
    ? `Buona continuità settimanale: ${who}.`
    : `Pochi check-in in settimana: ${who}.`;
}
