import { describe, expect, it } from "vitest";
import { matchesUserSearch } from "@/domain/user-search";

const luigi = { fullName: "Luigi Michael Giglio", email: "michaelgiglio68@gmail.com" };
const nicolo = { fullName: "Nicolò Bianchi", email: "nicolo.b@example.com" };

describe("matchesUserSearch (ricerca tra gli utenti registrati)", () => {
  it("una ricerca vuota mostra tutti", () => {
    expect(matchesUserSearch(luigi, "")).toBe(true);
    expect(matchesUserSearch(luigi, "   ")).toBe(true);
  });

  it("cerca in nome ed email, senza badare alle maiuscole", () => {
    expect(matchesUserSearch(luigi, "GIGLIO")).toBe(true);
    expect(matchesUserSearch(luigi, "gmail.com")).toBe(true);
    expect(matchesUserSearch(luigi, "rossi")).toBe(false);
  });

  it("ignora gli accenti in entrambe le direzioni", () => {
    expect(matchesUserSearch(nicolo, "nicolo")).toBe(true);
    expect(matchesUserSearch({ ...nicolo, fullName: "Nicolo Bianchi" }, "nicolò")).toBe(true);
  });

  it("con più parole servono tutte, in qualsiasi ordine", () => {
    expect(matchesUserSearch(luigi, "gmail luigi")).toBe(true);
    expect(matchesUserSearch(luigi, "luigi example")).toBe(false);
  });
});
