import { describe, expect, it } from "vitest";
import {
  CLIENT_HOME_PATH,
  POST_LOGIN_PATH,
  postLoginPathFor,
  sanitizeRedirectPath,
  STAFF_HOME_PATH,
} from "@/validation/redirect";

describe("sanitizeRedirectPath (anti open-redirect)", () => {
  it("accetta path interni con query string", () => {
    expect(sanitizeRedirectPath("/clients/abc?tab=checkins")).toBe("/clients/abc?tab=checkins");
  });

  it.each([
    ["URL assoluto", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash", "/\\evil.example"],
    ["schema javascript", "javascript:alert(1)"],
    ["caratteri di controllo", "/dashboard\n/evil"],
    ["vuoto", ""],
    ["null", null],
    ["ritorno al login", "/login?next=/login"],
  ])("rifiuta %s", (_label, candidate) => {
    expect(sanitizeRedirectPath(candidate)).toBe(POST_LOGIN_PATH);
  });
});

describe("postLoginPathFor (area giusta per ogni ruolo)", () => {
  it("senza richiesta porta ciascun ruolo nella sua area", () => {
    expect(postLoginPathFor("coach", null)).toBe(STAFF_HOME_PATH);
    expect(postLoginPathFor("admin", undefined)).toBe(STAFF_HOME_PATH);
    expect(postLoginPathFor("client", null)).toBe(CLIENT_HOME_PATH);
  });

  it("rispetta il path richiesto solo se appartiene all'area del ruolo", () => {
    expect(postLoginPathFor("coach", "/clients/abc?tab=note")).toBe("/clients/abc?tab=note");
    expect(postLoginPathFor("client", "/area-cliente/check-in")).toBe("/area-cliente/check-in");
    expect(postLoginPathFor("client", "/clients/abc")).toBe(CLIENT_HOME_PATH);
    expect(postLoginPathFor("coach", "/area-cliente/profilo")).toBe(STAFF_HOME_PATH);
  });

  it("un path esterno ricade sempre sulla home del ruolo", () => {
    expect(postLoginPathFor("client", "https://evil.example")).toBe(CLIENT_HOME_PATH);
  });
});
