import {
  CalendarCheck2,
  Inbox,
  LayoutGrid,
  MessageCircle,
  Settings,
  ShieldUser,
  UserCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationCountKey = "pendingCheckins" | "dueFollowups" | "pendingRegistrations" | "coachAiDrafts";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contatore mostrato accanto alla voce e annunciato agli screen reader. */
  count?: { key: NavigationCountKey; description: string };
  /** Icona piena quando la voce è attiva (solo dove la forma lo permette, es. la griglia della dashboard). */
  fillIconWhenActive?: boolean;
};

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, fillIconWhenActive: true },
  { href: "/clients", label: "Clienti", icon: Users },
  {
    href: "/checkins",
    label: "Check-in",
    icon: Inbox,
    count: { key: "pendingCheckins", description: "da revisionare" },
  },
  {
    href: "/followups",
    label: "Follow-up",
    icon: CalendarCheck2,
    count: { key: "dueFollowups", description: "in scadenza o scaduti" },
  },
];

/** Voci visibili solo all'admin (le pagine lo verificano comunque sul server). */
export const ADMIN_NAVIGATION: NavigationItem[] = [
  {
    href: "/admin/registrations",
    label: "Iscrizioni",
    icon: UserCheck,
    count: { key: "pendingRegistrations", description: "da approvare" },
  },
  { href: "/admin/users", label: "Utenti registrati", icon: ShieldUser },
];

/** L'agente dello staff: ultima voce del menu principale, come nel design di riferimento. */
export const COACH_AI_NAVIGATION: NavigationItem = {
  href: "/coach-ai",
  label: "Coach AI",
  icon: MessageCircle,
  count: { key: "coachAiDrafts", description: "bozze pronte da revisionare" },
};

export function primaryNavigationFor(showAdmin: boolean): NavigationItem[] {
  return [...PRIMARY_NAVIGATION, ...(showAdmin ? ADMIN_NAVIGATION : []), COACH_AI_NAVIGATION];
}

export const SECONDARY_NAVIGATION: NavigationItem[] = [
  { href: "/profile", label: "Profilo", icon: UserRound },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Preferenza della sidebar desktop salvata in un cookie: il server la conosce già al primo render. */
export const SIDEBAR_COOKIE = "fespa_sidebar";
export const SIDEBAR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
