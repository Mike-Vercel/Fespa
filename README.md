# FESPA Coach AI

Piattaforma di FESPA per coach e clienti: le clienti compilano profilo e check-in nella loro area, le coach li gestiscono insieme a note e follow-up, con un copilota AI che **propone** e una coach che **verifica e decide**. Un admin approva le iscrizioni spontanee e assegna le coach.

> Prototipo production-minded: Next.js 16 (App Router) · TypeScript strict · Supabase (Postgres + Auth + RLS) · Zod · AI provider-agnostic (adapter Anthropic + provider demo).

---

## Indice

1. [Problema e outcome](#problema-e-outcome)
2. [Cosa fa l'app](#cosa-fa-lapp)
3. [Ruoli e flussi](#ruoli-e-flussi)
4. [Architettura](#architettura)
5. [Stack](#stack)
6. [AI: workflow, tool calling, human in the loop](#ai-workflow-tool-calling-human-in-the-loop)
7. [Sicurezza](#sicurezza)
8. [Database](#database)
9. [Setup locale passo passo](#setup-locale-passo-passo)
10. [Email di Supabase Auth](#email-di-supabase-auth)
11. [Variabili d'ambiente](#variabili-dambiente)
12. [Script e test](#script-e-test)
13. [Deployment su Vercel](#deployment-su-vercel)
14. [Percorso demo consigliato](#percorso-demo-consigliato)
15. [Limitazioni dell'MVP ed evoluzioni](#limitazioni-dellmvp-ed-evoluzioni)

---

## Problema e outcome

**Problema.** Una coach segue molte clienti. Ogni settimana deve leggere i check-in, ricordare lo storico di ciascuna, preparare risposte personalizzate e non perdere i follow-up. Più clienti significa più tempo speso in attività ripetitive e più rischio di trascurare qualcuno.

**Outcome.** Aprendo l'app, in meno di 5 secondi la coach sa quante clienti segue, cosa deve controllare oggi, quali check-in sono arrivati, quali follow-up la aspettano e chi richiede attenzione. Il tempo di lettura, sintesi e bozza delle risposte si riduce; il giudizio professionale resta suo.

**Principio guida.** *AI proposes. Human reviews. Human decides.* L'AI non salva, non invia e non crea nulla da sola.

## Cosa fa l'app

| Area | Funzioni |
|---|---|
| **Home pubblica (`/`)** | Landing del Metodo FESPA con funnel verso la registrazione: promessa, prove (numeri, stampa, marchio registrato), il metodo, il percorso in 4 passi, l'app e il copilota AI, il team, testimonianze, FAQ, CTA finale. Contenuti presi dal sito ufficiale metodofespa.it, senza dati inventati |
| **Dashboard** | Saluto contestuale, 4 metriche chiave (clienti attive, check-in da revisionare, follow-up di oggi, priorità), "Da controllare oggi" ordinato per urgenza, prossimi follow-up (scaduti / oggi / 7 giorni), check-in recenti |
| **Clienti** | Ricerca, filtro per stato, ordinamento (priorità, nome, ultimo check-in, prossimo follow-up); tabella su desktop, lista su mobile; **"Nuova cliente"** con invito email all'area clienti |
| **Scheda cliente** | Header con stato, date chiave e stato dell'accesso (con "Reinvia invito"); tab Panoramica · Check-in · Note · Follow-up; profilo compilato dalla cliente, infortuni e traumi; Coach Copilot |
| **Check-in** | Inbox trasversale "da revisionare / tutti", revisione, risposta scritta a mano o bozza AI, analisi AI |
| **Area clienti** | Questionario di ingresso (con domande di approfondimento sugli infortuni generate dall'AI), check-in settimanale, storico con le risposte della coach, modifica dei propri dati |
| **Iscrizioni (amministrazione)** | Richieste spontanee con profilo e infortuni: approvazione con assegnazione della coach, rifiuto, riconsiderazione |
| **Utenti registrati (amministrazione)** | Tutti gli account divisi per ruolo, con stato dell'approvazione per le clienti; il super admin sceglie chi è coach, amministrazione o super admin. Dalla scheda cliente l'amministrazione cambia le coach assegnate; le clienti senza coach sono segnalate |
| **Accesso** | Login con password o link via email, registrazione delle clienti, recupero password, conferma email |
| **Note** | Creazione, modifica ed eliminazione (solo le proprie), visibili a chi segue la cliente |
| **Follow-up** | Creazione, completamento con annulla, annullamento, riapertura; vista scaduti / oggi / prossimi |
| **AI** | Analisi strutturata dei check-in, Coach Copilot con tool e fonti citate, bozze di risposta modificabili |
| **Profilo / Impostazioni** | Modifica nome, stato e utilizzo AI, preferenza sidebar, "esci da tutti i dispositivi" |

Ogni pagina gestisce gli stati **loading** (skeleton con la stessa struttura del contenuto), **vuoto**, **errore** e **non autorizzato**.

---

## Ruoli e flussi

| Ruolo | Area | Cosa può fare |
|---|---|---|
| `client` (Cliente) | `/area-cliente` | Compilare e aggiornare i propri dati, inviare check-in (se approvata), leggere le risposte della propria coach. Nient'altro: niente note, analisi AI o dati di altre clienti |
| `coach` (Coach) | `/dashboard` e seguenti | Gestire le clienti assegnate, crearne di nuove e invitarle |
| `admin` (Amministrazione) | come la coach + `/admin` | Vede tutte le clienti, approva o rifiuta le iscrizioni, cambia le coach assegnate, consulta gli utenti registrati |
| `super_admin` (Super admin) | come l'amministrazione | In più cambia il ruolo di qualunque utente |

Il ruolo sta solo in `profiles` e ogni nuovo account nasce `client`. Per rendere qualcuno coach (o amministrazione), la persona si registra e il super admin cambia il ruolo da *Utenti registrati*. Regole, applicate nel database:
- nessuno può cambiare il proprio ruolo, quindi resta sempre almeno un super admin;
- chi passa allo staff perde l'eventuale richiesta di iscrizione come cliente non approvata;
- chi torna cliente perde le assegnazioni: le sue clienti restano visibili all'amministrazione, segnalate come "Senza coach", e si riassegnano dalla loro scheda.

**1. La coach crea la cliente (nessuna approvazione).**
1. *Clienti → Nuova cliente*: nome, email, obiettivo facoltativo. La scheda nasce approvata e assegnata alla coach.
2. Con l'email, Supabase invia il link di accesso (template "Confirm signup"). Se l'invio fallisce, la coach vede un link di registrazione da condividere a mano e può riprovare con **Reinvia invito** dalla scheda.
3. La cliente apre il link, compila il questionario di ingresso e la sua area è subito attiva.

**2. La cliente si iscrive da sola (serve l'approvazione dell'admin).**
1. `/registrati` con nome, email e password → conferma dell'email.
2. Questionario di ingresso → richiesta **in attesa**: la cliente vede solo un messaggio di attesa e i propri dati.
3. L'admin, in *Iscrizioni*, verifica (ad es. l'abbonamento pagato) e approva scegliendo la coach, oppure rifiuta. Da quel momento la cliente può inviare i check-in.

Se una persona invitata si registra da sola con la **stessa email**, dopo la verifica dell'email viene collegata all'invito e non passa dall'approvazione.

**Questionario di ingresso.** Dati essenziali (telefono, data di nascita, obiettivo, esperienza, giorni disponibili, canale preferito, note per la coach) e consenso privacy obbligatorio. La sezione su infortuni e traumi è **facoltativa e con consenso separato** (dati relativi alla salute): se la persona descrive un infortunio, l'AI propone fino a 3 domande di approfondimento; senza AI si usano domande standard, dichiarate come tali.

**Check-in e risposte.** La cliente approvata invia al massimo un check-in ogni 20 ore. La coach risponde a mano o partendo da una bozza AI che rivede e approva: solo allora la risposta compare nell'area della cliente. Una risposta già data non si sovrascrive.

---

## Architettura

```
 Browser — Client Components: interazione e stato UI locale
    │ Server Actions (form, mutazioni)          │ fetch POST /api/ai/* (AI)
    ▼                                           ▼
 app/ — solo routing: page · layout · loading · error · route.ts
    ▼
 server/services — autenticazione, autorizzazione, regole → DTO minimi ── domain/ (logica pura)
    ▼                              ▼
 server/repositories          server/ai — workflow → context → provider → validazione
    ▼                              ▼
 Supabase Postgres + RLS      Provider AI (Anthropic | mock dichiarato)
```

**Quattro scelte che reggono tutto:**

1. **Il browser non parla mai con Supabase né con il provider AI.** Letture nei Server Components, mutazioni con Server Actions, AI con Route Handlers. Nel browser non esiste un client Supabase.
2. **L'app in esecuzione non usa mai la service role key.** Ogni query usa il client con la sessione della coach, quindi la Row Level Security è sempre attiva. La service role serve solo allo script di seed.
3. **Difesa in profondità.** `proxy.ts` fa solo redirect ottimistici; ogni service rifà autenticazione e autorizzazione; la RLS nel database è l'ultima linea.
4. **Le "scritture" dell'AI sono proposte per costruzione.** I tool di proposta non ricevono il database nella loro firma: la scrittura avviene solo quando la coach conferma, tramite le normali Server Actions validate e autorizzate.

### Struttura delle cartelle

```
src/
├── proxy.ts                  refresh della sessione + redirect ottimistico (Next 16: ex middleware)
├── app/                      SOLO routing: nessuna query, nessun prompt
│   ├── (auth)/               login, registrati, password-dimenticata, reimposta-password
│   ├── (app)/                area staff (force-dynamic): dashboard, clients, checkins, followups, admin/{registrations,users}, profile, settings
│   ├── (portal)/area-cliente area clienti (force-dynamic): home, iniziamo, check-in, profilo
│   ├── auth/confirm/         verifica dei link email (token_hash) lato server
│   └── api/ai/               Route Handler AI: analyze-checkin, copilot, reply-draft
├── components/               ui/ (primitive del design system), shell/ (sidebar, topbar), skeletons/
├── features/                 UI per dominio + Server Actions sottili (validano → service → revalidate); marketing/ = home pubblica
├── server/                   tutto "server-only": importarlo da un Client Component rompe la build
│   ├── env.ts · errors.ts · logger.ts · action-runner.ts
│   ├── auth/                 requireCoach/Admin/Client(): JWT verificato + ruolo letto dal DB; inviti
│   ├── db/                   client Supabase (sessione della coach) + tipi Database
│   ├── repositories/         query tipizzate, righe → DTO
│   ├── services/             autorizzazione + regole di business
│   ├── http/                 wrapper delle Route Handler (origine, sessione, body, errori)
│   ├── rate-limit/
│   └── ai/                   vedi "Mappa dell'AI layer"
├── domain/                   logica pura: priorità, scadenze, fusi orari, attività
├── validation/               schema Zod degli input (client-safe, sempre rivalidati sul server)
├── types/                    DTO condivisi
└── lib/                      utility client-safe (cn, formattazione Intl, etichette)
supabase/migrations/          schema · sicurezza (grant + RLS) · vista aggregata · area clienti
supabase/templates/           email di Supabase Auth con il marchio FESPA
scripts/                      seed dei dati demo
tests/                        unit, servizi, AI, HTTP, RLS su Postgres (PGlite)
```

---

## Stack

| Livello | Scelta | Perché |
|---|---|---|
| Framework | Next.js 16.3 App Router, React 19.2, React Compiler | Server Components, Server Actions, Route Handlers; `proxy.ts` per la sessione |
| Linguaggio | TypeScript strict | Nessun `any`; tipi del DB allineati alle migration |
| Dati e auth | Supabase: Postgres, Auth, RLS (`@supabase/ssr`) | Cookie httpOnly gestiti lato server, autorizzazione anche nel DB |
| Validazione | Zod 4 | Input, env, output AI, jsonb letto dal DB, argomenti dei tool |
| UI | Tailwind CSS 4 con token propri, primitive Radix (`radix-ui`) con stili custom, `sonner`, `lucide-react` | Accessibilità di dialog, menu, tooltip e tab senza l'aspetto di una libreria "demo" |
| AI | Interfaccia propria + adapter `@anthropic-ai/sdk` (default `claude-opus-5`) + provider mock | Provider sostituibile, output sempre validato dall'app |
| Test | Vitest 5, PGlite (Postgres in WASM) | Test delle policy RLS reali senza Docker |

**Design.** Palette neutra e calda (carta `#F7F5F0`, inchiostro antracite, bordi pietra) con **un solo accento** verde muschio. Tipografia: **Newsreader** (serif editoriale per titoli e numeri) e **Schibsted Grotesk** (grotesk leggibile per l'interfaccia), caricati con `next/font`. Contrasti verificati: testo ≥ 4.5:1, bordi dei controlli ≥ 3:1. Animazioni sottili, disattivate con `prefers-reduced-motion`.

---

## AI: workflow, tool calling, human in the loop

### Mappa dell'AI layer

| Cosa | Dove |
|---|---|
| Prompt (versionati, stabili → cacheabili) | `src/server/ai/prompts/index.ts` |
| Schema degli output | `src/server/ai/schemas/` |
| Validazione dell'output | `src/server/ai/schemas/parse-output.ts` (usata da ogni workflow) |
| Costruzione del contesto (privacy by design) | `src/server/ai/context/` |
| Delimitazione dei dati non affidabili | `src/server/ai/untrusted.ts` |
| Tool e registry | `src/server/ai/tools/` |
| Chiamata al provider | `src/server/ai/providers/` (unico punto che importa un SDK) |
| Orchestrazione end-to-end | `src/server/ai/workflows/` |
| Audit + rate limit di ogni richiesta | `src/server/ai/interaction.ts` |

### Analisi di un check-in ("Analizza con AI")

`POST /api/ai/analyze-checkin` → `workflows/analyze-checkin.ts`:

1. controllo origine della richiesta, sessione verificata, body validato con Zod;
2. il check-in viene letto con il client della coach e l'accesso alla sua cliente è verificato (404 se non consentito);
3. si recuperano solo 3 check-in precedenti e 3 note recenti;
4. il contesto viene costruito esplicitamente: niente nome, cognome o ID, testi neutralizzati;
5. la richiesta è registrata in `ai_interactions` e passa dal rate limit;
6. chiamata al provider con output strutturato (JSON Schema);
7. **l'output viene validato con Zod**: se non è conforme, errore gestito e nessun salvataggio;
8. si salva in `ai_analyses` con modello, provider, versione del prompt e flag mock;
9. la UI mostra sintesi, temi, domande da approfondire, eventuale nota sui temi sensibili e la **proposta** di follow-up.

Contratto di output: `summary`, `topics`, `followUpNeeded`, `followUpSuggestion`, `suggestedQuestions`, `confidence`, `sensitiveContentNote`. Lo schema verifica anche la coerenza: se serve un follow-up, deve esserci la proposta.

### Coach Copilot e tool calling

`POST /api/ai/copilot` → `workflows/copilot.ts`. Il Copilot lavora solo sulla cliente selezionata e parte da un contesto minimo; il resto lo recupera con i tool, quando serve.

| Tool | Tipo | Cosa restituisce |
|---|---|---|
| `get_client_profile` | lettura | nome proprio, stato, inizio percorso, obiettivo |
| `get_latest_checkin` | lettura | ultimo check-in (punteggi, allenamenti, testi) |
| `get_previous_checkins` | lettura | fino a 6 check-in precedenti |
| `get_coach_notes` | lettura | fino a 10 note recenti |
| `get_followups` | lettura | follow-up filtrati per stato |
| `propose_followup` | **proposta** | registra una proposta per la coach; **non crea nulla** |

Garanzie del registry:
- **Input:** ogni tool ha uno schema Zod `strict`. Nessun tool accetta un `clientId`: la cliente è fissata dal server dopo il controllo di accesso, e il modello non può cambiarla, nemmeno tramite prompt injection.
- **Permessi:** i tool di lettura usano il client della coach (RLS). I tool di proposta non ricevono il database.
- **Risultati:** sono tipizzati. Gli errori diventano `is_error` per il modello e finiscono nei log, senza eccezioni.
- **Limiti:** al massimo 5 passi nel loop, e all'ultimo passo il modello deve rispondere con ciò che ha. Al massimo una proposta per richiesta.
- **Fonti:** ogni dato ha un riferimento breve (`C1`, `N2`, `F1`). La risposta cita i riferimenti, il server scarta quelli inventati e la UI li mostra come link al dato originale.

### Bozza di risposta ("Bozza risposta con AI")

La bozza si genera con indicazioni opzionali della coach e si può modificare, rigenerare o copiare. È sempre accompagnata dal banner **"Bozza generata con AI — verifica prima dell'utilizzo."** Solo **"Approva"** salva il testo della coach come risposta e segna il check-in come revisionato: se la cliente usa l'area clienti la legge lì, altrimenti la coach la copia sul suo canale. L'AI non invia mai nulla da sola.

### Domande di approfondimento sugli infortuni

`generateInjuryQuestions` (Server Action del questionario) riceve **solo** la descrizione scritta dalla persona: nessun nome, email o altro dato. Il testo è trattato come dato non affidabile, l'output (2–3 domande brevi e non cliniche) è validato con Zod, la richiesta passa da audit e rate limit come le altre. Se l'AI non è configurata o fallisce, l'iscrizione non si blocca: si usano domande standard e la fonte (`ai`, `mock`, `standard`) viene salvata e mostrata alla coach.

### Human in the loop

| L'AI propone… | …la coach decide |
|---|---|
| Follow-up nell'analisi o nel Copilot | **[Ignora]** (decisione registrata) o **[Crea follow-up]** → form precompilato e modificabile → Server Action |
| Bozza di risposta | La modifica e la approva esplicitamente |
| Temi sensibili | Nota neutra con invito a una verifica professionale; nessuna conclusione clinica |

### Guardrail: non è un sistema medico

Il system prompt vieta diagnosi, prescrizioni, modifiche di terapie, piani nutrizionali clinici e decisioni al posto della coach. Su segnali sensibili (dolore, rapporto difficile con il cibo, forte stress, temi medici) l'AI compila `sensitiveContentNote` e suggerisce una verifica con un professionista appropriato. I ragionamenti interni del modello non vengono né richiesti né salvati.

### Prompt injection

I testi delle clienti e delle coach sono **dati non affidabili**, e i messaggi al modello separano tre livelli:

1. **Istruzioni di sistema.** Statiche e versionate, dichiarano che i dati non sono mai istruzioni.
2. **Contesto applicativo.** Fatti generati dal server: data, stato del percorso, tipo di richiesta.
3. **Dati non affidabili.** Racchiusi in `<dati_non_affidabili>`. I caratteri `<` e `>` sono sostituiti, così un testo non può chiudere il blocco; caratteri di controllo rimossi, lunghezza limitata.

Anche se un'iniezione riuscisse:
- i tool leggono solo la cliente corrente;
- nessun tool scrive;
- l'output è validato con Zod e mostrato come **testo semplice** (niente HTML, markdown o link generati dal modello), quindi niente XSS né esfiltrazione tramite immagini o link.

### Privacy by design

Un builder esplicito per ogni workflow decide cosa inviare al provider:
- **analisi:** check-in corrente, 3 precedenti, 3 note;
- **Copilot:** contesto minimo più i tool;
- **bozza:** nome proprio, check-in, eventuale sintesi e ultima risposta.

Non vengono mai inviati cognomi, email o identificativi interni. `ai_interactions` conserva solo metadati: tipo, esito, modello, token, latenza e codice errore.

### Provider e modalità

| Configurazione | Comportamento |
|---|---|
| `AI_PROVIDER=anthropic` + `AI_API_KEY` | Claude via SDK ufficiale, modello `AI_MODEL` (default `claude-opus-5`). Output strutturato, effort `medium` per le richieste interattive, prompt caching del system prompt, timeout 45 s, gestione di `refusal` e troncamenti, fallback server-side (beta Anthropic) sui modelli che lo supportano |
| `DEMO_AI_MODE=true` | Provider **mock** deterministico (`providers/mock.ts`): nessun modello coinvolto, risultati costruiti con regole semplici dai dati reali, salvati con `is_mock = true` e mostrati con il badge **"Risultato dimostrativo · non generato da AI"**. Passa dallo stesso tool registry, quindi il tool calling è dimostrabile senza chiave |
| Nessuna delle due | "AI provider non configurato." Pulsanti AI disattivati con spiegazione, il resto dell'app funziona |

Per aggiungere un provider (es. OpenAI) basta implementare `AIProvider` in `src/server/ai/providers/` e aggiungerlo a `resolveAIConfig`. Workflow, tool, schema e UI non cambiano.

### Rate limiting e audit

- **Limiti:** 20 richieste AI ogni 10 minuti e 200 al giorno per coach. Oltre il limite: 429 con `Retry-After`.
- **Come funziona:** lo stato condiviso è nel database. Ogni richiesta viene registrata *prima* del conteggio, quindi il sistema funziona su serverless senza servizi esterni; con richieste in raffica il limite scatta al massimo troppo presto, mai troppo tardi.
- **Estendibilità:** l'interfaccia `AIRateLimiter` permette di sostituire l'implementazione (es. Upstash Redis) senza toccare il resto.

---

## Sicurezza

| Rischio | Mitigazione |
|---|---|
| IDOR (ID manipolati nel browser) | Ogni ID passa da `assertClientAccess` (UUID valido + assegnazione), più la RLS. "Non esiste" e "non assegnata" danno lo stesso 404, quindi nessuna enumerazione |
| Escalation del ruolo | Il ruolo sta solo in `profiles`, il trigger crea sempre `client` (mai dai metadata utente), ognuno può aggiornare solo `full_name`/`avatar_url` (grant per colonna) |
| Registrazioni spontanee | Aperte solo per il ruolo `client`: servono email verificata e consenso privacy, e fino all'approvazione dell'admin l'account vede solo i propri dati. Le scritture della cliente passano da funzioni RPC (`security definer`) che ricontrollano ruolo, stato e limiti nel database |
| Presa di possesso di un invito | Una scheda creata dalla coach si collega a un account solo se l'email dell'account è **verificata** e uguale a quella dell'invito |
| Separazione staff/clienti | `proxy.ts`, layout e service instradano per ruolo; le policy danno alla cliente solo la propria scheda, i propri check-in e il nome delle proprie coach. Note, analisi AI, follow-up e dati di altre clienti restano invisibili |
| Dati sanitari | Sezione facoltativa con consenso separato; senza consenso non si salva nulla. Visibili solo alla cliente, alle sue coach e all'admin; scrivibili solo tramite RPC |
| Invio degli inviti | Client Supabase **senza sessione e con la sola chiave pubblica** (la stessa richiesta di un'auto-iscrizione): nessun uso della service role, nessun effetto sui cookie della coach |
| Service role esposta | Letta solo da `scripts/seed-demo.ts`. `server-only` su tutti i moduli server; build verificata senza segreti, SDK o prompt nei bundle client |
| Server Action e Route Handler chiamate direttamente | Ognuna rivalida sessione, input (Zod) e accesso; le route AI controllano anche l'`Origin` (CSRF) e la dimensione del body |
| Sessione | `getClaims()` verifica la firma del JWT; il ruolo è letto dal DB; cookie httpOnly gestiti da `@supabase/ssr`; header anti-cache sulle risposte che impostano cookie |
| Open redirect dopo il login | `next` accettato solo come path interno (test dedicati) |
| Dati di una coach in cache condivise | Area riservata `force-dynamic`, nessun `use cache`, `React.cache` solo per singola richiesta, API `Cache-Control: no-store` |
| Output AI | Validato con Zod, reso come testo semplice, mai salvato se non conforme |
| Header HTTP | CSP (`frame-ancestors 'none'`, `base-uri`, `form-action`, `object-src`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS |
| Log | JSON strutturati, chiavi sensibili oscurate automaticamente, mai contenuti di check-in, note o prompt |
| Errori | Classi applicative (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `RateLimitError`, `AIProviderError`) tradotte in messaggi sicuri in due soli punti; mai stack trace all'utente |

---

## Database

Cinque migration riproducibili in `supabase/migrations/`, da applicare in ordine:

| File | Contenuto |
|---|---|
| `…_schema.sql` | enum, tabelle, vincoli, indici, trigger (`updated_at`, `completed_at`, creazione profilo) |
| `…_security.sql` | helper `private.*` (security definer, schema non esposto), grant minimi per colonna, RLS e policy |
| `…_client_overview_view.sql` | vista aggregata `client_overview` con `security_invoker` (rispetta la RLS) |
| `…_client_portal.sql` | ruolo `client`, dati del questionario, `client_health_profiles`, approvazioni, policy per le clienti, funzioni RPC, vista aggiornata |
| `…_user_roles.sql` | ruolo `super_admin`, helper `is_staff`, gestione utenti e assegnazioni, numero di coach nella vista |

| Tabella | Scopo |
|---|---|
| `profiles` | Profilo 1:1 con `auth.users`, ruolo `client`/`coach`/`admin` |
| `clients` | Scheda: nome, stato, obiettivo, inizio percorso; account collegato (`user_id`), email, stato di approvazione; dati del questionario (telefono, data di nascita, esperienza, disponibilità, canale preferito, note, consenso) |
| `client_health_profiles` | Infortuni e traumi (1:1 con la scheda, facoltativa, con data del consenso e fonte delle domande) |
| `coach_clients` | Assegnazioni N:N, unica fonte di verità per l'accesso |
| `checkins` | Risposte (jsonb, schema v1 validato anche in lettura), revisione, risposta approvata |
| `coach_notes` | Note visibili a chi segue la cliente, modificabili solo dall'autrice |
| `followups` | Promemoria con `due_on` (data, calcolata nel fuso della coach), stato, origine (manuale/AI) |
| `ai_analyses` | Output AI validati + decisione della coach sulla proposta + modello, provider, versione del prompt, flag mock |
| `ai_interactions` | Audit e rate limit: solo metadati |

**Scelte di integrità:**
- *FK composite* impediscono che un'analisi punti al check-in di un'altra cliente.
- `on delete cascade` dai figli verso `clients` (per il diritto all'oblio).
- `restrict` sull'autrice di note e follow-up.
- Vincoli di coerenza: `completed` ⇔ `completed_at`, decisione ⇔ proposta.

**Policy in sintesi.** `anon` non ha accesso. Una coach vede solo le clienti assegnate e scrive solo a proprio nome. L'admin vede tutto. Una cliente legge solo la propria scheda, i propri check-in (con le risposte) e il nome delle proprie coach, e non scrive direttamente su nessuna tabella. Le policy usano `client_id in (select private.accessible_client_ids())`, valutato una volta per query.

**Funzioni RPC** (tutte `security definer`, revocate ad `anon`, errori con codici `FC00x` tradotti dall'app):

| Funzione | Chi | Cosa fa |
|---|---|---|
| `create_client_by_staff` | coach, admin | crea una scheda approvata e la assegna a chi la crea |
| `complete_client_onboarding` | client | salva il questionario; collega l'invito (email verificata) oppure crea una richiesta in attesa |
| `submit_client_checkin` | client approvata | inserisce il check-in (max 1 ogni 20 ore) |
| `review_client_registration` | amministrazione | approva assegnando una coach, oppure rifiuta |
| `admin_list_users` | amministrazione | elenco degli account con email (da `auth.users`, non esposta dalle API) e stato |
| `set_user_role` | super admin | cambia il ruolo di un altro utente, con gli effetti descritti in [Ruoli e flussi](#ruoli-e-flussi) |
| `set_client_coaches` | amministrazione | sostituisce le coach assegnate a una cliente approvata |

**Tipi TypeScript.** `src/server/db/database.types.ts` rispecchia lo schema nel formato della CLI. Per rigenerarlo: `npx supabase gen types typescript --project-id <ref> > src/server/db/database.types.ts`.

---

## Setup locale passo passo

**Prerequisiti:** Node.js ≥ 22.12 (LTS), un progetto [Supabase](https://supabase.com) (il free tier basta), opzionalmente una API key Anthropic.

1. **Installa le dipendenze**
   ```bash
   npm install
   ```

2. **Crea il progetto Supabase** e, da *Project Settings → API Keys*, recupera l'URL del progetto, la chiave anon/publishable e la chiave service_role/secret.

3. **Applica le migration dal terminale:**
   - in *Supabase → Connect → Session pooler* copia l'URI;
   - mettilo in `.env.local` come `SUPABASE_DB_URL`, sostituendo `[YOUR-PASSWORD]` con la password del database (anche con caratteri speciali: lo script la codifica);
   - esegui:
   ```bash
   npm run db:migrate            # applica le migration mancanti
   npm run db:migrations         # confronta locale e database
   ```
   Lo script usa la Supabase CLI (dipendenza di sviluppo), la avvia senza shell e non stampa mai la stringa di connessione. In alternativa esegui in ordine i file di `supabase/migrations/` nel *SQL Editor*. Se hai applicato alcune migration a mano, registrale una volta con `npm run db:mark-applied -- <versione> …` prima di `db:migrate`.

4. **Configura Supabase Auth** (dettagli in [Email di Supabase Auth](#email-di-supabase-auth)):
   - *Authentication → Sign In / Providers → Email*: "Allow new users to sign up" **on** (le clienti si registrano) e "Confirm email" **on**;
   - *Authentication → URL Configuration*: Site URL `http://localhost:3000` in locale (l'URL pubblico in produzione) e lo stesso indirizzo con `/**` tra i Redirect URLs;
   - *Authentication → Emails*: incolla i template di `supabase/templates/`.

5. **Configura l'ambiente**
   ```bash
   cp .env.example .env.local
   ```
   Compila almeno `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SEED_DEMO_PASSWORD`. Per l'AI imposta `AI_PROVIDER` + `AI_API_KEY`, oppure `DEMO_AI_MODE=true`.

6. **Carica i dati demo**
   ```bash
   npm run db:seed
   ```
   Account creati (password: `SEED_DEMO_PASSWORD`, dominio: `SEED_DEMO_EMAIL_DOMAIN`):

   | Account | Ruolo | Cosa mostra |
   |---|---|---|
   | `admin@…` | super admin | Tutto: iscrizioni in attesa (Nadia, Camilla) e rifiutate (Serena), tutte le clienti, cambio dei ruoli |
   | `segreteria@…` | amministrazione | Come il super admin, ma senza cambio dei ruoli |
   | `giulia.ferrante@…` | coach | 10 clienti; Sara usa l'area clienti, Francesca è invitata ma non registrata |
   | `marta.colombo@…` | coach | 3 clienti |
   | `sara.bellini@…` | client | Area clienti attiva, storico con risposte, vecchio infortunio alla caviglia |
   | `nadia.ferri@…`, `camilla.neri@…` | client | Iscrizione in attesa di approvazione |
   | `serena.villa@…` | client | Iscrizione rifiutata |

   Lo script è rieseguibile: ricrea solo i dati demo, con date relative a oggi.

7. **Avvia**
   ```bash
   npm run dev
   ```
   Apri http://localhost:3000 e accedi con uno degli account demo.

---

## Email di Supabase Auth

L'app non ha un servizio email proprio: conferme, link di accesso, inviti e recupero password li invia **Supabase Auth**, con i template del progetto.

**Template con il marchio FESPA** (`supabase/templates/`): logo PNG servito dal sito (`/email/logo.png`, con testo alternativo), stile unico per tutte le email, tutto in italiano. Si caricano in Supabase con un comando, che imposta anche gli oggetti e verifica il risultato:

```bash
npm run email:templates            # serve SUPABASE_ACCESS_TOKEN in .env.local
npm run email:templates -- --check # confronta Supabase con i file del progetto
```

Supabase Auth tiene in memoria ogni template già usato per **10 minuti**: le email inviate subito dopo una modifica possono avere ancora la grafica precedente.

In alternativa, da *Authentication → Emails* incolla a mano (gli oggetti sono in `scripts/supabase-email-templates.ts`):

| Template Supabase | File | Oggetto |
|---|---|---|
| Confirm signup | `confirmation.html` | Il tuo codice FESPA |
| Magic Link | `magic-link.html` | Il tuo link di accesso a FESPA |
| Reset Password | `recovery.html` | Reimposta la tua password FESPA |
| Invite user | `invite.html` | Il tuo invito a FESPA |
| Change email address | `email-change.html` | Conferma il tuo nuovo indirizzo email |
| Reauthentication | `reauthentication.html` | Il tuo codice di verifica FESPA |
| Notifiche di sicurezza (7) | `notifications/*.html` | password, email, telefono, metodi di accesso e di verifica cambiati |

Le **notifiche di sicurezza** (es. "La tua password FESPA è stata cambiata") hanno già il loro template, ma partono solo se attivate in *Authentication → Emails → Security*.

La conferma della registrazione contiene sia un **codice** (`{{ .Token }}`, 8 cifre come da *Email OTP Length*) sia un link: dopo la registrazione la pagina chiede il codice (su iPhone viene proposto sopra la tastiera, con reinvio dopo 60 secondi), mentre il link resta per chi apre l'email dal computer e per gli inviti delle coach. I link puntano a `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…`: il token è verificato **sul server** (`verifyOtp`) e la sessione nasce nei cookie httpOnly. Per questo la Site URL deve essere l'indirizzo dell'app, che serve anche il logo delle email.

**Invio delle email.** Il servizio email integrato di Supabase è pensato solo per le prove: consegna **solo agli indirizzi dei membri del team** del progetto e con un limite di pochi messaggi l'ora. Per invitare clienti reali configura un SMTP (es. Resend, Postmark, Brevo) in *Authentication → Emails → SMTP Settings* e alza i rate limit in *Authentication → Rate Limits*. Se l'invio fallisce, l'app mostra alla coach un link di registrazione da condividere a mano.

---

## Variabili d'ambiente

| Variabile | Obbligatoria | Esposta al browser | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sì | sì (pubblica per design) | URL del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sì | sì (pubblica per design, dati protetti da RLS) | Chiave anon o publishable (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo per il seed | **no** | Chiave service_role o secret (`sb_secret_…`); **mai** usata dall'app |
| `SUPABASE_DB_URL` | solo per `db:migrate` | **no** | Stringa di connessione (Session pooler) con la password del database; **mai** usata dall'app |
| `SEED_DEMO_PASSWORD` | solo per il seed | no | Password degli account demo (≥ 12 caratteri) |
| `SEED_DEMO_EMAIL_DOMAIN` | no (`example.com`) | no | Dominio delle email demo |
| `AI_PROVIDER` | no | no | `anthropic`, oppure vuoto |
| `AI_API_KEY` | con `AI_PROVIDER` | **no** | Chiave del provider AI |
| `AI_MODEL` | no (`claude-opus-5`) | no | Modello |
| `AI_WORKSPACE_ID` | solo per chiavi non legate a un workspace | no | ID del workspace Anthropic (`wrkspc_…`), inviato come header `anthropic-workspace-id` |
| `DEMO_AI_MODE` | no (`false`) | no | `true` = provider mock dichiarato |
| `APP_TIMEZONE` | no (`Europe/Rome`) | no | Fuso per "oggi" e scadenze |
| `NEXT_PUBLIC_APP_URL` | consigliata in produzione | sì | URL pubblico dell'app, usato nei link d'invito da condividere (in locale si ricava dalla richiesta) |

La configurazione è validata con Zod al primo utilizzo. Un errore indica solo i **nomi** delle variabili mancanti, mai i valori. Le chiavi `NEXT_PUBLIC_SUPABASE_*` sono dichiarate pubbliche, ma oggi il browser non le usa: tutto l'accesso a Supabase avviene sul server.

---

## Script e test

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo (Turbopack) |
| `npm run build` / `npm start` | Build di produzione / avvio |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint (regole Next + React Compiler) |
| `npm test` | Vitest |
| `npm run check` | typecheck + lint + test |
| `npm run db:seed` | Dati demo su Supabase |
| `npm run db:migrate` | Applica le migration mancanti (Supabase CLI, legge `SUPABASE_DB_URL`) |
| `npm run db:migrations` | Confronta le migration locali con quelle applicate |

**Cosa coprono i test** (143 test, nessun servizio esterno richiesto):

- **RLS su Postgres reale (PGlite):**
  - le migration vere girano su uno shim minimo di Supabase;
  - due coach isolate, `anon` senza accesso;
  - nessuna auto-promozione di ruolo, nemmeno tramite i metadata di registrazione;
  - note delle colleghe non modificabili, follow-up non spostabili tra clienti;
  - revisione solo a proprio nome, integrità delle FK composite.
- **Area clienti (stesso Postgres reale):**
  - collegamento all'invito solo con email verificata; senza invito, richiesta in attesa;
  - la cliente vede solo la propria scheda, i propri check-in e le proprie coach, mai note o analisi;
  - check-in solo se approvata e non più di uno ogni 20 ore;
  - dati sanitari non modificabili direttamente; consenso privacy obbligatorio;
  - approvazione riservata all'admin, verso una coach reale e una scheda esistente.
- **Ruoli (stesso Postgres reale):** solo il super admin cambia i ruoli e mai il proprio; una coach riportata a cliente perde assegnazioni e accesso; una cliente promossa perde la richiesta in attesa; assegnazioni solo verso lo staff e solo dall'amministrazione; elenco utenti negato a coach e clienti.
- **Validazione:** questionario di ingresso (età minima, date impossibili, consenso), nuova cliente, decisione dell'admin, redirect per ruolo dopo il login.
- **Autorizzazione nei service:**
  - clienti non assegnate → 404;
  - note altrui → 403;
  - proposte AI di altre clienti o già gestite rifiutate;
  - date nel passato rifiutate.
- **AI:**
  - schema e coerenza degli output;
  - JSON Schema strict inviato al provider;
  - escaping anti-injection;
  - contesto minimo (niente ID, cognomi o nomi di colleghe);
  - tool registry (cliente non sovrascrivibile, limiti, errori gestiti, proposte senza accesso al DB);
  - fonti inventate scartate;
  - rate limit;
  - provider mock conforme agli schemi;
  - domande sugli infortuni: solo la descrizione al modello, ripiego sulle domande standard se l'AI manca o fallisce.
- **HTTP:** origine estranea → 403, sessione assente → 401, body non valido o troppo grande → 400, 429 con `Retry-After`, nessun dettaglio interno negli errori 500.
- **Dominio:** priorità "Da controllare oggi", divisione dei follow-up, fuso orario a cavallo della mezzanotte e del cambio d'ora, redirect sicuro dopo il login.

---

## Deployment su Vercel

1. Importa il repository su Vercel (framework rilevato automaticamente).
2. In *Settings → Environment Variables* inserisci le variabili della tabella. `SUPABASE_SERVICE_ROLE_KEY` e `SEED_DEMO_*` **non servono** in produzione: il seed si esegue in locale.
3. In Supabase, *Authentication → URL Configuration*: Site URL = dominio di produzione, e aggiungilo ai Redirect URLs. Imposta anche `NEXT_PUBLIC_APP_URL` e un SMTP personalizzato (vedi [Email di Supabase Auth](#email-di-supabase-auth)).
4. Deploy. Le route AI dichiarano `maxDuration` (60–90 s), compatibile con Fluid Compute.

---

## Percorso demo consigliato

0. **Home** su http://localhost:3000: il funnel porta a *Inizia con la consulenza gratuita* → registrazione, con i passi del percorso a lato.
1. **Login** come Giulia. La dashboard dice subito cosa fare oggi: check-in in ritardo, follow-up scaduto di Sara, Elena senza check-in da 18 giorni.
2. **Sara Bellini → Check-in → "Analizza con AI"**: sintesi, temi e proposta di follow-up. Clicca **[Crea follow-up]**, modifica e conferma: la decisione viene registrata.
3. **"Chiedi al Coach Copilot"** su Sara: *"Questa difficoltà era già comparsa?"*. Il Copilot usa i tool e cita i check-in di settimane diverse; le fonti sono link verificabili.
4. **"Bozza risposta con AI"**: bozza con banner di verifica, modifica, approva. In alternativa **"Rispondi"** senza AI.
5. **Alessia Fontana**: il check-in contiene un tema sensibile. L'analisi non trae conclusioni cliniche e suggerisce una verifica professionale.
6. **Isolamento**: esci e accedi come Marta. Vede solo le sue 3 clienti, e l'URL di una cliente di Giulia dà 404.
7. **Area clienti**: accedi come Sara. Vede la risposta di Giulia, può inviare un nuovo check-in e aggiornare i suoi dati; qualunque URL dell'area staff la riporta nella sua area.
8. **Iscrizioni**: accedi come admin (super admin). Apri la richiesta di Nadia (infortunio al ginocchio con le risposte di approfondimento) e approvala assegnandola a Marta: Nadia compare tra le clienti di Marta e può inviare i check-in.
9. **Nuova cliente**: come Giulia, *Clienti → Nuova cliente* con un'email del team Supabase, e segui l'invito fino al questionario.
10. **Utenti registrati**: come admin cambia il ruolo di Camilla in Coach (la sua richiesta di iscrizione sparisce), poi riportala a Cliente. Come Segreteria la pagina è in sola lettura.

Senza chiave AI: `DEMO_AI_MODE=true`. Ogni risultato è marcato come dimostrativo.

---

## Limitazioni dell'MVP ed evoluzioni

**Limitazioni note:**

- Le email partono dal servizio di Supabase: senza SMTP personalizzato arrivano solo agli indirizzi del team e con pochi invii l'ora.
- Correggere l'email di una scheda o disattivare un account richiede ancora SQL; la pagina Utenti non ha ricerca né paginazione (adatta a qualche centinaio di account).
- Nessuna notifica push o email alla coach quando arriva un check-in: lo trova in dashboard e nell'inbox.
- L'abbonamento non è collegato a un sistema di pagamento: l'admin lo verifica fuori dall'app prima di approvare.
- Copilot senza memoria tra domande (scelta di privacy e prevedibilità): ogni domanda è indipendente.
- Risposte AI non in streaming: skeleton e stati di attesa espliciti al loro posto.
- CSP senza nonce (direttive che non interferiscono con gli script inline di Next); solo tema chiaro.
- Rate limit su database: adatto a un team, non a volumi elevati.

**Evoluzioni naturali:**

1. SMTP transazionale (es. Resend) con dominio verificato, e notifiche alla coach per i nuovi check-in.
2. Area admin completa: disattivazione account, modifica dell'email, ricerca utenti, esportazione e cancellazione dei dati (diritto all'oblio).
3. Integrazione dei pagamenti (es. Stripe): approvazione automatica ad abbonamento attivo.
4. Streaming delle risposte del Copilot e memoria di conversazione opzionale e limitata.
5. Rate limit su Upstash Redis tramite l'interfaccia `AIRateLimiter`.
6. CSP con nonce, osservabilità (OpenTelemetry) e un pannello di audit AI per l'admin.
7. Valutazioni offline dei prompt (eval set) prima di cambiare versione o modello.
