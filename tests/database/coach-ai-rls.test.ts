import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, createUser } from "../support/test-database";

/*
 * Coach AI a livello database (migration reali su Postgres/PGlite): la sicurezza deve reggere
 * anche se l'applicazione avesse un bug.
 *
 *   Giulia (coach)  segue Sara
 *   Marta  (coach)  segue Chiara (nessuna cliente in comune con Giulia)
 *   Anna   (admin)  amministrazione
 *   Luca   (client) utente dell'area clienti
 */

const giulia = randomUUID();
const marta = randomUUID();
const anna = randomUUID();
const luca = randomUUID();

const PERMISSION_DENIED = /permission denied/;
const RLS_VIOLATION = /row-level security/;
const CHECK_VIOLATION = /violates check constraint/;

let db: PGlite;
let sara: string;
let chiara: string;
let giuliaConversation: string;

async function createClientFor(coachId: string, name: string): Promise<string> {
  const result = await asUser(db, coachId, () =>
    db.query<{ id: string }>("select public.create_client_by_staff($1, null, null, current_date) as id", [name]),
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error("cliente non creata");
  return id;
}

async function insertCheckin(clientId: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    "insert into public.checkins (client_id, submitted_at, answers) values ($1, now(), '{}') returning id",
    [clientId],
  );
  return result.rows[0].id;
}

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, { id: giulia, email: "giulia@example.com", fullName: "Giulia Ferri", role: "coach" });
  await createUser(db, { id: marta, email: "marta@example.com", fullName: "Marta Colombo", role: "coach" });
  await createUser(db, { id: anna, email: "anna@example.com", fullName: "Anna Admin", role: "admin" });
  await createUser(db, { id: luca, email: "luca@example.com", fullName: "Luca Neri", role: "client" });
  sara = await createClientFor(giulia, "Sara Bellini");
  chiara = await createClientFor(marta, "Chiara Monti");

  const conversation = await asUser(db, giulia, () =>
    db.query<{ id: string }>("insert into public.ai_conversations (owner_id, title) values ($1, 'Piano per Sara') returning id", [giulia]),
  );
  giuliaConversation = conversation.rows[0].id;
  await asUser(db, giulia, () =>
    db.query("insert into public.ai_messages (conversation_id, owner_id, role, content) values ($1, $2, 'user', 'Ciao')", [
      giuliaConversation,
      giulia,
    ]),
  );
});

describe("conversazioni e messaggi: solo di chi li scrive", () => {
  it("un'altra coach non vede, non modifica e non elimina la conversazione", async () => {
    await asUser(db, marta, async () => {
      expect((await db.query("select id from public.ai_conversations")).rows).toHaveLength(0);
      expect((await db.query("select id from public.ai_messages")).rows).toHaveLength(0);
      expect((await db.query("update public.ai_conversations set title = 'rubata' where id = $1", [giuliaConversation])).affectedRows).toBe(0);
      expect((await db.query("delete from public.ai_conversations where id = $1", [giuliaConversation])).affectedRows).toBe(0);
    });
  });

  it("non si può scrivere un messaggio nella conversazione di un'altra persona", async () => {
    await expect(
      asUser(db, marta, () =>
        db.query("insert into public.ai_messages (conversation_id, owner_id, role, content) values ($1, $2, 'user', 'x')", [giuliaConversation, marta]),
      ),
    ).rejects.toThrow(RLS_VIOLATION);
  });

  it("non ci si può spacciare per un altro proprietario", async () => {
    await expect(
      asUser(db, marta, () => db.query("insert into public.ai_conversations (owner_id, title) values ($1, 'x')", [giulia])),
    ).rejects.toThrow(RLS_VIOLATION);
  });

  it("un utente cliente non può usare Coach AI", async () => {
    await expect(
      asUser(db, luca, () => db.query("insert into public.ai_conversations (owner_id, title) values ($1, 'x')", [luca])),
    ).rejects.toThrow(RLS_VIOLATION);
  });

  it("l'idempotenza del messaggio del browser è garantita dal database", async () => {
    const clientMessageId = randomUUID();
    const insert = () =>
      asUser(db, giulia, () =>
        db.query(
          "insert into public.ai_messages (conversation_id, owner_id, role, content, client_message_id) values ($1, $2, 'user', 'doppio', $3)",
          [giuliaConversation, giulia, clientMessageId],
        ),
      );
    await insert();
    await expect(insert()).rejects.toThrow(/duplicate key/);
  });
});

