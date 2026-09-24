import type { AIAnalysisItem, CheckinItem, FollowupItem, NoteItem } from "@/types/domain";

export type ActivityKind = "checkin_received" | "checkin_reviewed" | "note_added" | "followup_completed" | "ai_analysis";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  at: string;
  description: string;
};

type ActivitySources = {
  checkins: CheckinItem[];
  notes: NoteItem[];
  followups: FollowupItem[];
  analyses: AIAnalysisItem[];
};

/** Ultimi eventi della cliente in un'unica sequenza, dal più recente. */
export function buildRecentActivity(sources: ActivitySources, limit: number): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const checkin of sources.checkins) {
    events.push({ id: `checkin-${checkin.id}`, kind: "checkin_received", at: checkin.submittedAt, description: "Check-in ricevuto" });
    if (checkin.reviewedAt) {
      events.push({
        id: `review-${checkin.id}`,
        kind: "checkin_reviewed",
        at: checkin.reviewedAt,
        description: checkin.reviewedByName ? `Check-in revisionato da ${checkin.reviewedByName}` : "Check-in revisionato",
      });
    }
  }

  for (const note of sources.notes) {
    events.push({
      id: `note-${note.id}`,
      kind: "note_added",
      at: note.createdAt,
      description: note.isOwn ? "Hai aggiunto una nota" : `Nota di ${note.authorName}`,
    });
  }

  for (const followup of sources.followups) {
    if (followup.status === "completed" && followup.completedAt) {
      events.push({
        id: `followup-${followup.id}`,
        kind: "followup_completed",
        at: followup.completedAt,
        description: `Follow-up completato: ${followup.title}`,
      });
    }
  }

  for (const analysis of sources.analyses) {
    events.push({
      id: `analysis-${analysis.id}`,
      kind: "ai_analysis",
      at: analysis.createdAt,
      description: analysis.isMock ? "Analisi dimostrativa (mock) di un check-in" : "Analisi AI di un check-in",
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
