import "server-only";
import { followupSuggestionSchema, type CheckinAnalysisOutput } from "@/server/ai/schemas/checkin-analysis";
import type { Json, TableRow } from "@/server/db/database.types";
import type { AppSupabaseClient } from "@/server/db/supabase";
import { DataAccessError } from "@/server/errors";
import type { AIAnalysisItem, FollowupSuggestion } from "@/types/domain";

const MAX_ANALYSES = 50;

const ANALYSIS_COLUMNS =
  "id, client_id, checkin_id, summary, topics, follow_up_needed, followup_suggestion, followup_decision, suggested_questions, confidence, sensitive_content_note, provider, model, is_mock, created_at";

type AnalysisRow = Pick<
  TableRow<"ai_analyses">,
  | "id"
  | "client_id"
  | "checkin_id"
  | "summary"
  | "topics"
  | "follow_up_needed"
  | "followup_suggestion"
  | "followup_decision"
  | "suggested_questions"
  | "confidence"
  | "sensitive_content_note"
  | "provider"
  | "model"
  | "is_mock"
  | "created_at"
>;

function parseSuggestion(value: Json | null): FollowupSuggestion | null {
  if (value === null) return null;
  const parsed = followupSuggestionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toAnalysisItem(row: AnalysisRow): AIAnalysisItem {
  return {
    id: row.id,
    clientId: row.client_id,
    checkinId: row.checkin_id,
    summary: row.summary,
    topics: row.topics,
    followUpNeeded: row.follow_up_needed,
    followupSuggestion: parseSuggestion(row.followup_suggestion),
    followupDecision: row.followup_decision,
    suggestedQuestions: row.suggested_questions,
    confidence: row.confidence,
    sensitiveContentNote: row.sensitive_content_note,
    provider: row.provider,
    model: row.model,
    isMock: row.is_mock,
    createdAt: row.created_at,
  };
}

/** Analisi di una cliente, dalla più recente. */
export async function listAnalysesForClient(db: AppSupabaseClient, clientId: string): Promise<AIAnalysisItem[]> {
  const { data, error } = await db
    .from("ai_analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(MAX_ANALYSES);
  if (error) {
    throw new DataAccessError("aiAnalyses.listForClient", error);
  }
  return data.map(toAnalysisItem);
}

export async function findLatestAnalysisForCheckin(
  db: AppSupabaseClient,
  checkinId: string,
): Promise<AIAnalysisItem | null> {
  const { data, error } = await db
    .from("ai_analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("checkin_id", checkinId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new DataAccessError("aiAnalyses.findLatestForCheckin", error);
  }
  return data ? toAnalysisItem(data) : null;
}

export async function findAnalysis(db: AppSupabaseClient, analysisId: string): Promise<AIAnalysisItem | null> {
  const { data, error } = await db.from("ai_analyses").select(ANALYSIS_COLUMNS).eq("id", analysisId).maybeSingle();
  if (error) {
    throw new DataAccessError("aiAnalyses.find", error);
  }
  return data ? toAnalysisItem(data) : null;
}

export async function insertAnalysis(
  db: AppSupabaseClient,
  input: {
    clientId: string;
    checkinId: string;
    coachId: string;
    output: CheckinAnalysisOutput;
    provider: string;
    model: string;
    promptVersion: string;
    isMock: boolean;
  },
): Promise<AIAnalysisItem> {
  const { output } = input;
  const { data, error } = await db
    .from("ai_analyses")
    .insert({
      client_id: input.clientId,
      checkin_id: input.checkinId,
      coach_id: input.coachId,
      summary: output.summary,
      topics: output.topics,
      follow_up_needed: output.followUpNeeded,
      followup_suggestion: output.followUpSuggestion,
      // Una proposta resta "pending" finché la coach non la accetta o la ignora.
      followup_decision: output.followUpSuggestion ? "pending" : null,
      suggested_questions: output.suggestedQuestions,
      confidence: output.confidence,
      sensitive_content_note: output.sensitiveContentNote,
      provider: input.provider,
      model: input.model,
      prompt_version: input.promptVersion,
      is_mock: input.isMock,
    })
    .select(ANALYSIS_COLUMNS)
    .single();
  if (error) {
    throw new DataAccessError("aiAnalyses.insert", error);
  }
  return toAnalysisItem(data);
}

/** Registra la decisione della coach su una proposta di follow-up ancora in attesa. */
export async function recordFollowupDecision(
  db: AppSupabaseClient,
  analysisId: string,
  decision: "accepted" | "dismissed",
): Promise<boolean> {
  const { data, error } = await db
    .from("ai_analyses")
    .update({ followup_decision: decision, followup_decided_at: new Date().toISOString() })
    .eq("id", analysisId)
    .eq("followup_decision", "pending")
    .select("id");
  if (error) {
    throw new DataAccessError("aiAnalyses.recordDecision", error);
  }
  return data.length > 0;
}
