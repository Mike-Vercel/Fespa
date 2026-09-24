import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { RateLimitError, UnauthorizedError } from "@/server/errors";
import { fakeAuth } from "../support/fakes";

vi.mock("@/server/auth/session", () => ({ requireCoachOrThrow: vi.fn() }));

const { requireCoachOrThrow } = await import("@/server/auth/session");
const { jsonRoute } = await import("@/server/http/json-route");

const handler = vi.fn(async (body: { id: string }) => ({ echoed: body.id }));
const route = jsonRoute({ operation: "test", schema: z.object({ id: z.uuid() }).strict(), handler });

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://app.test/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://app.test", host: "app.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireCoachOrThrow).mockResolvedValue(fakeAuth());
});

describe("jsonRoute", () => {
  it("risponde con i dati per una richiesta valida, senza cache", async () => {
    const id = randomUUID();
    const response = await route(request({ id }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, data: { echoed: id } });
  });

  it("rifiuta le richieste da un'altra origine (CSRF) prima di fare qualsiasi lavoro", async () => {
    const response = await route(request({ id: randomUUID() }, { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    expect(requireCoachOrThrow).not.toHaveBeenCalled();
  });

  it("senza sessione risponde 401 con un messaggio comprensibile", async () => {
    vi.mocked(requireCoachOrThrow).mockRejectedValue(new UnauthorizedError());
    const response = await route(request({ id: randomUUID() }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("valida il body e non chiama l'handler se non è conforme", async () => {
    const response = await route(request({ id: "non-un-uuid", extra: true }));

    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it("rifiuta JSON malformato e body troppo grandi", async () => {
    expect((await route(request("{ non json"))).status).toBe(400);
    expect((await route(request({ id: "x".repeat(20_000) }))).status).toBe(400);
  });

  it("indica quando riprovare se il rate limit è superato", async () => {
    handler.mockRejectedValueOnce(new RateLimitError(600));
    const response = await route(request({ id: randomUUID() }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
  });

  it("non espone mai i dettagli di un errore imprevisto", async () => {
    handler.mockRejectedValueOnce(new Error("password=segreta connessione db fallita"));
    const response = await route(request({ id: randomUUID() }));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("segreta");
    expect(body).toContain("INTERNAL_ERROR");
  });
});
