import "server-only";
import type { CheckinAnalysisContext } from "@/server/ai/context/checkin-analysis";
import type { CopilotContext } from "@/server/ai/context/copilot";
import type { OnboardingQuestionsContext } from "@/server/ai/context/onboarding-questions";
import type { ReplyDraftContext } from "@/server/ai/context/reply-draft";
import type { CheckinAnalysisOutput } from "@/server/ai/schemas/checkin-analysis";
import type { CopilotAnswerOutput } from "@/server/ai/schemas/copilot";
import type { OnboardingQuestionsOutput } from "@/server/ai/schemas/onboarding-questions";
import type { ReplyDraftOutput } from "@/server/ai/schemas/reply-draft";
import type { ToolPayload } from "@/server/ai/tools/types";
import { AIProviderError } from "@/server/errors";
import { excerpt, recurringTopics, sensitiveNoteFor, topicRulesMatching } from "./mock-heuristics";
import type { AgentRequest, AIProvider, AIUsage, StructuredRequest } from "./types";

/*
 * PROVIDER MOCK — attivo solo con DEMO_AI_MODE=true.
 *
 * Non chiama nessun modello AI: produce risultati DIMOSTRATIVI e deterministici a partire
 * dai dati reali, con regole semplici. Ogni risultato viene salvato con is_mock = true e
 * mostrato con il badge "Risultato dimostrativo". Serve a presentare il flusso completo
 * (validazione, salvataggio, tool calling, conferma della coach) senza una chiave API.
 */

export const MOCK_MODEL = "mock-deterministic-v1";

/** Piccola attesa per rendere visibili gli stati di caricamento come con un provider reale. */
const SIMULATED_LATENCY_MS = 700;
const NO_USAGE: AIUsage = { inputTokens: null, outputTokens: null, cacheReadTokens: null };
const DEFAULT_FOLLOWUP_DAYS = 2;
const DEFAULT_PREVIOUS_CHECKINS = 2;
const MAX_PREVIOUS_CHECKINS = 6;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// --- Analisi check-in ------------------------------------------------------------

function mockCheckinAnalysis(context: CheckinAnalysisContext): CheckinAnalysisOutput {
  const { current, previous } = context;
  const rules = topicRulesMatching(current);
  const concerning = rules.filter((rule) => rule.concerning);
  const recurring = recurringTopics(current, previous);
  const sensitiveNote = sensitiveNoteFor(current);
  const followUpNeeded = sensitiveNote !== null || concerning.length >= 2;
  const mainConcern = concerning[0]?.topic ?? "andamento della settimana";

  const scores = current.scores
    ? `energia ${current.scores.energy}/5, sonno ${current.scores.sleepQuality}/5, stress ${current.scores.stress}/5`
    : "punteggi non disponibili";
  const training = current.training ? `, allenamenti ${current.training.done} su ${current.training.planned}` : "";
  const history =
    recurring.length > 0
      ? ` Temi già presenti nello storico: ${recurring.map((entry) => `${entry.topic.toLowerCase()} (${entry.refs.length} check-in precedenti)`).join(", ")}.`
      : " Nessun tema ricorrente evidente nello storico fornito.";

  return {
    summary: `Riepilogo dimostrativo: ${scores}${training}.${history}`,
    topics: rules.length > 0 ? rules.map((rule) => rule.topic).slice(0, 6) : ["Andamento generale"],
    followUpNeeded,
    followUpSuggestion: followUpNeeded
      ? {
          title: `Confronto su: ${mainConcern.toLowerCase()}`,
          reason: "Proposta dimostrativa basata sui punteggi e sui testi del check-in: verifica se è davvero utile.",
          dueInDays: DEFAULT_FOLLOWUP_DAYS,
        }
      : null,
    suggestedQuestions: rules.map((rule) => rule.question).slice(0, 3),
    confidence: previous.length >= 2 ? "medium" : "low",
    sensitiveContentNote: sensitiveNote,
  };
}

