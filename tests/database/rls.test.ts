import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnonymous, asUser, createTestDatabase } from "../support/test-database";

/*
 * Test della sicurezza a livello database: carica le migration reali su Postgres (PGlite)
 * e verifica che la RLS regga anche se l'applicazione avesse un bug.
 *
 * Scenario:
 *   Giulia  → clienteGiulia + clienteCondivisa
 *   Marta   → clienteCondivisa (collega di Giulia)
 *   Paola   → clientePaola (nessuna cliente in comune con Giulia)
 */

const giulia = randomUUID();
const marta = randomUUID();
const paola = randomUUID();

const clienteGiulia = randomUUID();
const clienteCondivisa = randomUUID();
const clientePaola = randomUUID();

const checkinCondiviso = randomUUID();
const checkinPaola = randomUUID();
const notaDiMarta = randomUUID();

const PERMISSION_DENIED = /permission denied/;
const RLS_VIOLATION = /row-level security/;

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'giulia@example.com', '{"full_name": "Giulia Test"}'),
       ($2, 'marta@example.com', '{"full_name": "Marta Test"}'),
       ($3, 'paola@example.com', '{"full_name": "Paola Test", "role": "admin"}')`,
    [giulia, marta, paola],
  );
  // Le coach si creano internamente: il ruolo viene impostato da un operatore, non dall'utente.
  await db.query("update public.profiles set role = 'coach' where id in ($1, $2, $3)", [giulia, marta, paola]);
  await db.query(
    `insert into public.clients (id, full_name, status) values
       ($1, 'Cliente di Giulia', 'active'),
       ($2, 'Cliente condivisa', 'active'),
       ($3, 'Cliente di Paola', 'active')`,
    [clienteGiulia, clienteCondivisa, clientePaola],
  );
  await db.query(
    `insert into public.coach_clients (coach_id, client_id) values
       ($1, $3), ($1, $4), ($2, $4), ($5, $6)`,
    [giulia, marta, clienteGiulia, clienteCondivisa, paola, clientePaola],
  );
  await db.query(
    `insert into public.checkins (id, client_id, submitted_at, answers) values
       ($1, $2, now(), '{}'),
       ($3, $4, now(), '{}')`,
    [checkinCondiviso, clienteCondivisa, checkinPaola, clientePaola],
  );
  await db.query(
    `insert into public.coach_notes (id, client_id, coach_id, content) values
       ($1, $2, $3, 'Nota scritta da Marta')`,
    [notaDiMarta, clienteCondivisa, marta],
  );
  await db.query(
    `insert into public.coach_notes (client_id, coach_id, content) values ($1, $2, 'Nota di Paola')`,
    [clientePaola, paola],
  );
  await db.query(
    `insert into public.followups (client_id, coach_id, title, due_on) values ($1, $2, 'Chiamata', current_date)`,
    [clientePaola, paola],
  );
  await db.query(
    `insert into public.ai_interactions (coach_id, client_id, request_type) values ($1, $2, 'copilot_question')`,
    [paola, clientePaola],
  );
});

afterAll(async () => {
  await db.close();
});

function idsOf(rows: Array<{ id: string }>): string[] {
  return rows.map((row) => row.id).sort();
}

describe("RLS — isolamento tra coach", () => {
  it("una coach vede solo le clienti assegnate", async () => {
    const rows = await asUser(db, giulia, async () => (await db.query<{ id: string }>("select id from public.clients")).rows);
    expect(idsOf(rows)).toEqual([clienteGiulia, clienteCondivisa].sort());
  });

  it("la vista client_overview rispetta la RLS delle tabelle sottostanti", async () => {
    const rows = await asUser(
      db,
      giulia,
      async () => (await db.query<{ id: string }>("select id from public.client_overview")).rows,
    );
    expect(idsOf(rows)).toEqual([clienteGiulia, clienteCondivisa].sort());
  });

  it("non legge check-in, note e follow-up di clienti non assegnate", async () => {
    await asUser(db, giulia, async () => {
      for (const table of ["checkins", "coach_notes", "followups", "ai_analyses"]) {
        const result = await db.query(`select 1 from public.${table} where client_id = $1`, [clientePaola]);
        expect(result.rows, table).toHaveLength(0);
      }
    });
  });

  it("non vede le interazioni AI di altre coach", async () => {
    const rows = await asUser(db, giulia, async () => (await db.query("select 1 from public.ai_interactions")).rows);
    expect(rows).toHaveLength(0);
  });
});

describe("RLS — scritture", () => {
  it("non può creare note su una cliente non assegnata", async () => {
    await asUser(db, giulia, async () => {
      await expect(
        db.query("insert into public.coach_notes (client_id, coach_id, content) values ($1, $2, 'x')", [
          clientePaola,
          giulia,
        ]),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });

  it("non può firmare una nota a nome di una collega", async () => {
    await asUser(db, giulia, async () => {
      await expect(
        db.query("insert into public.coach_notes (client_id, coach_id, content) values ($1, $2, 'x')", [
          clienteCondivisa,
          marta,
        ]),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });

  it("non può modificare né eliminare le note di una collega", async () => {
    await asUser(db, giulia, async () => {
      const updated = await db.query("update public.coach_notes set content = 'modificata' where id = $1", [notaDiMarta]);
      const deleted = await db.query("delete from public.coach_notes where id = $1", [notaDiMarta]);
      expect(updated.affectedRows).toBe(0);
      expect(deleted.affectedRows).toBe(0);
    });
    const note = await db.query<{ content: string }>("select content from public.coach_notes where id = $1", [notaDiMarta]);
    expect(note.rows[0]?.content).toBe("Nota scritta da Marta");
  });

  it("può modificare le proprie note e il trigger aggiorna updated_at", async () => {
    const inserted = await asUser(db, giulia, async () =>
      db.query<{ id: string }>(
        "insert into public.coach_notes (client_id, coach_id, content) values ($1, $2, 'Prima versione') returning id",
        [clienteGiulia, giulia],
      ),
    );
    const noteId = inserted.rows[0]?.id;
    await db.query("update public.coach_notes set updated_at = '2020-01-01' where id = $1", [noteId]);

    await asUser(db, giulia, async () => {
      const updated = await db.query("update public.coach_notes set content = 'Seconda versione' where id = $1", [noteId]);
      expect(updated.affectedRows).toBe(1);
    });

    const note = await db.query<{ content: string; updated_at: Date }>(
      "select content, updated_at from public.coach_notes where id = $1",
      [noteId],
    );
    expect(note.rows[0]?.content).toBe("Seconda versione");
    expect(note.rows[0]?.updated_at.getUTCFullYear()).toBeGreaterThan(2020);
  });

  it("crea follow-up solo in stato pending; completed_at è gestito dal trigger", async () => {
    await asUser(db, giulia, async () => {
      await expect(
        db.query(
          "insert into public.followups (client_id, coach_id, title, due_on, status) values ($1, $2, 'x', current_date, 'completed')",
          [clienteGiulia, giulia],
        ),
      ).rejects.toThrow(PERMISSION_DENIED);

      const inserted = await db.query<{ id: string }>(
        "insert into public.followups (client_id, coach_id, title, due_on) values ($1, $2, 'Richiamare', current_date) returning id",
        [clienteGiulia, giulia],
      );
      const followupId = inserted.rows[0]?.id;

      const completed = await db.query<{ completed_at: Date | null }>(
        "update public.followups set status = 'completed' where id = $1 returning completed_at",
        [followupId],
      );
      expect(completed.rows[0]?.completed_at).not.toBeNull();

      const reopened = await db.query<{ completed_at: Date | null }>(
        "update public.followups set status = 'pending' where id = $1 returning completed_at",
        [followupId],
      );
      expect(reopened.rows[0]?.completed_at).toBeNull();
    });
  });

  it("non può spostare un follow-up su un'altra cliente", async () => {
    await asUser(db, giulia, async () => {
      await expect(
        db.query("update public.followups set client_id = $1 where client_id = $2", [clienteCondivisa, clienteGiulia]),
      ).rejects.toThrow(PERMISSION_DENIED);
    });
  });

  it("registra la revisione di un check-in solo a proprio nome", async () => {
    await asUser(db, giulia, async () => {
      await expect(
        db.query("update public.checkins set reviewed_at = now(), reviewed_by = $1 where id = $2", [
          marta,
          checkinCondiviso,
        ]),
      ).rejects.toThrow(RLS_VIOLATION);

      const reviewed = await db.query("update public.checkins set reviewed_at = now(), reviewed_by = $1 where id = $2", [
        giulia,
        checkinCondiviso,
      ]);
      expect(reviewed.affectedRows).toBe(1);
    });
  });

  it("non può revisionare check-in di clienti non assegnate", async () => {
    await asUser(db, giulia, async () => {
      const result = await db.query("update public.checkins set reviewed_at = now(), reviewed_by = $1 where id = $2", [
        giulia,
        checkinPaola,
      ]);
      expect(result.affectedRows).toBe(0);
    });
  });

  it("non può salvare analisi AI per clienti non assegnate", async () => {
    await asUser(db, giulia, async () => {
      await expect(
        db.query(
          `insert into public.ai_analyses
             (client_id, checkin_id, coach_id, summary, follow_up_needed, confidence, provider, model, prompt_version)
           values ($1, $2, $3, 'x', false, 'low', 'mock', 'mock', 'v1')`,
          [clientePaola, checkinPaola, giulia],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });
});

describe("RLS — ruoli e profili", () => {
  it("il ruolo non viene mai letto dai metadata: chi si registra nasce cliente", async () => {
    const intruder = randomUUID();
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'intrusa@example.com', '{"full_name": "Intrusa", "role": "admin"}')`,
      [intruder],
    );
    const profile = await db.query<{ role: string }>("select role from public.profiles where id = $1", [intruder]);
    expect(profile.rows[0]?.role).toBe("client");
  });

  it("una coach non può promuoversi ad admin", async () => {
    await asUser(db, giulia, async () => {
      await expect(db.query("update public.profiles set role = 'admin' where id = $1", [giulia])).rejects.toThrow(
        PERMISSION_DENIED,
      );
    });
  });

  it("una coach può aggiornare il proprio nome ma non quello delle colleghe", async () => {
    await asUser(db, giulia, async () => {
      const own = await db.query("update public.profiles set full_name = 'Giulia Nuovo Nome' where id = $1", [giulia]);
      const colleague = await db.query("update public.profiles set full_name = 'x' where id = $1", [marta]);
      expect(own.affectedRows).toBe(1);
      expect(colleague.affectedRows).toBe(0);
    });
  });

  it("vede il profilo delle colleghe con clienti in comune, non degli altri", async () => {
    const rows = await asUser(db, giulia, async () => (await db.query<{ id: string }>("select id from public.profiles")).rows);
    expect(idsOf(rows)).toEqual([giulia, marta].sort());
  });

  it("un admin vede tutte le clienti", async () => {
    await db.query("update public.profiles set role = 'admin' where id = $1", [paola]);
    try {
      const rows = await asUser(db, paola, async () => (await db.query("select id from public.clients")).rows);
      expect(rows).toHaveLength(3);
    } finally {
      await db.query("update public.profiles set role = 'coach' where id = $1", [paola]);
    }
  });
});

describe("RLS — accesso anonimo", () => {
  it("un utente non autenticato non può leggere nessuna tabella", async () => {
    const tables = [
      "profiles",
      "clients",
      "coach_clients",
      "checkins",
      "coach_notes",
      "followups",
      "ai_analyses",
      "ai_interactions",
      "client_overview",
    ];
    await asAnonymous(db, async () => {
      for (const table of tables) {
        await expect(db.query(`select 1 from public.${table}`), table).rejects.toThrow(PERMISSION_DENIED);
      }
    });
  });
});

describe("Integrità referenziale", () => {
  it("un'analisi AI non può puntare al check-in di un'altra cliente", async () => {
    await expect(
      db.query(
        `insert into public.ai_analyses
           (client_id, checkin_id, coach_id, summary, follow_up_needed, confidence, provider, model, prompt_version)
         values ($1, $2, $3, 'x', false, 'low', 'mock', 'mock', 'v1')`,
        [clienteGiulia, checkinPaola, giulia],
      ),
    ).rejects.toThrow(/foreign key/);
  });
});
