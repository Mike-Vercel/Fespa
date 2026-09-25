import { randomUUID } from "node:crypto";
import type { Json } from "@/server/db/database.types";
import type { ActionRequestRecord, ActionRequestStatus } from "@/server/repositories/ai-action-requests";

/**
 * Store in memoria che imita il repository delle richieste di azione, compresa la transizione
 * condizionata ("aggiorna solo se lo stato è tra…") su cui si basa l'idempotenza.
 */
export function createActionStore() {
  const rows = new Map<string, ActionRequestRecord & { idempotencyKey: string; ownerId: string }>();
  const logs: Array<{ event: string; toolName: string; actionRequestId: string | null; errorCode: string | null }> = [];

  return {
    rows,
    logs,
    reset() {
      rows.clear();
      logs.length = 0;
    },
    async insertActionRequest(_db: unknown, input: {
      ownerId: string;
      conversationId: string | null;
      messageId: string | null;
      automationId: string | null;
      toolName: string;
      riskLevel: ActionRequestRecord["riskLevel"];
      status: "draft" | "pending";
      input: Json;
      preview: Json;
      targetType: string | null;
      targetId: string | null;
      idempotencyKey: string;
      expiresAt: string | null;
    }) {
      const existing = [...rows.values()].find((row) => row.ownerId === input.ownerId && row.idempotencyKey === input.idempotencyKey);
      if (existing) return { record: existing, created: false };
      const record = {
        id: randomUUID(),
        ownerId: input.ownerId,
        idempotencyKey: input.idempotencyKey,
        conversationId: input.conversationId,
        messageId: input.messageId,
        automationId: input.automationId,
        toolName: input.toolName,
        riskLevel: input.riskLevel,
        status: input.status as ActionRequestStatus,
        input: input.input,
        preview: input.preview,
        targetType: input.targetType,
        targetId: input.targetId,
        result: null,
        errorCode: null,
        errorMessage: null,
        expiresAt: input.expiresAt,
        confirmedAt: null,
        executedAt: null,
        createdAt: new Date().toISOString(),
      };
      rows.set(record.id, record);
      return { record, created: true };
    },
    async findActionRequest(_db: unknown, id: string) {
      return rows.get(id) ?? null;
    },
    async listActionRequestsByIds(_db: unknown, ids: string[]) {
      return ids.flatMap((id) => rows.get(id) ?? []);
    },
    async listOpenActionRequests() {
      return [...rows.values()].filter((row) => row.status === "draft" || row.status === "pending");
    },
    async transitionActionRequest(
      _db: unknown,
      id: string,
      from: readonly ActionRequestStatus[],
      changes: { status: ActionRequestStatus; result?: Json | null; errorCode?: string | null; errorMessage?: string | null; messageId?: string },
    ) {
      const row = rows.get(id);
      if (!row || !from.includes(row.status)) return null;
      const updated = {
        ...row,
        status: changes.status,
        ...(changes.result !== undefined ? { result: changes.result } : {}),
        ...(changes.errorCode !== undefined ? { errorCode: changes.errorCode } : {}),
        ...(changes.errorMessage !== undefined ? { errorMessage: changes.errorMessage } : {}),
        ...(changes.messageId !== undefined ? { messageId: changes.messageId } : {}),
      };
      rows.set(id, updated);
      return updated;
    },
    async updateActionRequestPayload(_db: unknown, id: string, payload: { input: Json; preview: Json }) {
      const row = rows.get(id);
      if (!row || !["draft", "pending"].includes(row.status)) return null;
      const updated = { ...row, input: payload.input, preview: payload.preview };
      rows.set(id, updated);
      return updated;
    },
    async insertActionLog(
      _db: unknown,
      entry: { event: string; toolName: string; actionRequestId: string | null; errorCode?: string | null },
    ) {
      logs.push({ event: entry.event, toolName: entry.toolName, actionRequestId: entry.actionRequestId, errorCode: entry.errorCode ?? null });
    },
  };
}