// --- Bozza di risposta -----------------------------------------------------------

function mockReplyDraft(context: ReplyDraftContext): ReplyDraftOutput {
  const { checkin, clientFirstName } = context;
  const sentences = [`Ciao ${clientFirstName}, grazie per il check-in di questa settimana!`];
  if (checkin.wins) sentences.push(`Mi fa piacere leggere che ${checkin.wins.charAt(0).toLowerCase()}${checkin.wins.slice(1)}`);
  if (checkin.challenges) sentences.push("Ho letto anche le difficoltà che mi hai raccontato: ne parliamo insieme per trovare un passo sostenibile.");
  if (checkin.questionsForCoach) sentences.push("Alla tua domanda rispondo con calma nel prossimo messaggio.");
  sentences.push("Un passo alla volta: sono qui per qualsiasi cosa.");

  const sensitiveNote = sensitiveNoteFor(checkin);
  return {
    draft: sentences.join(" "),
    notesForCoach: [
      "Bozza dimostrativa generata senza modello AI: rileggila e personalizzala.",
      ...(sensitiveNote ? [sensitiveNote] : []),
    ].slice(0, 3),
  };
}

// --- Domande sugli infortuni (questionario di ingresso) ------------------------------

const BODY_AREAS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ginocchi/i, label: "il ginocchio" },
  { pattern: /schiena|lombar|cervical/i, label: "la schiena" },
  { pattern: /spall/i, label: "la spalla" },
  { pattern: /caviglia|piede/i, label: "la caviglia" },
  { pattern: /polso|mano|gomito/i, label: "il braccio" },
];

function mockOnboardingQuestions(context: OnboardingQuestionsContext): OnboardingQuestionsOutput {
  const area = BODY_AREAS.find((candidate) => candidate.pattern.test(context.description))?.label ?? "la zona interessata";
  return {
    questions: [
      `Oggi ${area} ti crea fastidio in qualche movimento o attività quotidiana? Quali?`,
      "Sei seguita o seguito da un professionista sanitario? Hai indicazioni da rispettare negli allenamenti?",
      "C'è altro che vorresti far sapere alla tua coach prima di iniziare?",
    ],
  };
}

// --- Copilot con tool --------------------------------------------------------------

type PlannedCall = { name: string; input: unknown };

/** Sceglie i tool in base a parole chiave: passa dallo STESSO registry usato dal modello reale. */
function planToolCalls(question: string): PlannedCall[] {
  const requestedCount = Number(/ultim[oi]\s+(\d+)/i.exec(question)?.[1] ?? 0);
  const calls: PlannedCall[] = [];

  if (/follow/i.test(question)) {
    calls.push({ name: "get_followups", input: { status: "all", limit: 5 } });
  } else if (/not[ae]\b/i.test(question)) {
    calls.push({ name: "get_coach_notes", input: { limit: 5 } });
  } else if (/già|ricorren|argoment|temi|compars|prima d/i.test(question)) {
    calls.push({ name: "get_latest_checkin", input: {} }, { name: "get_previous_checkins", input: { limit: MAX_PREVIOUS_CHECKINS } });
  } else {
    const previous = Math.min(Math.max((requestedCount || DEFAULT_PREVIOUS_CHECKINS + 1) - 1, 1), MAX_PREVIOUS_CHECKINS);
    calls.push({ name: "get_latest_checkin", input: {} }, { name: "get_previous_checkins", input: { limit: previous } });
  }

  if (/propon|crea(re)? un follow|serve un follow/i.test(question)) {
    calls.push({
      name: "propose_followup",
      input: { title: "Chiamata di aggiornamento", reason: "Proposta dimostrativa richiesta dalla coach.", dueInDays: DEFAULT_FOLLOWUP_DAYS },
    });
  }
  return calls;
}

