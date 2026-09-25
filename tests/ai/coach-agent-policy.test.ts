import { describe, expect, it } from "vitest";
import { assertConfirmation, CONFIRMATION_BY_RISK, isToolAllowed, requiresConfirmation } from "@/server/ai/agent/policy";
import { AGENT_TOOLS, agentToolsFor, findActionTool } from "@/server/ai/agent/tools/registry";
import { toStrictJsonSchema } from "@/server/ai/providers/json-schema";
import { ValidationError } from "@/server/errors";

const names = (role: "coach" | "admin" | "super_admin") => agentToolsFor(role).map((tool) => tool.name);

describe("action policy", () => {
  it("lettura e bozze sono automatiche, le scritture chiedono conferma crescente", () => {
    expect(CONFIRMATION_BY_RISK).toEqual({
      read: "none",
      draft: "none",
      write: "standard",
      high_risk: "explicit",
      destructive: "typed",
    });
    expect(requiresConfirmation("read")).toBe(false);
    expect(requiresConfirmation("draft")).toBe(false);
    expect(requiresConfirmation("write")).toBe(true);
  });

  it("alto rischio: senza la spunta 'Ho verificato' il server rifiuta", () => {
    expect(() => assertConfirmation("high_risk", {}, null)).toThrow(ValidationError);
    expect(() => assertConfirmation("high_risk", { acknowledged: false }, null)).toThrow(ValidationError);
    expect(() => assertConfirmation("high_risk", { acknowledged: true }, null)).not.toThrow();
  });

  it("distruttive: serve il testo esatto (maiuscole e spazi a parte)", () => {
    expect(() => assertConfirmation("destructive", {}, "Sara Bellini")).toThrow(ValidationError);
    expect(() => assertConfirmation("destructive", { typedConfirmation: "Sara" }, "Sara Bellini")).toThrow(ValidationError);
    expect(() => assertConfirmation("destructive", { acknowledged: true }, "Sara Bellini")).toThrow(ValidationError);
    // Senza testo atteso l'azione distruttiva non è mai confermabile.
    expect(() => assertConfirmation("destructive", { typedConfirmation: "" }, null)).toThrow(ValidationError);
    expect(() => assertConfirmation("destructive", { typedConfirmation: " sara bellini " }, "Sara Bellini")).not.toThrow();
  });
});

describe("tool registry", () => {
  it("nomi unici e schemi convertibili in JSON Schema strict (niente campi extra)", () => {
    const allNames = AGENT_TOOLS.map((tool) => tool.name);
    expect(new Set(allNames).size).toBe(allNames.length);
    for (const tool of AGENT_TOOLS) {
      const schema = toStrictJsonSchema(tool.inputSchema, "input");
      expect(schema.type).toBe("object");
      expect((schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
      expect(tool.description.length).toBeGreaterThan(30);
      expect(tool.allowedRoles.length).toBeGreaterThan(0);
    }
  });

  it("ogni tool di scrittura ha un livello di rischio che richiede conferma", () => {
    for (const tool of AGENT_TOOLS) {
      if (tool.kind === "action") {
        expect(["write", "high_risk", "destructive"]).toContain(tool.risk);
        expect(requiresConfirmation(tool.risk)).toBe(true);
      } else {
        expect(requiresConfirmation(tool.risk)).toBe(false);
      }
    }
  });

  it("le azioni distruttive e ad alto rischio sono quelle attese", () => {
    const byRisk = (risk: string) => AGENT_TOOLS.filter((tool) => tool.risk === risk).map((tool) => tool.name).sort();
    expect(byRisk("destructive")).toEqual(["archive_client", "delete_coach_note"]);
    expect(byRisk("high_risk")).toEqual(["change_user_role", "review_registration"]);
    // Non esiste un tool che elimina definitivamente clienti o account.
    expect(AGENT_TOOLS.some((tool) => /delete_(client|user)/.test(tool.name))).toBe(false);
  });

  it("una coach non riceve i tool dell'amministrazione", () => {
    const coach = names("coach");
    for (const adminOnly of ["change_user_role", "review_registration", "archive_client", "restore_client", "search_users", "get_registrations"]) {
      expect(coach).not.toContain(adminOnly);
    }
    expect(coach).toContain("send_checkin_reply");
    expect(coach).toContain("prepare_checkin_reply");
  });

  it("l'amministrazione gestisce iscrizioni e archiviazioni ma non i ruoli; il super admin sì", () => {
    expect(names("admin")).toContain("archive_client");
    expect(names("admin")).toContain("review_registration");
    expect(names("admin")).not.toContain("change_user_role");
    expect(names("super_admin")).toContain("change_user_role");
  });

  it("il controllo del ruolo vale anche per un tool chiamato fuori lista", () => {
    const changeRole = findActionTool("change_user_role");
    expect(changeRole).toBeDefined();
    expect(isToolAllowed("coach", changeRole!)).toBe(false);
    expect(isToolAllowed("admin", changeRole!)).toBe(false);
    expect(isToolAllowed("super_admin", changeRole!)).toBe(true);
  });
});

describe("schemi degli input dei tool", () => {
  const tool = (name: string) => {
    const found = AGENT_TOOLS.find((candidate) => candidate.name === name);
    if (!found) throw new Error(name);
    return found;
  };

  it("rifiutano id non validi, campi extra e limiti superati", () => {
    expect(tool("get_client_overview").validate({ clientId: "../../admin" }).ok).toBe(false);
    expect(tool("get_client_checkins").validate({ clientId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", limit: 50 }).ok).toBe(false);
    expect(tool("search_clients").validate({ query: "Sara", includeArchived: false, role: "admin" }).ok).toBe(false);
    expect(tool("create_followup").validate({ clientId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", title: "Ok", dueOn: "domani", description: null }).ok).toBe(false);
  });

  it("accettano input corretti e normalizzano i campi vuoti", () => {
    const result = tool("create_followup").validate({
      clientId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      title: "  Controllo sonno ",
      dueOn: "2026-10-02",
      description: "",
    });
    expect(result).toEqual({
      ok: true,
      value: { clientId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", title: "Controllo sonno", dueOn: "2026-10-02", description: null },
    });
  });

  it("una risposta alla cliente deve avere un testo reale (niente invii vuoti)", () => {
    expect(tool("send_checkin_reply").validate({ checkinId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", text: "ok" }).ok).toBe(false);
  });

  it("le automazioni ammettono solo la combinazione implementata", () => {
    expect(tool("create_automation").validate({ trigger: "new_checkin", action: "generate_reply_draft" }).ok).toBe(true);
    expect(tool("create_automation").validate({ trigger: "new_checkin", action: "send_reply" }).ok).toBe(false);
    expect(tool("create_automation").validate({ trigger: "followup_due", action: "generate_reply_draft" }).ok).toBe(false);
  });
});
