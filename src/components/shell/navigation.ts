import {
  CalendarCheck2,
  Inbox,
  LayoutDashboard,
  Settings,
  ShieldUser,
  UserCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationCountKey = "pendingCheckins" | "dueFollowups" | "pendingRegistrations";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contatore mostrato accanto alla voce e annunciato agli screen reader. */
  count?: { key: NavigationCountKey; description: string };
};

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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

export function primaryNavigationFor(showAdmin: boolean): NavigationItem[] {
  return showAdmin ? [...PRIMARY_NAVIGATION, ...ADMIN_NAVIGATION] : PRIMARY_NAVIGATION;
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