function composeCopilotAnswer(context: CopilotContext, payloads: ToolPayload[]): CopilotAnswerOutput {
  const lines = ["Risposta dimostrativa (modalità demo, nessun modello AI coinvolto)."];
  const sources: string[] = [];
  const checkins = payloads.flatMap((payload) => {
    if (payload.tool === "get_latest_checkin") return payload.checkin ? [payload.checkin] : [];
    if (payload.tool === "get_previous_checkins") return payload.checkins;
    return [];
  });

  if (checkins.length > 0) {
    lines.push(`Check-in di ${context.client.firstName} considerati:`);
    for (const checkin of checkins) {
      sources.push(checkin.ref);
      const scores = checkin.scores ? `energia ${checkin.scores.energy}, sonno ${checkin.scores.sleepQuality}, stress ${checkin.scores.stress}` : "punteggi n/d";
      lines.push(`• ${checkin.submittedOn} (${checkin.ref}): ${scores}${checkin.challenges ? ` — “${excerpt(checkin.challenges)}”` : ""}`);
    }
    const [latest, ...previous] = checkins;
    const recurring = latest ? recurringTopics(latest, previous) : [];
    if (recurring.length > 0) {
      lines.push(...recurring.map((entry) => `Il tema “${entry.topic}” compare anche in ${entry.refs.join(", ")}.`));
    }
  }

  for (const payload of payloads) {
    if (payload.tool === "get_followups") {
      if (payload.followups.length === 0) lines.push("Non risultano follow-up per questa cliente.");
      for (const followup of payload.followups) {
        sources.push(followup.ref);
        lines.push(`• ${followup.title} (${followup.ref}): ${followup.status}, scadenza ${followup.dueOn}${followup.completedOn ? `, completato il ${followup.completedOn}` : ""}`);
      }
    }
    if (payload.tool === "get_coach_notes") {
      if (payload.notes.length === 0) lines.push("Non ci sono note per questa cliente.");
      for (const note of payload.notes) {
        sources.push(note.ref);
        lines.push(`• Nota del ${note.writtenOn} (${note.ref}): “${excerpt(note.text)}”`);
      }
    }
    if (payload.tool === "propose_followup" && payload.recorded) {
      lines.push("Ho preparato una proposta di follow-up: la trovi qui sotto, decidi tu se crearla.");
    }
  }

  return {
    answer: lines.join("\n"),
    sources,
    dataLimitations: sources.length === 0 ? "Nessun dato pertinente trovato per questa domanda." : null,
  };
}

// --- Provider ------------------------------------------------------------------------

export function createMockProvider(): AIProvider {
  return {
    info: { provider: "mock", model: MOCK_MODEL, isMock: true },

    async generateStructured(request: StructuredRequest) {
      await wait(SIMULATED_LATENCY_MS);
      switch (request.purpose) {
        case "checkin_analysis":
          return { output: mockCheckinAnalysis(request.context), usage: NO_USAGE };
        case "reply_draft":
          return { output: mockReplyDraft(request.context), usage: NO_USAGE };
        case "onboarding_questions":
          return { output: mockOnboardingQuestions(request.context), usage: NO_USAGE };
        // La Prova FESPA è una conversazione reale con i visitatori: niente risposte simulate.
        case "public_trial_reply":
        case "public_trial_summary":
          throw new AIProviderError("demo_unsupported");
      }
    },

    async runAgent(request: AgentRequest) {
      await wait(SIMULATED_LATENCY_MS);
      const calls = planToolCalls(request.context.question).slice(0, request.maxSteps);
      const payloads: ToolPayload[] = [];
      for (const call of calls) {
        const result = await request.executeTool(call.name, call.input);
        if (!result.isError) payloads.push(result.payload);
      }
      return { output: composeCopilotAnswer(request.context, payloads), usage: NO_USAGE, steps: calls.length + 1 };
    },

    // Coach AI deve capire richieste libere e scegliere i tool: simularlo con regole fisse
    // sarebbe un finto chatbot. In modalità dimostrativa l'agente lo dichiara e non risponde.
    async streamAgent() {
      throw new AIProviderError("demo_unsupported");
    },
  };
}
