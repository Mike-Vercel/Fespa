import { BriefcaseBusiness, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import type { UserRole } from "@/types/domain";

/** Presentazione dei gruppi di "Utenti registrati": riepilogo in alto e riquadri per ruolo. */

export const GROUP_TITLES: Record<UserRole, string> = {
  super_admin: "Super admin",
  admin: "Amministrazione",
  coach: "Coach",
  client: "Clienti",
};

export const GROUP_EMPTY: Record<UserRole, string> = {
  super_admin: "Nessun super admin.",
  admin: "Nessun account di amministrazione.",
  coach: "Nessuna coach.",
  client: "Nessuna cliente registrata.",
};

export const GROUP_ICONS: Record<UserRole, LucideIcon> = {
  super_admin: ShieldCheck,
  admin: ShieldCheck,
  coach: BriefcaseBusiness,
  client: UsersRound,
};

/** Colore del bordo superiore, lo stesso nel riepilogo e nel riquadro del gruppo. */
export const GROUP_TONES: Record<UserRole, string> = {
  super_admin: "border-t-rust",
  admin: "border-t-amber",
  coach: "border-t-accent",
  client: "border-t-sky",
};
