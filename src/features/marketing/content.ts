/**
 * Contenuti della home pubblica.
 *
 * Fonte: il sito ufficiale https://www.metodofespa.it (home e "Chi siamo"). Numeri, citazioni,
 * nomi e risposte sono riportati come pubblicati lì: niente dati inventati. Le parti che
 * descrivono l'app (area clienti, check-in, copilota AI) raccontano funzioni reali di questo progetto.
 */

export const OFFICIAL_SITE_URL = "https://www.metodofespa.it";
export const SIGNUP_PATH = "/registrati";
export const LOGIN_PATH = "/login";

export const LANDING_SECTIONS = [
  { id: "metodo", label: "Il metodo" },
  { id: "come-funziona", label: "Come funziona" },
  { id: "app", label: "L'app" },
  { id: "testimonianze", label: "Testimonianze" },
  { id: "domande", label: "Domande" },
] as const;

/** Numeri dichiarati dal sito ufficiale. */
export const PROOF_STATS = [
  { kind: "clients", value: "3.407+", label: "donne in forma" },
  { kind: "reviews", value: "2.140+", label: "recensioni" },
  { kind: "team", value: "50+", label: "collaboratori al tuo fianco" },
] as const;

type PressMention = {
  name: string;
  /** Logo bianco su trasparente (dal sito ufficiale), usato come maschera: il colore lo decide la pagina. */
  logo: string;
  width: number;
  height: number;
  /** Articolo sul Metodo FESPA, solo se verificato. Senza articolo il logo non è un link. */
  article?: { url: string; title: string };
};

/**
 * Testate della sezione "Ne hanno parlato" del sito ufficiale, con i loghi che usa lì.
 * Il sito ufficiale non collega gli articoli: quelli di Donna Moderna e la Repubblica (contenuto sponsorizzato)
 * sono stati verificati, parlano del Metodo FESPA; per le altre testate va aggiunto il link quando lo fornisce FESPA.
 */
export const PRESS_MENTIONS: ReadonlyArray<PressMention> = [
  { name: "La Stampa", logo: "/images/homepage/testate/la-stampa.webp", width: 402, height: 52 },
  {
    name: "la Repubblica",
    logo: "/images/homepage/testate/la-repubblica.webp",
    width: 397,
    height: 85,
    article: {
      url: "https://milano.repubblica.it/native/2024/08/08/news/dimagrire_e_anche_una_questione_di_testa-423436101/",
      title: "Dimagrire è anche una questione «di testa»",
    },
  },
  { name: "ANSA", logo: "/images/homepage/testate/ansa.webp", width: 343, height: 74 },
  { name: "Il Messaggero", logo: "/images/homepage/testate/il-messaggero.webp", width: 390, height: 71 },
  { name: "Corriere dello Sport", logo: "/images/homepage/testate/corriere-dello-sport.webp", width: 407, height: 75 },
  {
    name: "Donna Moderna",
    logo: "/images/homepage/testate/donna-moderna.webp",
    width: 312,
    height: 115,
    article: {
      url: "https://www.donnamoderna.com/benessere/alimentazione/basta-avere-metodo-e-dimagrire-in-modo-sano-naturale-e-duraturo-si-puo",
      title: "Il metodo alimentare per dimagrire in modo sano e duraturo",
    },
  },
];

export const WITHOUT_LIST = [
  { title: "Senza diete restrittive", description: "Impari a mangiare in modo equilibrato, senza sensi di colpa." },
  { title: "Senza eliminare i carboidrati", description: "Un'alimentazione varia e flessibile, adatta alla tua quotidianità." },
  { title: "Senza preparare pasti diversi per la famiglia", description: "Soluzioni pratiche per tutta la famiglia." },
  { title: "Senza ore di palestra", description: "Risultati concreti anche con poco tempo, nel rispetto della tua vita." },
] as const;

/** I tre principi del metodo, dalla pagina "Chi siamo". */
export const METHOD_PILLARS = [
  {
    title: "Ri-educazione, non dieta",
    description: "Niente piani rigidi da seguire alla lettera: impari a mangiare in modo equilibrato, per sempre.",
  },
  {
    title: "Supporto personalizzato",
    description: "Un percorso adattato alla tua vita reale, con una coach che ti segue passo dopo passo.",
  },
  {
    title: "Mente e corpo insieme",
    description: "Si lavora sul rapporto con il cibo e con il tuo corpo, con amore e rispetto per te stessa.",
  },
] as const;

/**
 * Il percorso, come funziona davvero in questa app: registrazione → consulenza → attivazione → check-in.
 * visual: illustrazione della sezione "Come funziona" (public/images/homepage/section_2, WebP dai PNG originali).
 */
export const JOURNEY_STEPS = [
  {
    title: "Registrati gratis",
    description:
      "Crea il tuo account e raccontaci di te: obiettivo, abitudini, giorni disponibili ed eventuali infortuni. Bastano tre minuti.",
    visual: { src: "/images/homepage/section_2/card_1.webp", width: 1312, height: 1199 },
  },
  {
    title: "Consulenza gratuita",
    description:
      "Ti contattiamo per capire insieme il percorso più adatto a te. Il costo dipende dalle tue esigenze: prima ne parliamo, poi decidi tu.",
    visual: { src: "/images/homepage/section_2/card_2.webp", width: 1536, height: 1024 },
  },
  {
    title: "La tua coach",
    description: "Scelto il percorso, attiviamo la tua area personale e ti affianchiamo una coach dedicata.",
    visual: { src: "/images/homepage/section_2/card_3.webp", width: 1536, height: 1024 },
  },
  {
    title: "Check-in ogni settimana",
    description:
      "Racconti la tua settimana in due minuti. La tua coach legge, ti risponde e adatta il percorso insieme a te.",
    visual: { src: "/images/homepage/section_2/card_4.webp", width: 1536, height: 1024 },
  },
] as const;

