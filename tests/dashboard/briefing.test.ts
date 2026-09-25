import { describe, expect, it } from "vitest";
import { dailyBriefing } from "@/features/dashboard/briefing";

describe("dailyBriefing (\"AI Briefing di oggi\" dai dati della dashboard)", () => {
  it("riassume urgenze, follow-up di oggi e continuità dei check-in", () => {
    expect(dailyBriefing({ urgentClients: 4, followupsToday: 1, activeClients: 10, activeWithRecentCheckin: 8 })).toEqual([
      "4 clienti necessitano di attenzione urgente.",
      "1 follow-up è in programma oggi.",
      "Ottima continuità sui check-in questa settimana! 💪",
    ]);
  });

  it("singolari, zeri e continuità bassa", () => {
    expect(dailyBriefing({ urgentClients: 1, followupsToday: 0, activeClients: 5, activeWithRecentCheckin: 1 })).toEqual([
      "1 cliente necessita di attenzione urgente.",
      "Nessun follow-up in programma oggi.",
      "Pochi check-in in settimana: 1 cliente su 5.",
    ]);
    expect(dailyBriefing({ urgentClients: 0, followupsToday: 3, activeClients: 10, activeWithRecentCheckin: 5 })).toEqual([
      "Nessuna cliente richiede attenzione urgente.",
      "3 follow-up sono in programma oggi.",
      "Buona continuità settimanale: 5 clienti su 10.",
    ]);
  });

  it("senza clienti attive non parla di continuità", () => {
    expect(dailyBriefing({ urgentClients: 0, followupsToday: 0, activeClients: 0, activeWithRecentCheckin: 0 })).toHaveLength(2);
  });
});
