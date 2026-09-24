/**
 * Dati dimostrativi di FESPA Coach AI.
 *
 * Persone, nomi e storie sono INVENTATI. Le date sono relative al momento del seed
 * ("3 giorni fa", "tra 2 giorni"), così la demo mostra sempre qualcosa di attuale:
 * check-in da revisionare, follow-up scaduti, di oggi e in arrivo.
 *
 * Alcuni contenuti sono scelti apposta per la demo dell'AI:
 *  - Sara: difficoltà di sonno ricorrente (domande al Copilot sullo storico);
 *  - Alessia e Beatrice: temi sensibili (l'AI deve evitare conclusioni cliniche).
 *
 * Area clienti:
 *  - Sara ha un account attivo, con questionario di ingresso e un vecchio infortunio;
 *  - Francesca è stata invitata da Giulia ma non si è ancora registrata;
 *  - Nadia e Camilla si sono iscritte da sole e aspettano l'approvazione dell'admin;
 *  - Serena si è iscritta ma la richiesta è stata rifiutata.
 */

import type { DbEnum } from "../src/server/db/database.types";
import type { CheckinAnswers } from "../src/validation/checkin";

type Scores = { energy: number; sleep: number; stress: number; nutrition: number };

export type DemoCheckin = {
  daysAgo: number;
  /** Ora locale di invio (default 19). */
  hour?: number;
  reviewed: boolean;
  reply?: string;
  answers: Omit<CheckinAnswers, "version">;
};

export type DemoNote = { daysAgo: number; content: string };

export type DemoFollowup = {
  title: string;
  description?: string;
  /** Negativo = nel passato. */
  dueInDays: number;
  status: DbEnum<"followup_status">;
};

/** Dati del questionario di ingresso compilato dalla cliente. */
export type DemoProfile = {
  phone: string | null;
  birthDate: string;
  experienceLevel: DbEnum<"experience_level">;
  weeklyAvailability: number;
  preferredContact: DbEnum<"contact_channel">;
  notesForCoach: string | null;
};

/** Infortuni e traumi. `answers` segue l'ordine delle domande standard di approfondimento. */
export type DemoHealth = { hasInjuries: boolean; description: string | null; answers: string[] };

/** Accesso all'area clienti: account attivo (questionario compilato) oppure solo invito inviato. */
export type DemoPortalAccess =
  | { kind: "account"; emailLocalPart: string; profile: DemoProfile; health: DemoHealth | null }
  | { kind: "invited"; emailLocalPart: string };

export type DemoClient = {
  fullName: string;
  status: DbEnum<"client_status">;
  goal: string;
  startedDaysAgo: number;
  checkins: DemoCheckin[];
  notes: DemoNote[];
  followups: DemoFollowup[];
  portal?: DemoPortalAccess;
};

/** Auto-iscrizione dall'area clienti, non ancora assegnata a una coach. */
export type DemoRegistration = {
  fullName: string;
  emailLocalPart: string;
  goal: string;
  status: "pending" | "rejected";
  registeredDaysAgo: number;
  profile: DemoProfile;
  health: DemoHealth | null;
};

export type DemoCoach = {
  fullName: string;
  emailLocalPart: string;
  clients: DemoClient[];
};

function answers(
  scores: Scores,
  sessions: [done: number, planned: number],
  wins: string,
  challenges: string,
  questionsForCoach: string | null = null,
): Omit<CheckinAnswers, "version"> {
  return {
    energy: scores.energy,
    sleepQuality: scores.sleep,
    stress: scores.stress,
    nutritionAdherence: scores.nutrition,
    trainingSessionsDone: sessions[0],
    trainingSessionsPlanned: sessions[1],
    wins,
    challenges,
    questionsForCoach,
  };
}

