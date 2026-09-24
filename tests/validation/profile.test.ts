import { describe, expect, it } from "vitest";
import { changeEmailSchema, changePasswordSchema } from "@/validation/profile";

function issuePaths(result: { error?: { issues: Array<{ path: PropertyKey[] }> } }): string[] {
  return (result.error?.issues ?? []).map((issue) => issue.path.join(".")).sort();
}

describe("changePasswordSchema (cambio password dal profilo)", () => {
  const valid = { currentPassword: "vecchia-password", password: "nuova-password-1", confirmPassword: "nuova-password-1" };

  it("accetta una nuova password valida, ripetuta uguale", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("chiede sempre la password attuale", () => {
    expect(issuePaths(changePasswordSchema.safeParse({ ...valid, currentPassword: "" }))).toEqual(["currentPassword"]);
  });

  it("rifiuta una nuova password corta o ripetuta male", () => {
    expect(issuePaths(changePasswordSchema.safeParse({ ...valid, password: "corta", confirmPassword: "corta" }))).toEqual([
      "password",
    ]);
    expect(issuePaths(changePasswordSchema.safeParse({ ...valid, confirmPassword: "diversa-password" }))).toEqual([
      "confirmPassword",
    ]);
  });

  it("rifiuta una nuova password uguale a quella attuale", () => {
    const same = { currentPassword: "stessa-password", password: "stessa-password", confirmPassword: "stessa-password" };
    expect(issuePaths(changePasswordSchema.safeParse(same))).toEqual(["password"]);
  });
});

describe("changeEmailSchema (nuova email di accesso)", () => {
  it("normalizza spazi e maiuscole", () => {
    expect(changeEmailSchema.parse({ email: "  Nuova.Email@Example.COM " }).email).toBe("nuova.email@example.com");
  });

  it("rifiuta indirizzi non validi", () => {
    expect(changeEmailSchema.safeParse({ email: "nuova@" }).success).toBe(false);
    expect(changeEmailSchema.safeParse({ email: "" }).success).toBe(false);
  });
});
