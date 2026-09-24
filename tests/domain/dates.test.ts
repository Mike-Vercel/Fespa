import { describe, expect, it } from "vitest";
import { addDays, ageOn, calendarDateIn, daysBetween, hourIn } from "@/domain/dates";

const ROME = "Europe/Rome";

describe("calendarDateIn", () => {
  it("usa il giorno del fuso della coach, non quello UTC", () => {
    // 23:30 UTC del 23 settembre = 01:30 del 24 settembre a Roma (ora legale, UTC+2).
    const lateEveningUtc = new Date("2026-09-23T23:30:00Z");
    expect(calendarDateIn("UTC", lateEveningUtc)).toBe("2026-09-23");
    expect(calendarDateIn(ROME, lateEveningUtc)).toBe("2026-09-24");
  });

  it("gestisce l'ora solare (UTC+1)", () => {
    const winterNight = new Date("2026-01-15T23:30:00Z");
    expect(calendarDateIn(ROME, winterNight)).toBe("2026-01-16");
  });
});

describe("hourIn", () => {
  it("restituisce l'ora locale nel fuso indicato", () => {
    expect(hourIn(ROME, new Date("2026-09-24T06:15:00Z"))).toBe(8);
  });
});

describe("addDays / daysBetween", () => {
  it("attraversa correttamente fine mese e anni bisestili", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("conta i giorni di calendario anche a cavallo del cambio d'ora", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-09-24", "2026-09-20")).toBe(-4);
  });
});

describe("ageOn", () => {
  it("conta gli anni compiuti, cambiando il giorno del compleanno", () => {
    expect(ageOn("1990-05-12", "2026-05-11")).toBe(35);
    expect(ageOn("1990-05-12", "2026-05-12")).toBe(36);
    expect(ageOn("1990-12-31", "2026-01-01")).toBe(35);
  });
});