const giuliaClients: DemoClient[] = [
  {
    fullName: "Sara Bellini",
    status: "active",
    goal: "ritrovare costanza negli allenamenti e gestire meglio lo stress del lavoro",
    startedDaysAgo: 150,
    portal: {
      kind: "account",
      emailLocalPart: "sara.bellini",
      profile: {
        phone: "+39 300 000 0001",
        birthDate: "1989-04-17",
        experienceLevel: "intermediate",
        weeklyAvailability: 3,
        preferredContact: "whatsapp",
        notesForCoach: "Lavoro in ufficio con scadenze a fine mese: in quelle settimane faccio fatica a rispettare il piano.",
      },
      health: {
        hasInjuries: true,
        description: "Distorsione alla caviglia destra due anni fa, giocando a pallavolo.",
        answers: [
          "Nella vita di tutti i giorni no. Dopo le corse più lunghe a volte sento la caviglia un po' rigida.",
          "Ho fatto due mesi di fisioterapia, ora non sono più seguita.",
          "",
        ],
      },
    },
    checkins: [
      {
        daysAgo: 1,
        reviewed: false,
        answers: answers(
          { energy: 2, sleep: 2, stress: 4, nutrition: 3 },
          [2, 4],
          "Sono riuscita a fare due allenamenti nonostante la settimana piena e ho preparato i pranzi per l'ufficio.",
          "Dormo male da qualche notte: mi addormento tardi pensando al lavoro e la mattina sono stanchissima. Ho saltato due allenamenti per questo.",
          "Ha senso spostare gli allenamenti alla sera o rischio di dormire ancora peggio?",
        ),
      },
      {
        daysAgo: 8,
        reviewed: true,
        reply:
          "Ottima settimana Sara! Il giovedì resta il giorno più pesante: proviamo a tenere l'allenamento corto (30 minuti) e a spostare quello lungo al sabato.",
        answers: answers(
          { energy: 3, sleep: 3, stress: 3, nutrition: 4 },
          [3, 4],
          "Settimana più tranquilla, ho rispettato quasi tutti i pasti.",
          "Il giovedì è sempre il giorno più difficile: riunioni fino a tardi e poca voglia di allenarmi.",
        ),
      },
      {
        daysAgo: 15,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 4, stress: 2, nutrition: 4 },
          [4, 4],
          "Ho completato tutti gli allenamenti e mi sento più forte negli squat.",
          "Niente di particolare, solo un po' di fatica nel weekend.",
        ),
      },
      {
        daysAgo: 22,
        reviewed: true,
        answers: answers(
          { energy: 2, sleep: 2, stress: 4, nutrition: 3 },
          [2, 4],
          "Domenica ho fatto una camminata lunga e mi ha fatto bene.",
          "Periodo di chiusura di un progetto: dormo poco e mi sveglio spesso durante la notte.",
        ),
      },
      {
        daysAgo: 29,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 3, stress: 3, nutrition: 3 },
          [3, 4],
          "Ho provato la nuova scheda e mi è piaciuta molto.",
          "Faccio fatica con la colazione: esco di casa sempre di corsa.",
        ),
      },
      {
        daysAgo: 36,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 4, stress: 2, nutrition: 4 },
          [4, 4],
          "Prima settimana completa da quando ho iniziato!",
          "Un po' di indolenzimento dopo il primo allenamento, poi è passato.",
        ),
      },
      {
        daysAgo: 43,
        reviewed: true,
        answers: answers(
          { energy: 2, sleep: 2, stress: 4, nutrition: 2 },
          [1, 3],
          "Almeno sono riuscita a camminare in pausa pranzo.",
          "Ho dormito pochissimo per l'ansia prima di una presentazione importante: zero energie per allenarmi.",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 44,
        content:
          "Lavora come project manager: i periodi di consegna coincidono con i cali di energia e di sonno. Tenerne conto quando pianifichiamo le settimane.",
      },
      {
        daysAgo: 10,
        content: "Preferisce essere contattata su WhatsApp dopo le 18. Molto motivata quando vede progressi concreti sui carichi.",
      },
    ],
    followups: [
      {
        title: "Chiamata di aggiornamento sul sonno",
        description: "Capire se il calo di sonno è di nuovo legato alle scadenze di lavoro e come adattare la settimana.",
        dueInDays: -3,
        status: "pending",
      },
      { title: "Revisione della scheda di allenamento", dueInDays: -20, status: "completed" },
    ],
  },
  {
    fullName: "Chiara Monti",
    status: "active",
    goal: "preparare la prima gara di 10 km",
    startedDaysAgo: 95,
    checkins: [
      {
        daysAgo: 3,
        hour: 9,
        reviewed: false,
        answers: answers(
          { energy: 4, sleep: 4, stress: 2, nutrition: 4 },
          [4, 4],
          "Ho corso la mia prima 10 km in 58 minuti! Non mi sono mai sentita così bene.",
          "Il giorno dopo la gara avevo le gambe molto rigide.",
          "Come gestisco la settimana dopo la gara: riposo totale o allenamenti leggeri?",
        ),
      },
      {
        daysAgo: 10,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 3, stress: 3, nutrition: 4 },
          [3, 3],
          "Ultimo lungo prima della gara completato senza problemi.",
          "Un po' di agitazione per la gara, ma niente di preoccupante.",
        ),
      },
      {
        daysAgo: 17,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 4, stress: 2, nutrition: 5 },
          [4, 4],
          "Ho migliorato il passo medio nelle ripetute.",
          "Fatico a svegliarmi presto per correre prima del lavoro.",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 20,
        content: "Obiettivo 10 km quasi raggiunto: dopo la gara ridefinire insieme il prossimo traguardo per non perdere la motivazione.",
      },
    ],
    followups: [
      {
        title: "Messaggio dopo la gara",
        description: "Complimentarsi per la 10 km e fissare una call per il prossimo obiettivo.",
        dueInDays: 0,
        status: "pending",
      },
    ],
  },
  {
    fullName: "Elena Rinaldi",
    status: "active",
    goal: "tornare ad allenarsi con regolarità dopo la seconda gravidanza",
    startedDaysAgo: 120,
    checkins: [
      {
        daysAgo: 18,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 2, stress: 3, nutrition: 3 },
          [2, 3],
          "Ho mantenuto le camminate con il passeggino.",
          "Settimana con i bambini malati: pochissimo tempo per me.",
        ),
      },
      {
        daysAgo: 25,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 3, stress: 3, nutrition: 4 },
          [3, 3],
          "Tre allenamenti su tre, finalmente!",
          "Organizzarmi con gli orari dell'asilo non è semplice.",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 17,
        content: "Ha avvisato che nelle prossime settimane potrebbe saltare qualche check-in per impegni familiari.",
      },
    ],
    followups: [
      {
        title: "Ricontattare Elena",
        description: "Nessun check-in da oltre due settimane: sentire come sta e se serve alleggerire il piano.",
        dueInDays: 2,
        status: "pending",
      },
    ],
  },
  {
    fullName: "Francesca Galli",
    status: "onboarding",
    portal: { kind: "invited", emailLocalPart: "francesca.galli" },
    goal: "impostare una routine di tre allenamenti a settimana",
    startedDaysAgo: 10,
    checkins: [
      {
        daysAgo: 2,
        hour: 21,
        reviewed: false,
        answers: answers(
          { energy: 3, sleep: 3, stress: 3, nutrition: 3 },
          [2, 3],
          "Ho fatto i primi due allenamenti della scheda base e ho capito come funziona.",
          "Non so bene quanto peso usare negli esercizi, ho paura di sbagliare la tecnica.",
          "Mi puoi mandare un video per la tecnica dello stacco?",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 9,
        content: "Prima esperienza in palestra: servono indicazioni molto pratiche e rassicurazioni sulla tecnica.",
      },
    ],
    followups: [
      {
        title: "Call di onboarding sulla tecnica di base",
        description: "Rivedere insieme stacco e squat a corpo libero.",
        dueInDays: 1,
        status: "pending",
      },
    ],
  },
  {
    fullName: "Valentina Serra",
    status: "paused",
    goal: "migliorare la postura e la mobilità della schiena",
    startedDaysAgo: 200,
    checkins: [
      {
        daysAgo: 40,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 3, stress: 4, nutrition: 3 },
          [1, 3],
          "Sono riuscita a fare gli esercizi di mobilità quasi tutte le mattine.",
          "Trasloco in corso: settimane molto caotiche.",
        ),
      },
      {
        daysAgo: 47,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 4, stress: 2, nutrition: 4 },
          [3, 3],
          "La schiena va molto meglio, riesco a stare seduta più a lungo.",
          "Nessuna difficoltà particolare.",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 38,
        content: "Percorso in pausa per trasferimento di lavoro a Torino. Da ricontattare a trasloco concluso.",
      },
    ],
    followups: [
      {
        title: "Verificare la ripresa del percorso",
        description: "Sentire Valentina a trasferimento concluso.",
        dueInDays: 12,
        status: "pending",
      },
    ],
  },
  {
    fullName: "Alessia Fontana",
    status: "active",
    goal: "costruire un rapporto più sereno con l'allenamento e le abitudini quotidiane",
    startedDaysAgo: 60,
    checkins: [
      {
        daysAgo: 2,
        hour: 22,
        reviewed: false,
        answers: answers(
          { energy: 2, sleep: 3, stress: 4, nutrition: 2 },
          [2, 4],
          "Sono riuscita ad andare in palestra due volte nonostante tutto.",
          "Quando sono sotto pressione salto i pasti e poi la sera mangio tantissimo, e mi sento in colpa per giorni.",
          "C'è un modo per non sentirmi così?",
        ),
      },
      {
        daysAgo: 9,
        reviewed: true,
        reply:
          "Brava Alessia, ottima costanza in settimana! Nel weekend non serve la perfezione: proviamo solo a tenere fisso l'orario del pranzo.",
        answers: answers(
          { energy: 3, sleep: 3, stress: 3, nutrition: 3 },
          [3, 4],
          "Ho seguito il programma quasi tutti i giorni.",
          "Nel weekend fatico a rispettare gli orari dei pasti.",
        ),
      },
      {
        daysAgo: 16,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 4, stress: 3, nutrition: 4 },
          [3, 3],
          "Mi sono divertita molto nella lezione di gruppo.",
          "Mi confronto spesso con le altre persone in sala e mi sento indietro.",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 8,
        content:
          "Tende a essere molto severa con se stessa quando non rispetta il programma: mantenere sempre un tono incoraggiante nelle risposte.",
      },
    ],
    followups: [
      {
        title: "Chiamata di confronto",
        description: "Parlare di come si sente in questo periodo e valutare insieme se coinvolgere una figura professionale.",
        dueInDays: 2,
        status: "pending",
      },
    ],
  },
  {
    fullName: "Martina De Luca",
    status: "active",
    goal: "aumentare la forza nei fondamentali",
    startedDaysAgo: 80,
    checkins: [
      {
        daysAgo: 4,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 4, stress: 2, nutrition: 4 },
          [3, 3],
          "Tutto secondo il piano: ho aumentato il carico nella panca.",
          "Nessuna difficoltà particolare questa settimana.",
        ),
      },
      {
        daysAgo: 11,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 3, stress: 2, nutrition: 4 },
          [3, 3],
          "Nuovo record personale nello stacco.",
          "Un po' di stanchezza il venerdì.",
        ),
      },
    ],
    notes: [],
    followups: [
      {
        title: "Aggiornare la scheda di allenamento",
        description: "Progressi costanti: preparare la nuova scheda per il prossimo mese.",
        dueInDays: 6,
        status: "pending",
      },
    ],
  },
  {
    fullName: "Irene Moretti",
    status: "completed",
    goal: "perdere l'abitudine alla sedentarietà dopo il cambio di lavoro",
    startedDaysAgo: 240,
    checkins: [
      {
        daysAgo: 35,
        reviewed: true,
        reply: "Complimenti Irene, hai costruito abitudini solide: sono davvero felice del percorso che hai fatto.",
        answers: answers(
          { energy: 5, sleep: 4, stress: 2, nutrition: 4 },
          [4, 4],
          "Ultima settimana del percorso: mi sento molto più energica rispetto all'inizio.",
          "Un po' di timore di perdere le abitudini senza i check-in settimanali.",
        ),
      },
    ],
    notes: [
      {
        daysAgo: 30,
        content: "Percorso concluso con obiettivo raggiunto. Disponibile a essere ricontattata tra tre mesi per un eventuale mantenimento.",
      },
    ],
    followups: [{ title: "Call di chiusura del percorso", dueInDays: -31, status: "completed" }],
  },
  {
    fullName: "Laura Pellegrini",
    status: "active",
    goal: "allenarsi con continuità nonostante i turni di lavoro",
    startedDaysAgo: 45,
    checkins: [
      {
        daysAgo: 0,
        hour: 7,
        reviewed: false,
        answers: answers(
          { energy: 4, sleep: 3, stress: 3, nutrition: 4 },
          [2, 3],
          "Ho trovato un'ora libera al mattino per allenarmi prima del turno.",
          "Questa settimana ho poco tempo e la palestra è lontana dall'ospedale.",
          "Posso sostituire una corsa con un'uscita in bici?",
        ),
      },
      {
        daysAgo: 7,
        reviewed: true,
        answers: answers(
          { energy: 3, sleep: 2, stress: 4, nutrition: 3 },
          [2, 3],
          "Sono riuscita a mantenere due allenamenti anche con i turni di notte.",
          "Dopo i turni di notte fatico a recuperare.",
        ),
      },
    ],
    notes: [
      { daysAgo: 30, content: "Infermiera su turni: pianificare la settimana solo dopo aver visto il calendario dei turni." },
    ],
    followups: [{ title: "Chiamata di metà percorso", dueInDays: -5, status: "cancelled" }],
  },
  {
    fullName: "Beatrice Costa",
    status: "active",
    goal: "rinforzare gambe e core per tornare a sciare",
    startedDaysAgo: 70,
    checkins: [
      {
        daysAgo: 6,
        reviewed: true,
        reply:
          "Hai fatto bene a fermarti. Se il fastidio continua, è meglio sentire un fisioterapista prima di riprendere gli squat: nel frattempo lavoriamo sulla parte alta.",
        answers: answers(
          { energy: 3, sleep: 4, stress: 3, nutrition: 4 },
          [2, 3],
          "Ho mantenuto la routine del mattino con gli esercizi per il core.",
          "Ho sentito un fastidio al ginocchio destro dopo gli squat: per ora ho evitato gli esercizi per le gambe.",
        ),
      },
      {
        daysAgo: 13,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 4, stress: 2, nutrition: 4 },
          [3, 3],
          "Settimana piena, tutti gli allenamenti completati.",
          "Nessuna difficoltà.",
        ),
      },
    ],
    notes: [],
    followups: [
      {
        title: "Verificare il fastidio al ginocchio",
        description: "Chiedere se è passato e se ha sentito il fisioterapista.",
        dueInDays: 0,
        status: "pending",
      },
    ],
  },
];