describe("richieste di azione", () => {
  async function insertRequest(ownerId: string, status: string, key = randomUUID()) {
    return asUser(db, ownerId, () =>
      db.query<{ id: string }>(
        `insert into public.ai_action_requests (owner_id, tool_name, risk_level, status, input, preview, idempotency_key)
         values ($1, 'create_followup', 'write', $2, '{}', '{}', $3) returning id`,
        [ownerId, status, `chiave-${key}`],
      ),
    );
  }

  it("sono visibili e modificabili solo dalla proprietaria", async () => {
    const created = await insertRequest(giulia, "pending");
    const id = created.rows[0].id;
    await asUser(db, marta, async () => {
      expect((await db.query("select id from public.ai_action_requests where id = $1", [id])).rows).toHaveLength(0);
      expect((await db.query("update public.ai_action_requests set status = 'executing' where id = $1", [id])).affectedRows).toBe(0);
    });
  });

  it("la transizione a 'executing' riesce una sola volta (base dell'idempotenza della conferma)", async () => {
    const id = (await insertRequest(giulia, "pending")).rows[0].id;
    const confirm = () =>
      asUser(db, giulia, () =>
        db.query("update public.ai_action_requests set status = 'executing' where id = $1 and status in ('draft', 'pending')", [id]),
      );
    expect((await confirm()).affectedRows).toBe(1);
    expect((await confirm()).affectedRows).toBe(0);
  });

  it("una richiesta non può essere di sola lettura e la chiave di idempotenza è unica per utente", async () => {
    await expect(
      asUser(db, giulia, () =>
        db.query(
          `insert into public.ai_action_requests (owner_id, tool_name, risk_level, status, input, preview, idempotency_key)
           values ($1, 'search_clients', 'read', 'pending', '{}', '{}', 'chiave-lettura')`,
          [giulia],
        ),
      ),
    ).rejects.toThrow(CHECK_VIOLATION);
    const key = randomUUID();
    await insertRequest(giulia, "pending", key);
    await expect(insertRequest(giulia, "pending", key)).rejects.toThrow(/duplicate key/);
  });
});

describe("registro delle azioni: append-only", () => {
  it("si può solo aggiungere, con sé stessi come autore", async () => {
    await asUser(db, giulia, () =>
      db.query("insert into public.ai_action_logs (actor_id, tool_name, risk_level, event) values ($1, 'create_followup', 'write', 'proposed')", [giulia]),
    );
    await expect(
      asUser(db, giulia, () =>
        db.query("insert into public.ai_action_logs (actor_id, tool_name, risk_level, event) values ($1, 'x', 'write', 'succeeded')", [marta]),
      ),
    ).rejects.toThrow(RLS_VIOLATION);
    await expect(asUser(db, giulia, () => db.query("update public.ai_action_logs set event = 'cancelled'"))).rejects.toThrow(PERMISSION_DENIED);
    await expect(asUser(db, giulia, () => db.query("delete from public.ai_action_logs"))).rejects.toThrow(PERMISSION_DENIED);
  });

  it("ogni coach vede solo il proprio registro; l'amministrazione vede tutto", async () => {
    const mine = await asUser(db, marta, () => db.query("select id from public.ai_action_logs"));
    expect(mine.rows).toHaveLength(0);
    const all = await asUser(db, anna, () => db.query("select id from public.ai_action_logs"));
    expect(all.rows.length).toBeGreaterThan(0);
  });
});

