import type { CoachRole, UserRole } from "@/types/domain";

export const STAFF_ROLES: readonly CoachRole[] = ["coach", "admin", "super_admin"];

/** Amministrazione e super admin: iscrizioni, tutte le clienti, assegnazioni. */
export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

/** Solo il super admin cambia i ruoli degli utenti. */
export function canManageRoles(role: UserRole): boolean {
  return role === "super_admin";
}

const ROLE_CAPABILITIES: Record<UserRole, string> = {
  client: "Userà solo l'area clienti.",
  coach: "Accederà all'area staff e vedrà solo le clienti assegnate.",
  admin: "Vedrà tutte le clienti e gestirà iscrizioni e assegnazioni.",
  super_admin: "Avrà tutti i poteri, compresa la gestione dei ruoli.",
};

/**
 * Cosa succede cambiando ruolo, da mostrare prima della conferma.
 * Rispecchia gli effetti della funzione set_user_role del database.
 */
export function describeRoleChange(
  from: UserRole,
  to: UserRole,
  context: { assignedClientCount: number; hasOpenRegistration: boolean },
): string[] {
  const effects = [ROLE_CAPABILITIES[to]];
  if (to === "client" && from !== "client" && context.assignedClientCount > 0) {
    effects.push(
      `Le sue ${context.assignedClientCount} clienti assegnate resteranno senza coach: potrai riassegnarle dalla loro scheda.`,
    );
  }
  if (from === "client" && to !== "client" && context.hasOpenRegistration) {
    effects.push("La sua richiesta di iscrizione come cliente verrà eliminata.");
  }
  return effects;
}
