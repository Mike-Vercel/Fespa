import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asAnonymous, asUser, createTestDatabase, createUser } from "../support/test-database";

/*
 * Prova FESPA a livello database (migration reali su Postgres/PGlite).
 * Le regole (3 messaggi, dati prima del terzo, una generazione alla volta) devono reggere anche
 * se l'applicazione avesse un bug; il browser non deve poter leggere né chiamare nulla.
 */

type TrialState = {
  messageCount: number;
  leadName: string | null;
  leadEmail: string | null;
  summary: unknown;
  completedAt: string | null;
  emailStatus: "not_requested" | "sending" | "sent" | "failed";
  emailAttempts: number;
  generationLocked: boolean;
  messages: { seq: number; role: "user" | "assistant"; content: string }[];
  inserted?: boolean;
};

const PERMISSION_DENIED = /permission denied/;
const CHECK_VIOLATION = /violates check constraint/;

let db: PGlite;

function newTokenHash(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

async function asServer<T>(run: () => Promise<T>): Promise<T> {
  await db.exec("set role service_role");
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}

async function call(fn: string, args: unknown[]): Promise<TrialState> {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(", ");
  const result = await asServer(() => db.query<{ state: TrialState }>(`select public.${fn}(${placeholders}) as state`, args));
  return result.rows[0].state;
}

/** Porta una prova nuova fino a "due messaggi con risposta". */
async function trialWithTwoReplies(): Promise<string> {
  const token = newTokenHash();
  await call("trial_start", [token]);
  for (const text of ["Mangio in modo disordinato", "La sera sono stanca"]) {
    await call("trial_add_user_message", [token, randomUUID(), text]);
    await call("trial_add_assistant_message", [token, `Risposta a: ${text}`]);
  }
  return token;
}

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, { id: randomUUID(), email: "coach@example.com", fullName: "Coach", role: "coach" });
});

describe("il browser non ha accesso", () => {
  it("anon e utenti autenticati non leggono le tabelle della prova", async () => {
    const coach = (await db.query<{ id: string }>("select id from auth.users limit 1")).rows[0].id;
    await asAnonymous(db, async () => {
      await expect(db.query("select * from public.trial_sessions")).rejects.toThrow(PERMISSION_DENIED);
      await expect(db.query("select * from public.trial_messages")).rejects.toThrow(PERMISSION_DENIED);
      await expect(db.query("insert into public.trial_rate_events (bucket) values ('x')")).rejects.toThrow(PERMISSION_DENIED);
    });
    await asUser(db, coach, async () => {
      await expect(db.query("select * from public.trial_sessions")).rejects.toThrow(PERMISSION_DENIED);
      await expect(db.query("update public.trial_sessions set message_count = 0")).rejects.toThrow(PERMISSION_DENIED);
    });
  });

  it("anon e utenti autenticati non possono chiamare le funzioni della prova", async () => {
    const token = newTokenHash();
    await asAnonymous(db, async () => {
      await expect(db.query("select public.trial_start($1)", [token])).rejects.toThrow(PERMISSION_DENIED);
      await expect(db.query("select public.trial_get($1)", [token])).rejects.toThrow(PERMISSION_DENIED);
      await expect(db.query("select public.trial_complete($1, '{}'::jsonb)", [token])).rejects.toThrow(PERMISSION_DENIED);
      await expect(db.query("select public.trial_rate_limit('x', 60, 1)")).rejects.toThrow(PERMISSION_DENIED);
    });
  });
});

describe("sessione", () => {
  it("una prova nuova ha 3 messaggi disponibili e nessun messaggio", async () => {
    const state = await call("trial_start", [newTokenHash()]);
    expect(state).toMatchObject({ messageCount: 0, completedAt: null, leadEmail: null, messages: [] });
  });

  it("ricaricare la pagina restituisce la stessa prova (niente reset)", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    await call("trial_add_user_message", [token, randomUUID(), "Ciao"]);
    const again = await call("trial_get", [token]);
    expect(again.messageCount).toBe(1);
    expect(again.messages).toHaveLength(1);
  });

  it("con un altro token non si legge la prova di qualcun altro", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    await call("trial_add_user_message", [token, randomUUID(), "Dato riservato"]);
    expect(await call("trial_get", [newTokenHash()])).toBeNull();
  });

  it("una prova scaduta non è più accessibile", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    await db.query("update public.trial_sessions set expires_at = now() - interval '1 minute' where token_hash = $1", [token]);
    expect(await call("trial_get", [token])).toBeNull();
    await expect(call("trial_add_user_message", [token, randomUUID(), "Ciao"])).rejects.toThrow(/prova non trovata/);
  });
});

