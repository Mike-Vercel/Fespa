import { Settings, ShieldCheck, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import type { UserRole } from "@/types/domain";

/** Presentazione dei gruppi di "Utenti registrati": riepilogo per ruolo e pannello del gruppo. */

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
  admin: Settings,
  coach: UsersRound,
  client: UserRound,
};

/**
 * Colori tenui per ruolo, gli stessi delle KPI della dashboard: tacca superiore, icona e anello
 * della card selezionata. Il ruolo è sempre anche scritto: il colore non è l'unica distinzione.
 */
export const GROUP_TONES: Record<UserRole, { accent: string; icon: string; selected: string }> = {
  super_admin: { accent: "border-t-urgent", icon: "bg-urgent-soft text-urgent", selected: "ring-urgent/35" },
  admin: { accent: "border-t-kpi-orange-ink", icon: "bg-kpi-orange text-kpi-orange-ink", selected: "ring-kpi-orange-ink/40" },
  coach: { accent: "border-t-kpi-green-ink", icon: "bg-kpi-green text-kpi-green-ink", selected: "ring-kpi-green-ink/35" },
  client: { accent: "border-t-brand", icon: "bg-brand-soft text-brand", selected: "ring-brand/35" },
};
