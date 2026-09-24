import { askCopilot } from "@/server/ai/workflows/copilot";
import { jsonRoute } from "@/server/http/json-route";
import { copilotRequestSchema } from "@/validation/ai";

// Il Copilot può fare più passi con i tool: serve un margine maggiore di una singola chiamata.
export const maxDuration = 90;

export const POST = jsonRoute({
  operation: "ai.copilot",
  schema: copilotRequestSchema,
  handler: async (body, auth) => ({ answer: await askCopilot(auth, body) }),
});
