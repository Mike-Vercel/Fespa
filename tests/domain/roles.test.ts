import { describe, expect, it } from "vitest";
import { canManageRoles, describeRoleChange, isAdminRole } from "@/domain/roles";

describe("ruoli", () => {
  it("amministrazione e super admin sono admin; solo il super admin gestisce i ruoli", () => {
    expect([isAdminRole("client"), isAdminRole("coach"), isAdminRole("admin"), isAdminRole("super_admin")]).toEqual([
      false,
      false,
      true,
      true,
    ]);
    expect(canManageRoles("admin")).toBe(false);
    expect(canManageRoles("super_admin")).toBe(true);
  });

  it("avvisa che le clienti di una coach declassata resteranno senza coach", () => {
    const effects = describeRoleChange("coach", "client", { assignedClientCount: 3, hasOpenRegistration: false });
    expect(effects).toHaveLength(2);
    expect(effects[1]).toContain("3 clienti assegnate");
  });

  it("avvisa che la richiesta di iscrizione verrà eliminata promuovendo una cliente", () => {
    const effects = describeRoleChange("client", "coach", { assignedClientCount: 0, hasOpenRegistration: true });
    expect(effects.at(-1)).toContain("richiesta di iscrizione");
    expect(describeRoleChange("client", "coach", { assignedClientCount: 0, hasOpenRegistration: false })).toHaveLength(1);
  });
});
