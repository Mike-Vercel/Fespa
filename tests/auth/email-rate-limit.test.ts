import { describe, expect, it } from "vitest";
import { secondsUntilNextEmail } from "@/server/auth/email-rate-limit";

describe("secondsUntilNextEmail (codice di conferma chiesto troppo presto)", () => {
  it("legge i secondi dal limite per utente di Supabase", () => {
    expect(
      secondsUntilNextEmail({
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 43 seconds.",
      }),
    ).toBe(43);
    expect(
      secondsUntilNextEmail({
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 1 second.",
      }),
    ).toBe(1);
  });

  it("non confonde il limite generale del servizio email con quello per utente", () => {
    expect(secondsUntilNextEmail({ code: "over_email_send_rate_limit", message: "Email rate limit exceeded" })).toBeNull();
  });

  it("ignora gli altri errori, anche se il testo somiglia", () => {
    expect(
      secondsUntilNextEmail({ code: "over_request_rate_limit", message: "you can only request this after 10 seconds" }),
    ).toBeNull();
    expect(secondsUntilNextEmail({ message: "after 10 seconds" })).toBeNull();
  });
});