const martaClients: DemoClient[] = [
  {
    fullName: "Giorgia Marchetti",
    status: "active",
    goal: "ritrovare energia con un'attività costante",
    startedDaysAgo: 30,
    checkins: [
      {
        daysAgo: 5,
        reviewed: false,
        answers: answers(
          { energy: 3, sleep: 3, stress: 3, nutrition: 3 },
          [2, 3],
          "Ho iniziato a camminare ogni sera dopo cena.",
          "Mi annoio facilmente con gli esercizi a casa.",
        ),
      },
    ],
    notes: [],
    followups: [{ title: "Primo confronto telefonico", dueInDays: 0, status: "pending" }],
  },
  {
    fullName: "Silvia Ferraro",
    status: "active",
    goal: "preparare un trekking in montagna",
    startedDaysAgo: 60,
    checkins: [
      {
        daysAgo: 3,
        reviewed: true,
        answers: answers(
          { energy: 4, sleep: 4, stress: 2, nutrition: 4 },
          [3, 3],
          "Ho fatto la prima uscita con lo zaino carico.",
          "Un po' di fatica in discesa.",
        ),
      },
    ],
    notes: [],
    followups: [],
  },
  {
    fullName: "Noemi Barbieri",
    status: "onboarding",
    goal: "imparare le basi dell'allenamento con i pesi",
    startedDaysAgo: 5,
    checkins: [],
    notes: [],
    followups: [],
  },
];