/** Le quattro funzioni dell'area clienti, come le racconta la sezione "L'app del Metodo FESPA". */
export const APP_FEATURES = [
  {
    icon: "checkin",
    title: "Check-in in 2 minuti",
    description: "Energia, sonno, stress, alimentazione e allenamenti: pochi tocchi, anche dal telefono.",
  },
  {
    icon: "reply",
    title: "La coach ti risponde",
    description: "Niente messaggi persi: trovi tutte le risposte in un solo posto.",
  },
  {
    icon: "progress",
    title: "Guarda i tuoi progressi",
    description: "Settimana dopo settimana, tutto resta ordinato nel tuo percorso.",
  },
  {
    icon: "privacy",
    title: "I tuoi dati, protetti",
    description: "Le informazioni che condividi sono gestite secondo le regole di accesso e privacy previste dall'app.",
  },
] as const;

export type AppFeatureIcon = (typeof APP_FEATURES)[number]["icon"];

/**
 * Il team (dal sito ufficiale) con le fotografie di public/images/homepage/section_4 (WebP dai PNG originali).
 * photoY: posizione verticale della foto nella card, per allineare le teste tra loro.
 */
export const TEAM = [
  { name: "Federica Saccone", title: "Dott.ssa", role: "Ideatrice del Metodo FESPA", photo: "/images/homepage/section_4/federica.webp", photoY: "18%" },
  { name: "Giulia Lombardi", title: null, role: "Coach", photo: "/images/homepage/section_4/giulia.webp", photoY: "0%" },
  { name: "Maria Diella", title: null, role: "Coach", photo: "/images/homepage/section_4/maria.webp", photoY: "0%" },
  { name: "Paola Paffile", title: null, role: "Coach", photo: "/images/homepage/section_4/paola.webp", photoY: "42%" },
] as const;

/** Testimonianze pubblicate sul sito ufficiale (testo e firma come nell'originale). */
export const TESTIMONIALS = [
  {
    author: "Lucia V.",
    quote: "Grazie al Metodo FESPA, a Federica e a tutte le coach. Mi avete restituito la fiducia in me stessa e nel mio corpo.",
  },
  {
    author: "Valentina S.",
    quote:
      "Ieri sera cena fuori con le amiche: ho mangiato serenamente senza sensi di colpa. Una volta sarebbe stato impensabile, oggi è la mia normalità.",
  },
  {
    author: "Francesca T.",
    quote: "Il bello di questo metodo è poter mangiare ciò che più desideri senza restrizioni. Finalmente un percorso che non mi fa sentire a dieta.",
  },
  {
    author: "Arches F.",
    quote:
      "Un grazie speciale a Giulia per la determinazione e la professionalità con cui mi ha seguita passo dopo passo. Non mi sono mai sentita sola in questo percorso.",
  },
  {
    author: "Stefania G.",
    quote:
      "Sto imparando giorno dopo giorno la logica del Metodo FESPA, con il supporto costante della mia coach. È un cambiamento che parte dalla testa.",
  },
  {
    author: "Annamaria R.",
    quote: "Questo team è SPECIALE. Ti seguono davvero, ti motivano e ti fanno sentire parte di una famiglia.",
  },
] as const;

/** Domande frequenti: le prime cinque dal sito ufficiale, le ultime due sul funzionamento dell'app. */
export const FAQ = [
  {
    question: "Cos'è il Metodo FESPA?",
    answer:
      "Il Metodo FESPA® è un approccio rivoluzionario al benessere e alla trasformazione fisica femminile, con migliaia di recensioni. Si basa sull'equilibrio tra mente e corpo: un vero cambio di paradigma rispetto alle diete tradizionali.",
  },
  {
    question: "Quali sono i principali obiettivi del Metodo FESPA?",
    answer:
      "Supporto personalizzato, educazione alimentare e strategie efficaci, con un'enfasi sull'amore e il rispetto per se stesse. L'obiettivo è un cambiamento duraturo, non un risultato temporaneo.",
  },
  {
    question: "Per chi è adatto?",
    answer:
      "È pensato per chi vuole rimettersi in forma senza stravolgere la propria vita: senza cambiare alimentazione, senza preparare pasti diversi per la famiglia, senza eliminare i carboidrati e senza ore di palestra.",
  },
  {
    question: "Quanto costa?",
    answer:
      "Il costo varia in base alle esigenze e al percorso più adatto a te. Per questo offriamo una consulenza gratuita: durante la chiamata capiamo insieme la soluzione su misura.",
  },
  {
    question: "Dove trovo le recensioni?",
    answer:
      "Opinioni e testimonianze reali sono su Facebook, Instagram, YouTube e TikTok, oltre che nella sezione recensioni del sito ufficiale.",
  },
  {
    question: "Cosa succede dopo la registrazione?",
    answer:
      "Confermi la tua email e compili un breve questionario. Poi ti contattiamo per la consulenza gratuita: quando il percorso è attivo, nella tua area trovi la tua coach e i check-in settimanali.",
  },
  {
    question: "Chi vede i miei dati?",
    answer:
      "Solo la tua coach e l'amministrazione del Metodo FESPA. Le informazioni su infortuni e salute sono facoltative e le condividi solo con un consenso esplicito.",
  },
] as const;

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/dott.ssa_federicasaccone/" },
  { label: "Facebook", href: "https://www.facebook.com/metodofespafedericasaccone/" },
  { label: "YouTube", href: "https://www.youtube.com/@dottssafedericasaccone" },
  { label: "TikTok", href: "https://www.tiktok.com/@dottssasacconefespa" },
] as const;
