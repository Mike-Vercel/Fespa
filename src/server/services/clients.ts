import "server-only";
import { buildAttentionList, type AttentionItem } from "@/domain/attention";
import { calendarDateIn } from "@/domain/dates";
import type { AuthenticatedContext } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { NotFoundError } from "@/server/errors";
import { listAnalysesForClient } from "@/server/repositories/ai-analyses";
import { listCheckinsForClient } from "@/server/repositories/checkins";
import { findHealthProfile, findPersonalProfile } from "@/server/repositories/client-accounts";
import { findClientOverview, listClientOverviews } from "@/server/repositories/clients";
import { listFollowupsForClient } from "@/server/repositories/followups";
import { listNotesForClient } from "@/server/repositories/notes";
import type {
  AIAnalysisItem,
  CheckinItem,
  ClientListItem,
  ClientPersonalProfile,
  FollowupItem,
  HealthProfile,
  NoteItem,
} from "@/types/domain";
import type { ClientListQuery } from "@/validation/clients";
import { assertClientAccess, CLIENT_NOT_ACCESSIBLE_MESSAGE } from "./access";

export type ClientListRow = ClientListItem & {
  attention: Pick<AttentionItem, "priority" | "reasons"> | null;
};

export type ClientList = {
  rows: ClientListRow[];
  totalClients: number;
  today: string;
  timezone: string;
};

const byName = (a: ClientListItem, b: ClientListItem) => a.fullName.localeCompare(b.fullName, "it");

/** Più recente prima; chi non ha dati va in fondo. */
function compareNullableDesc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b.localeCompare(a);
}

function compareNullableAsc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

export async function listClients(
  context: AuthenticatedContext,
  query: ClientListQuery,
  now = new Date(),
): Promise<ClientList> {
  const { APP_TIMEZONE: timezone } = getServerEnv();
  const clients = await listClientOverviews(context.db, query.q);
  const filtered = query.status === "all" ? clients : clients.filter((client) => client.status === query.status);

  const rows: ClientListRow[] = filtered.map((client) => {
    const [attentionItem] = buildAttentionList([client], { now, timezone });
    return {
      ...client,
      attention: attentionItem ? { priority: attentionItem.priority, reasons: attentionItem.reasons } : null,
    };
  });

  return {
    rows: sortClientRows(rows, query.sort),
    totalClients: clients.length,
    today: calendarDateIn(timezone, now),
    timezone,
  };
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function sortClientRows(rows: ClientListRow[], sort: ClientListQuery["sort"]): ClientListRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "name":
      return sorted.sort(byName);
    case "last_checkin":
      return sorted.sort((a, b) => compareNullableDesc(a.lastCheckinAt, b.lastCheckinAt) || byName(a, b));
    case "next_followup":
      return sorted.sort((a, b) => compareNullableAsc(a.nextFollowupOn, b.nextFollowupOn) || byName(a, b));
    case "priority":
      // Prima chi richiede attenzione (dal più urgente), poi le altre in ordine alfabetico.
      return sorted.sort((a, b) => {
        const rankA = a.attention ? PRIORITY_RANK[a.attention.priority] : Number.POSITIVE_INFINITY;
        const rankB = b.attention ? PRIORITY_RANK[b.attention.priority] : Number.POSITIVE_INFINITY;
        return rankA - rankB || byName(a, b);
      });
  }
}

export type ClientDetail = {
  client: ClientListItem;
  checkins: CheckinItem[];
  notes: NoteItem[];
  followups: FollowupItem[];
  analyses: AIAnalysisItem[];
  /** Dati compilati dalla cliente nel questionario di ingresso (null finché non lo completa). */
  profile: ClientPersonalProfile | null;
  health: HealthProfile | null;
  today: string;
  timezone: string;
};

export async function getClientDetail(
  context: AuthenticatedContext,
  clientId: unknown,
  now = new Date(),
): Promise<ClientDetail> {
  const validClientId = await assertClientAccess(context, clientId);
  const { APP_TIMEZONE: timezone } = getServerEnv();

  const [client, checkins, notes, followups, analyses, personalProfile, health] = await Promise.all([
    findClientOverview(context.db, validClientId),
    listCheckinsForClient(context.db, validClientId),
    listNotesForClient(context.db, validClientId, context.coach.id),
    listFollowupsForClient(context.db, validClientId),
    listAnalysesForClient(context.db, validClientId),
    findPersonalProfile(context.db, validClientId),
    findHealthProfile(context.db, validClientId),
  ]);

  if (!client) {
    throw new NotFoundError(CLIENT_NOT_ACCESSIBLE_MESSAGE);
  }

  const profile = personalProfile?.onboardingCompletedAt ? personalProfile : null;
  return { client, checkins, notes, followups, analyses, profile, health, today: calendarDateIn(timezone, now), timezone };
}