describe("messaggi: al massimo 3, controllati dal database", () => {
  it("dopo il primo messaggio ne restano 2, e lo stesso invio ripetuto non conta due volte", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    const clientId = randomUUID();
    const first = await call("trial_add_user_message", [token, clientId, "Non ho costanza"]);
    expect(first).toMatchObject({ messageCount: 1, generationLocked: true, inserted: true });

    const duplicate = await call("trial_add_user_message", [token, clientId, "Non ho costanza"]);
    expect(duplicate).toMatchObject({ messageCount: 1, inserted: false });
    expect(duplicate.messages).toHaveLength(1);
  });

  it("finché la risposta non arriva non si può inviare un altro messaggio", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    await call("trial_add_user_message", [token, randomUUID(), "Primo"]);
    await expect(call("trial_add_user_message", [token, randomUUID(), "Secondo"])).rejects.toThrow(/risposta in preparazione/);
  });

  it("una risposta fallita si può rigenerare, ma non due alla volta", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    await call("trial_add_user_message", [token, randomUUID(), "Primo"]);
    await expect(call("trial_claim_generation", [token])).rejects.toThrow(/risposta in preparazione/);

    await call("trial_release_generation", [token]);
    const claimed = await call("trial_claim_generation", [token]);
    expect(claimed.generationLocked).toBe(true);
    await expect(call("trial_claim_generation", [token])).rejects.toThrow(/risposta in preparazione/);

    const replied = await call("trial_add_assistant_message", [token, "Eccomi"]);
    expect(replied.generationLocked).toBe(false);
    expect(replied.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("il terzo messaggio richiede prima nome, email e consenso", async () => {
    const token = await trialWithTwoReplies();
    await expect(call("trial_add_user_message", [token, randomUUID(), "Terzo"])).rejects.toThrow(/servono nome ed email/);
  });

  it("dati non validi o senza consenso vengono rifiutati anche dal database", async () => {
    const token = await trialWithTwoReplies();
    await expect(call("trial_save_lead", [token, "Sara", "non-una-email", true])).rejects.toThrow(/dati non validi/);
    await expect(call("trial_save_lead", [token, "Sara", "sara@example.com", false])).rejects.toThrow(/dati non validi/);
    await expect(call("trial_save_lead", [token, "   ", "sara@example.com", true])).rejects.toThrow(/dati non validi/);
  });

  it("percorso completo: dati, ultima domanda, terzo messaggio, riepilogo; il quarto è rifiutato", async () => {
    const token = await trialWithTwoReplies();
    const lead = await call("trial_save_lead", [token, " Sara ", " Sara@Example.COM ", true]);
    expect(lead).toMatchObject({ leadName: "Sara", leadEmail: "sara@example.com" });

    await call("trial_claim_generation", [token]);
    await call("trial_add_assistant_message", [token, "Ultima domanda, Sara: cosa vorresti cambiare per prima cosa?"]);
    const third = await call("trial_add_user_message", [token, randomUUID(), "Vorrei cenare meglio"]);
    expect(third.messageCount).toBe(3);

    await expect(call("trial_add_user_message", [token, randomUUID(), "Quarto"])).rejects.toThrow(/messaggi esauriti/);

    const summary = { summary: "Riepilogo", insights: ["Uno", "Due"] };
    const completed = await call("trial_complete", [token, JSON.stringify(summary)]);
    expect(completed.completedAt).not.toBeNull();
    expect(completed.summary).toEqual(summary);

    // Ripetere il completamento non cambia il riepilogo; dopo la fine niente più messaggi.
    const repeated = await call("trial_complete", [token, JSON.stringify({ summary: "Altro" })]);
    expect(repeated.summary).toEqual(summary);
    await expect(call("trial_add_user_message", [token, randomUUID(), "Ancora"])).rejects.toThrow(/messaggi esauriti/);
  });

  it("anche una scrittura diretta non può superare i 3 messaggi", async () => {
    const token = newTokenHash();
    await call("trial_start", [token]);
    await expect(db.query("update public.trial_sessions set message_count = 4 where token_hash = $1", [token])).rejects.toThrow(CHECK_VIOLATION);
  });

  it("il riepilogo si salva solo quando il terzo messaggio lo aspetta", async () => {
    const token = await trialWithTwoReplies();
    await expect(call("trial_complete", [token, JSON.stringify({ summary: "Troppo presto" })])).rejects.toThrow(/riepilogo non atteso/);
  });
});

describe("email del riepilogo", () => {
  async function completedTrial(): Promise<string> {
    const token = await trialWithTwoReplies();
    await call("trial_save_lead", [token, "Sara", "sara@example.com", true]);
    await call("trial_add_user_message", [token, randomUUID(), "Terzo"]);
    await call("trial_complete", [token, JSON.stringify({ summary: "Riepilogo" })]);
    return token;
  }

  it("un invio alla volta, al massimo 3 tentativi, mai dopo un invio riuscito", async () => {
    const token = await completedTrial();
    const sending = await call("trial_begin_email", [token]);
    expect(sending).toMatchObject({ emailStatus: "sending", emailAttempts: 1 });
    await expect(call("trial_begin_email", [token])).rejects.toThrow(/invio in corso/);

    expect(await call("trial_finish_email", [token, false])).toMatchObject({ emailStatus: "failed" });
    expect(await call("trial_begin_email", [token])).toMatchObject({ emailStatus: "sending", emailAttempts: 2 });
    expect(await call("trial_finish_email", [token, true])).toMatchObject({ emailStatus: "sent" });

    // Già inviata: lo stato resta "sent", nessun nuovo tentativo.
    expect(await call("trial_begin_email", [token])).toMatchObject({ emailStatus: "sent", emailAttempts: 2 });
  });

  it("dopo 3 tentativi falliti non si riprova più", async () => {
    const token = await completedTrial();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await call("trial_begin_email", [token]);
      await call("trial_finish_email", [token, false]);
    }
    await expect(call("trial_begin_email", [token])).rejects.toThrow(/tentativi esauriti/);
  });

  it("senza prova completata non si invia nulla", async () => {
    const token = await trialWithTwoReplies();
    await expect(call("trial_begin_email", [token])).rejects.toThrow(/nessun riepilogo da inviare/);
  });
});

describe("rate limit", () => {
  it("oltre il massimo della finestra la richiesta non è ammessa", async () => {
    const bucket = `test:${randomUUID()}`;
    const hit = async () =>
      (await asServer(() => db.query<{ allowed: boolean }>("select public.trial_rate_limit($1, 60, 2) as allowed", [bucket]))).rows[0].allowed;
    expect(await hit()).toBe(true);
    expect(await hit()).toBe(true);
    expect(await hit()).toBe(false);
  });
});
