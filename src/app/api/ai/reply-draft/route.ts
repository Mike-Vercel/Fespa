import { draftReply } from "@/server/ai/workflows/reply-draft";
import { jsonRoute } from "@/server/http/json-route";
import { replyDraftRequestSchema } from "@/validation/ai";

export const maxDuration = 60;

export const POST = jsonRoute({
  operation: "ai.replyDraft",
  schema: replyDraftRequestSchema,
  handler: async (body, auth) => ({ draft: await draftReply(auth, body) }),
});
