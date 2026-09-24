import { describe, expect, it } from "vitest";
import { OTP_LENGTH, signupCodeSchema } from "@/validation/auth";

describe("signupCodeSchema (codice OTP di conferma)", () => {
  const email = "nuova@example.com";

  it("accetta il codice del progetto, anche incollato con spazi", () => {
    const code = "1".repeat(OTP_LENGTH);
    expect(signupCodeSchema.parse({ email, code }).code).toBe(code);
    expect(signupCodeSchema.parse({ email, code: " 1234 5678 " }).code).toBe("12345678");
  });

  it("rifiuta lettere e lunghezze impossibili", () => {
    for (const code of ["abcdefgh", "12345", "12345678901", "dddddddd"]) {
      expect(signupCodeSchema.safeParse({ email, code }).success).toBe(false);
    }
  });
});
