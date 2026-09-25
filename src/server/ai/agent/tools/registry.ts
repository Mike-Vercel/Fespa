import "server-only";
import type { CoachRole } from "@/types/domain";
import { toolsForRole } from "../policy";
import { createAutomationTool, getAutomationsTool, setAutomationEnabledTool } from "./automations";
import { getClientCheckinsTool, getPendingCheckinsTool, markCheckinReviewedTool, prepareCheckinReplyTool, sendCheckinReplyTool } from "./checkins";
import {
  archiveClientTool,
  getAttentionListTool,
  getClientOverviewTool,
  getClientTimelineTool,
  restoreClientTool,
  searchClientsTool,
} from "./clients";
import { askClarificationTool, presentActionTool } from "./conversation";
import type { AgentActionTool, AgentTool } from "./define";
import { changeFollowupStatusTool, createFollowupTool, getFollowupsTool, updateFollowupTool } from "./followups";
import { createCoachNoteTool, deleteCoachNoteTool, getClientNotesTool, updateCoachNoteTool } from "./notes";
import { changeUserRoleTool, getRegistrationsTool, reviewRegistrationTool, searchUsersTool } from "./users";

/**
 * REGISTRY dei tool di Coach AI. È l'unico elenco di ciò che l'agente può fare:
 * un nome che non è qui non esiste, anche se il modello lo "inventa".
 *
 * Rischio → conferma (vedi policy.ts):
 *   read / draft          → automatici
 *   write                 → conferma
 *   high_risk             → conferma esplicita
 *   destructive           → conferma rafforzata
 */
export const AGENT_TOOLS: readonly AgentTool[] = [
  // Lettura
  searchClientsTool,
  getClientOverviewTool,
  getClientTimelineTool,
  getAttentionListTool,
  getPendingCheckinsTool,
  getClientCheckinsTool,
  getFollowupsTool,
  getClientNotesTool,
  getAutomationsTool,
  searchUsersTool,
  getRegistrationsTool,
  // Bozze e conversazione
  prepareCheckinReplyTool,
  askClarificationTool,
  presentActionTool,
  // Scrittura (con conferma)
  sendCheckinReplyTool,
  markCheckinReviewedTool,
  createFollowupTool,
  updateFollowupTool,
  changeFollowupStatusTool,
  createCoachNoteTool,
  updateCoachNoteTool,
  createAutomationTool,
  setAutomationEnabledTool,
  restoreClientTool,
  // Alto rischio (conferma esplicita)
  changeUserRoleTool,
  reviewRegistrationTool,
  // Distruttive (conferma rafforzata)
  archiveClientTool,
  deleteCoachNoteTool,
];

const TOOLS_BY_NAME = new Map(AGENT_TOOLS.map((tool) => [tool.name, tool]));

export function findAgentTool(name: string): AgentTool | undefined {
  return TOOLS_BY_NAME.get(name);
}

/** Tool di scrittura per nome (per confermare o modificare una richiesta salvata). */
export function findActionTool(name: string): AgentActionTool | undefined {
  const tool = TOOLS_BY_NAME.get(name);
  return tool?.kind === "action" ? tool : undefined;
}

/** Tool esposti al modello per il ruolo dell'utente. */
export function agentToolsFor(role: CoachRole): AgentTool[] {
  return toolsForRole(role, AGENT_TOOLS);
}
