import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newClientSchema } from "@/validation/clients";
import { registrationReviewSchema } from "@/validation/registrations";

describe("newClientSchema (nuova cliente creata dalla coach)", () => {
  const base = { fullName: "Anna Verdi", email: "", goal: "", startedOn: "2026-09-24" };

  it("l'email è facoltativa: vuota diventa null, altrimenti viene normalizzata", () => {
    expect(newClientSchema.parse(base)).toMatchObject({ email: null, goal: null });
    expect(newClientSchema.parse({ ...base, email: "  Anna.Verdi@Example.COM " }).email).toBe("anna.verdi@example.com");
  });

  it("rifiuta email non valide e nomi troppo corti", () => {
    const result = newClientSchema.safeParse({ ...base, fullName: "A", email: "anna@" });
    expect(result.error?.issues.map((issue) => issue.path.join(".")).sort()).toEqual(["email", "fullName"]);
  });
});

describe("registrationReviewSchema (decisione dell'admin)", () => {
  const clientId = randomUUID();

  it("in approvazione la coach è facoltativa, ma se c'è dev'essere un identificativo valido", () => {
    expect(registrationReviewSchema.safeParse({ clientId, decision: "approved" }).success).toBe(true);
    expect(registrationReviewSchema.safeParse({ clientId, decision: "approved", coachId: "" }).success).toBe(true);
    expect(registrationReviewSchema.safeParse({ clientId, decision: "approved", coachId: randomUUID() }).success).toBe(true);
    const invalid = registrationReviewSchema.safeParse({ clientId, decision: "approved", coachId: "non-un-uuid" });
    expect(invalid.error?.issues.map((issue) => issue.path.join("."))).toEqual(["coachId"]);
  });

  it("un rifiuto non porta con sé una coach, anche se il client la invia", () => {
    const parsed = registrationReviewSchema.parse({ clientId, decision: "rejected", coachId: randomUUID() });
    expect(parsed).toEqual({ clientId, decision: "rejected" });
  });

  it("accetta solo approvazione, rifiuto e ripristino in attesa", () => {
    expect(registrationReviewSchema.safeParse({ clientId, decision: "pending" }).success).toBe(true);
    expect(registrationReviewSchema.safeParse({ clientId, decision: "annullata" }).success).toBe(false);
  });
});
