import "server-only";
import type { CheckinSummary } from "@/server/ai/context/summaries";

/*
 * Regole volutamente semplici usate SOLO dal provider mock (DEMO_AI_MODE).
 * Non sono "intelligenza": servono a produrre risultati dimostrativi coerenti con i dati,
 * sempre marcati come mock nell'interfaccia e nel database.
 */

const LOW_SCORE = 2;
const HIGH_STRESS = 4;
const GOOD_ENERGY = 4;
/** Valore neutro per scale assenti (check-in con formato non riconosciuto). */
const CHECK_OK = 3;

function textOf(summary: CheckinSummary): string {
  return [summary.wins, summary.challenges, summary.questionsForCoach].filter(Boolean).join(" ");
}

type TopicRule = {
  topic: string;
  concerning: boolean;
  matches: (summary: CheckinSummary) => boolean;
  question: string;
};

const TOPIC_RULES: TopicRule[] = [
  {
    topic: "Sonno",
    concerning: true,
    matches: (s) => (s.scores?.sleepQuality ?? CHECK_OK) <= LOW_SCORE || /dorm|sonno|svegli/i.test(textOf(s)),
    question: "Cosa sta influenzando il tuo sonno in questo periodo?",
  },
  {
    topic: "Stress",
    concerning: true,
    matches: (s) => (s.scores?.stress ?? 1) >= HIGH_STRESS || /stress|ansia|pressione|scadenz/i.test(textOf(s)),
    question: "Quali momenti della settimana senti più pesanti?",
  },
  {
    topic: "Costanza negli allenamenti",
    concerning: true,
    matches: (s) => (s.training ? s.training.done < s.training.planned : false),
    question: "Cosa ti ha impedito di completare gli allenamenti previsti?",
  },
  {
    topic: "Rapporto con i pasti",
    concerning: true,
    matches: (s) => (s.scores?.nutritionAdherence ?? CHECK_OK) <= LOW_SCORE || /pasti|mangi|cibo|cena|colazione/i.test(textOf(s)),
    question: "Come ti sei sentita rispetto ai pasti questa settimana?",
  },
  {
    topic: "Fastidio fisico",
    concerning: true,
    matches: (s) => /dolore|fastidio|ginocchi|schiena|infortun/i.test(textOf(s)),
    question: "Il fastidio è ancora presente? Ti limita nei movimenti di tutti i giorni?",
  },
  {
    topic: "Progressi",
    concerning: false,
    matches: (s) => (s.scores?.energy ?? 0) >= GOOD_ENERGY || /record|miglior|complet|prima|finalmente/i.test(textOf(s)),
    question: "Cosa ti ha aiutata di più a ottenere questo risultato?",
  },
];

const SENSITIVE_RULES: Array<{ pattern: RegExp; note: string }> = [
  {
    pattern: /salto i pasti|in colpa|abbuffat|non mangio/i,
    note: "Nel testo compaiono riferimenti al rapporto con il cibo e a sensi di colpa. Evita conclusioni e valuta con la cliente l'opportunità di un confronto con un professionista (es. psicologo o nutrizionista).",
  },
  {
    pattern: /dolore|fastidio al|infortun|ginocchi|schiena/i,
    note: "Il check-in riporta un fastidio fisico di cui non è possibile valutare la natura dai dati. Se persiste, valuta di suggerire una verifica con un medico o un fisioterapista.",
  },
  {
    pattern: /ansia|panico|non ce la faccio/i,
    note: "Emergono segnali di forte stress o malessere emotivo. Valuta con delicatezza se suggerire il supporto di un professionista.",
  },
];

export function topicRulesMatching(summary: CheckinSummary): TopicRule[] {
  return TOPIC_RULES.filter((rule) => rule.matches(summary));
}

export function sensitiveNoteFor(summary: CheckinSummary): string | null {
  const text = textOf(summary);
  return SENSITIVE_RULES.find((rule) => rule.pattern.test(text))?.note ?? null;
}

/** Temi del check-in corrente già presenti nello storico, con i riferimenti ai check-in in cui compaiono. */
export function recurringTopics(current: CheckinSummary, previous: CheckinSummary[]): Array<{ topic: string; refs: string[] }> {
  return topicRulesMatching(current)
    .filter((rule) => rule.concerning)
    .map((rule) => ({ topic: rule.topic, refs: previous.filter((summary) => rule.matches(summary)).map((summary) => summary.ref) }))
    .filter((entry) => entry.refs.length > 0);
}

export function excerpt(text: string | null, maxLength = 110): string | null {
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
