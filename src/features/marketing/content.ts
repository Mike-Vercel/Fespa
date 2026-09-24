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
  { value: "3.407+", label: "donne in forma" },
  { value: "2.140+", label: "recensioni" },
  { value: "50+", label: "collaboratori al tuo fianco" },
] as const;

/** Testate citate dal sito ufficiale nella sezione "Ne hanno parlato". */
export const PRESS_MENTIONS = ["La Stampa", "la Repubblica", "ANSA", "Il Messaggero", "Corriere dello Sport", "Donna Moderna"] as const;

export const WITHOUT_LIST = [
  "Senza diete restrittive",
  "Senza eliminare i carboidrati",
  "Senza preparare pasti diversi per la famiglia",
  "Senza ore di palestra",
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

/** Il percorso, come funziona davvero in questa app: registrazione → consulenza → attivazione → check-in. */
export const JOURNEY_STEPS = [
  {
    title: "Registrati gratis",
    description:
      "Crea il tuo account e raccontaci di te: obiettivo, abitudini, giorni disponibili ed eventuali infortuni. Bastano tre minuti.",
  },
  {
    title: "Consulenza gratuita",
    description:
      "Ti contattiamo per capire insieme il percorso più adatto a te. Il costo dipende dalle tue esigenze: prima ne parliamo, poi decidi tu.",
  },
  {
    title: "La tua coach",
    description: "Scelto il percorso, attiviamo la tua area personale e ti affianchiamo una coach dedicata.",
  },
  {
    title: "Check-in ogni settimana",
    description:
      "Racconti la tua settimana in due minuti. La tua coach legge, ti risponde e adatta il percorso insieme a te.",
  },
] as const;

export const APP_FEATURES = [
  {
    icon: "checkin",
    title: "Check-in settimanale in due minuti",
    description: "Energia, sonno, stress, alimentazione e allenamenti: pochi tocchi, anche dal telefono.",
  },
  {
    icon: "reply",
    title: "Le risposte della tua coach in un solo posto",
    description: "Niente messaggi persi tra le chat: ogni risposta resta nel tuo storico, da rileggere quando vuoi.",
  },
  {
    icon: "history",
    title: "Il tuo percorso, settimana dopo settimana",
    description: "Rivedi i check-in passati e guarda quanta strada hai fatto.",
  },
  {
    icon: "privacy",
    title: "I tuoi dati, protetti",
    description: "Le informazioni su infortuni e salute le condividi solo se vuoi: le vede solo chi ti segue.",
  },
] as const;

export type AppFeatureIcon = (typeof APP_FEATURES)[number]["icon"];

export const TEAM = [
  { name: "Federica Saccone", title: "Dott.ssa", role: "Ideatrice del Metodo FESPA" },
  { name: "Giulia Lombardi", title: null, role: "Coach" },
  { name: "Maria Diella", title: null, role: "Coach" },
  { name: "Paola Paffile", title: null, role: "Coach" },
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
