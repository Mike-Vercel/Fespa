import { describe, expect, it } from "vitest";
import { activeClientsPerDay, countPerDay, growthPercent, lastDays, sumSeries } from "@/domain/dashboard-trends";

describe("andamenti della dashboard", () => {
  it("lastDays: gli ultimi giorni fino a oggi, dal più vecchio", () => {
    expect(lastDays("2026-09-25", 3)).toEqual(["2026-09-23", "2026-09-24", "2026-09-25"]);
    expect(lastDays("2026-03-01", 2)).toEqual(["2026-02-28", "2026-03-01"]);
  });

  it("countPerDay: conta gli eventi per giorno e ignora quelli fuori intervallo", () => {
    const days = ["2026-09-23", "2026-09-24", "2026-09-25"];
    expect(countPerDay(["2026-09-24", "2026-09-24", "2026-09-25", "2026-08-01"], days)).toEqual([0, 2, 1]);
  });

  it("activeClientsPerDay: quante delle clienti attive avevano già iniziato quel giorno", () => {
    const days = ["2026-09-23", "2026-09-24", "2026-09-25"];
    expect(activeClientsPerDay(["2026-09-01", "2026-09-24", "2026-09-25"], days)).toEqual([1, 2, 3]);
  });

  it("growthPercent: crescita rispetto a 30 giorni fa, null senza base di confronto", () => {
    const starts = ["2026-01-10", "2026-05-02", "2026-07-20", "2026-09-20"];
    // 30 giorni prima del 25/9 ne avevano già iniziato 3: ora sono 4 → +33%.
    expect(growthPercent(starts, "2026-09-25", 30)).toBe(33);
    expect(growthPercent(["2026-09-20"], "2026-09-25", 30)).toBeNull();
    expect(growthPercent([], "2026-09-25", 30)).toBeNull();
  });

  it("sumSeries: somma giorno per giorno", () => {
    expect(sumSeries([1, 0, 2], [0, 3, 1])).toEqual([1, 3, 3]);
  });
});
