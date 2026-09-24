import "server-only";
import { followupSuggestionSchema } from "@/server/ai/schemas/checkin-analysis";
import { defineProposalTool } from "./types";

/** Una conversazione non deve trasformarsi in una raffica di proposte. */
const MAX_PROPOSALS_PER_REQUEST = 1;

export const proposeFollowupTool = defineProposalTool({
  name: "propose_followup",
  description:
    "Propone alla coach di creare un follow-up. NON crea nulla: la proposta viene mostrata alla coach, che può ignorarla o confermarla dopo averla modificata.",
  inputSchema: followupSuggestionSchema,
  propose: (input, context) => {
    if (context.proposals.length >= MAX_PROPOSALS_PER_REQUEST) {
      return { tool: "propose_followup", recorded: false, message: "È già stata registrata una proposta: non ne servono altre." };
    }
    context.proposals.push(input);
    return {
      tool: "propose_followup",
      recorded: true,
      message: "Proposta registrata: verrà mostrata alla coach, che deciderà se creare il follow-up. Non è stato creato nulla.",
    };
  },
});