describe("automazioni", () => {
  it("per costruzione non possono inviare nulla né saltare la conferma umana", async () => {
    await expect(
      asUser(db, giulia, () =>
        db.query("insert into public.ai_automations (owner_id, trigger, action) values ($1, 'new_checkin', 'generate_reply_draft')", [giulia]).then(() =>
          db.query("update public.ai_automations set config = '{}'::jsonb where owner_id = $1", [giulia]),
        ),
      ),
    ).resolves.toBeDefined();
    // send_message e requires_confirmation non sono nemmeno modificabili dall'utente…
    await expect(asUser(db, giulia, () => db.query("update public.ai_automations set send_message = true"))).rejects.toThrow(PERMISSION_DENIED);
    // …e anche un processo con pieni privilegi viene fermato dai vincoli.
    await expect(db.query("update public.ai_automations set send_message = true")).rejects.toThrow(CHECK_VIOLATION);
    await expect(db.query("update public.ai_automations set requires_confirmation = false")).rejects.toThrow(CHECK_VIOLATION);
    await expect(
      asUser(db, marta, () =>
        db.query("insert into public.ai_automations (owner_id, trigger, action) values ($1, 'followup_due', 'generate_reply_draft')", [marta]),
      ),
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it("un nuovo check-in crea un evento solo per chi segue la cliente e ha la regola attiva", async () => {
    const checkin = await insertCheckin(sara);
    const giuliaEvents = await asUser(db, giulia, () =>
      db.query<{ checkin_id: string; status: string }>("select checkin_id, status from public.ai_automation_events"),
    );
    expect(giuliaEvents.rows).toEqual([{ checkin_id: checkin, status: "pending" }]);
    // Marta non segue Sara e non ha automazioni: nessun evento, e non vede quelli di Giulia.
    const martaEvents = await asUser(db, marta, () => db.query("select id from public.ai_automation_events"));
    expect(martaEvents.rows).toHaveLength(0);
    await insertCheckin(chiara);
    expect((await asUser(db, marta, () => db.query("select id from public.ai_automation_events"))).rows).toHaveLength(0);
  });

  it("gli eventi li scrive solo il database: una coach non può crearli", async () => {
    const automation = await asUser(db, giulia, () => db.query<{ id: string }>("select id from public.ai_automations"));
    await expect(
      asUser(db, giulia, () =>
        db.query("insert into public.ai_automation_events (automation_id, owner_id, trigger) values ($1, $2, 'new_checkin')", [
          automation.rows[0].id,
          giulia,
        ]),
      ),
    ).rejects.toThrow(PERMISSION_DENIED);
  });

  it("la presa in carico di un evento è atomica (due schede non generano due bozze)", async () => {
    const claim = () =>
      asUser(db, giulia, () => db.query("update public.ai_automation_events set status = 'processing' where status = 'pending'"));
    expect((await claim()).affectedRows).toBe(1);
    expect((await claim()).affectedRows).toBe(0);
  });
});

describe("allegati", () => {
  it("il percorso nello storage deve stare nella cartella dell'utente", async () => {
    await expect(
      asUser(db, giulia, () =>
        db.query(
          "insert into public.ai_attachments (owner_id, file_name, mime_type, size_bytes, storage_path) values ($1, 'x.pdf', 'application/pdf', 10, $2)",
          [giulia, `${marta}/rubato.pdf`],
        ),
      ),
    ).rejects.toThrow(RLS_VIOLATION);
    await asUser(db, giulia, () =>
      db.query(
        "insert into public.ai_attachments (owner_id, file_name, mime_type, size_bytes, storage_path) values ($1, 'piano.pdf', 'application/pdf', 10, $2)",
        [giulia, `${giulia}/${randomUUID()}.pdf`],
      ),
    );
    expect((await asUser(db, marta, () => db.query("select id from public.ai_attachments"))).rows).toHaveLength(0);
  });

  it("tipi non ammessi e file troppo grandi sono rifiutati anche dal database", async () => {
    const insert = (mime: string, size: number) =>
      asUser(db, giulia, () =>
        db.query(
          "insert into public.ai_attachments (owner_id, file_name, mime_type, size_bytes, storage_path) values ($1, 'f', $2, $3, $4)",
          [giulia, mime, size, `${giulia}/${randomUUID()}`],
        ),
      );
    await expect(insert("application/x-msdownload", 10)).rejects.toThrow(CHECK_VIOLATION);
    await expect(insert("application/pdf", 5 * 1024 * 1024)).rejects.toThrow(CHECK_VIOLATION);
  });
});

describe("archiviazione delle clienti (soft-delete)", () => {
  it("una coach non può archiviare", async () => {
    await expect(asUser(db, giulia, () => db.query("select public.archive_client($1)", [sara]))).rejects.toThrow(/riservata agli admin/);
  });

  it("archiviata, la cliente e i suoi dati spariscono per lo staff ma restano ripristinabili", async () => {
    await asUser(db, anna, () => db.query("select public.archive_client($1)", [sara]));

    await asUser(db, giulia, async () => {
      expect((await db.query("select id from public.clients where id = $1", [sara])).rows).toHaveLength(0);
      expect((await db.query("select id from public.checkins where client_id = $1", [sara])).rows).toHaveLength(0);
      expect((await db.query("select id from public.client_overview where id = $1", [sara])).rows).toHaveLength(0);
    });
    await asUser(db, anna, async () => {
      // L'amministrazione la trova (per ripristinarla) ma non nelle liste operative.
      expect((await db.query("select id from public.clients where id = $1", [sara])).rows).toHaveLength(1);
      expect((await db.query("select id from public.client_overview where id = $1", [sara])).rows).toHaveLength(0);
    });
    await expect(asUser(db, anna, () => db.query("select public.archive_client($1)", [sara]))).rejects.toThrow(/già archiviata/);

    // I dati non sono stati cancellati.
    expect((await db.query("select id from public.checkins where client_id = $1", [sara])).rows.length).toBeGreaterThan(0);

    await asUser(db, anna, () => db.query("select public.restore_client($1)", [sara]));
    const visible = await asUser(db, giulia, () => db.query("select id from public.client_overview where id = $1", [sara]));
    expect(visible.rows).toHaveLength(1);
  });
});
