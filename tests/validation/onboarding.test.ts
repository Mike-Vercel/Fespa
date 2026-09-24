import { describe, expect, it } from "vitest";
import {
  MIN_CLIENT_AGE_YEARS,
  onboardingHealthSchema,
  onboardingProfileSchema,
  STANDARD_INJURY_QUESTIONS,
} from "@/validation/onboarding";

const validProfile = {
  fullName: "  Sara Bianchi ",
  phone: "",
  birthDate: "1990-05-12",
  goal: "Più energia durante la settimana",
  experienceLevel: "beginner",
  weeklyAvailability: "3",
  preferredContact: "whatsapp",
  notesForCoach: "",
  privacyConsent: true,
};

function issuePaths(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }): string[] {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("onboardingProfileSchema", () => {
  it("normalizza i campi facoltativi vuoti a null e converte i numeri arrivati dal form", () => {
    expect(onboardingProfileSchema.parse(validProfile)).toMatchObject({
      fullName: "Sara Bianchi",
      phone: null,
      notesForCoach: null,
      weeklyAvailability: 3,
      privacyConsent: true,
    });
  });

  it("richiede il consenso al trattamento dei dati", () => {
    const result = onboardingProfileSchema.safeParse({ ...validProfile, privacyConsent: false });
    expect(issuePaths(result)).toEqual(["privacyConsent"]);
  });

  it("rifiuta date impossibili e un'età sotto il minimo", () => {
    const tooYoung = `${new Date().getUTCFullYear() - MIN_CLIENT_AGE_YEARS + 1}-01-01`;
    expect(issuePaths(onboardingProfileSchema.safeParse({ ...validProfile, birthDate: "2020-02-30" }))).toEqual(["birthDate"]);
    expect(issuePaths(onboardingProfileSchema.safeParse({ ...validProfile, birthDate: tooYoung }))).toEqual(["birthDate"]);
  });

  it("rifiuta telefoni non plausibili e valori fuori elenco", () => {
    const result = onboardingProfileSchema.safeParse({ ...validProfile, phone: "chiamami", experienceLevel: "pro" });
    expect(issuePaths(result).sort()).toEqual(["experienceLevel", "phone"]);
  });
});

describe("onboardingHealthSchema", () => {
  it("con un infortunio dichiarato serve una descrizione", () => {
    const result = onboardingHealthSchema.safeParse({ hasInjuries: true, description: " ", followup: [], questionsSource: null });
    expect(issuePaths(result)).toEqual(["description"]);
  });

  it("accetta al massimo tre domande di approfondimento", () => {
    const followup = Array.from({ length: 4 }, (_, index) => ({ question: `Domanda ${index}`, answer: "" }));
    const result = onboardingHealthSchema.safeParse({ hasInjuries: true, description: "Spalla", followup, questionsSource: "ai" });
    expect(issuePaths(result)).toEqual(["followup"]);
  });

  it("le domande standard rientrano nel limite e sono valide per lo schema", () => {
    const followup = STANDARD_INJURY_QUESTIONS.map((question) => ({ question, answer: "" }));
    const result = onboardingHealthSchema.safeParse({ hasInjuries: true, description: "Caviglia", followup, questionsSource: "standard" });
    expect(result.success).toBe(true);
  });
});