export const DEMO_REGISTRATIONS: DemoRegistration[] = [
  {
    fullName: "Nadia Ferri",
    emailLocalPart: "nadia.ferri",
    goal: "Tornare a correre con gradualità dopo l'operazione al ginocchio",
    status: "pending",
    registeredDaysAgo: 1,
    profile: {
      phone: null,
      birthDate: "1994-09-02",
      experienceLevel: "beginner",
      weeklyAvailability: 3,
      preferredContact: "email",
      notesForCoach: null,
    },
    health: {
      hasInjuries: true,
      description: "Intervento al menisco del ginocchio sinistro l'anno scorso.",
      answers: [
        "Scendere le scale e piegarmi del tutto mi danno ancora fastidio.",
        "Ho finito la fisioterapia; l'ortopedico mi ha detto di evitare i salti ancora per qualche mese.",
        "Ho un po' paura di farmi male di nuovo: preferisco partire piano.",
      ],
    },
  },
  {
    fullName: "Camilla Neri",
    emailLocalPart: "camilla.neri",
    goal: "Muovermi di più: passo tutta la giornata alla scrivania",
    status: "pending",
    registeredDaysAgo: 3,
    profile: {
      phone: "+39 300 000 0002",
      birthDate: "1998-01-23",
      experienceLevel: "beginner",
      weeklyAvailability: 2,
      preferredContact: "whatsapp",
      notesForCoach: "Posso allenarmi solo la sera dopo le 19.",
    },
    health: { hasInjuries: false, description: null, answers: [] },
  },
  {
    fullName: "Serena Villa",
    emailLocalPart: "serena.villa",
    goal: "Tonificare in vista dell'estate",
    status: "rejected",
    registeredDaysAgo: 12,
    profile: {
      phone: null,
      birthDate: "1992-06-30",
      experienceLevel: "intermediate",
      weeklyAvailability: 4,
      preferredContact: "email",
      notesForCoach: null,
    },
    health: null,
  },
];

/** Staff oltre alle coach: il super admin gestisce anche i ruoli, l'amministrazione no. */
export const DEMO_MANAGERS = [
  { fullName: "Admin FESPA", emailLocalPart: "admin", role: "super_admin", description: "super admin: tutto, compresi i ruoli" },
  { fullName: "Segreteria FESPA", emailLocalPart: "segreteria", role: "admin", description: "amministrazione: iscrizioni e clienti" },
] as const;

export const DEMO_COACHES: DemoCoach[] = [
  { fullName: "Giulia Ferrante", emailLocalPart: "giulia.ferrante", clients: giuliaClients },
  { fullName: "Marta Colombo", emailLocalPart: "marta.colombo", clients: martaClients },
];
