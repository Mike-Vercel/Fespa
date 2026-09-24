import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, createUser } from "../support/test-database";

/*
 * Ruoli dello staff e gestione degli utenti, sulle migration reali.
 *
 *   Sofia  (super_admin)  gestisce i ruoli
 *   Anna   (admin)        amministrazione: iscrizioni e assegnazioni, ma non i ruoli
 *   Giulia (coach)        segue "Sara Bianchi"
 *   Luca   (client)       si è iscritto e ha una richiesta in attesa → diventerà coach
 */

const sofia = randomUUID();
const anna = randomUUID();
const giulia = randomUUID();
const luca = randomUUID();

let db: PGlite;
let saraClientId: string;

async function roleOf(userId: string): Promise<string | undefined> {
  const result = await db.query<{ role: string }>("select role from public.profiles where id = $1", [userId]);
  return result.rows[0]?.role;
}

async function coachIdsOf(clientId: string): Promise<string[]> {
  const result = await db.query<{ coach_id: string }>(
    "select coach_id from public.coach_clients where client_id = $1 order by coach_id",
    [clientId],
  );
  return result.rows.map((row) => row.coach_id);
}

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, { id: sofia, email: "sofia@example.com", fullName: "Sofia Super", role: "super_admin" });
  await createUser(db, { id: anna, email: "anna@example.com", fullName: "Anna Admin", role: "admin" });
  await createUser(db, { id: giulia, email: "giulia@example.com", fullName: "Giulia Ferri", role: "coach" });
  await createUser(db, { id: luca, email: "luca@example.com", fullName: "Luca Neri", role: "client" });

  const created = await asUser(db, giulia, () =>
    db.query<{ id: string }>("select public.create_client_by_staff('Sara Bianchi', null, null, current_date) as id"),
  );
  const id = created.rows[0]?.id;
  if (!id) throw new Error("Creazione della cliente non riuscita");
  saraClientId = id;

  // Luca si iscrive come cliente: richiesta in attesa di approvazione.
  await asUser(db, luca, () =>
    db.query("select public.complete_client_onboarding($1::jsonb, null)", [
      JSON.stringify({
        fullName: "Luca Neri",
        goal: "Allenarmi",
        birthDate: "1990-01-01",
        experienceLevel: "beginner",
        weeklyAvailability: 3,
        preferredContact: "email",
        privacyConsent: true,
      }),
    ]),
  );
});

afterAll(async () => {
  await db.close();
});

describe("elenco degli utenti", () => {
  it("l'amministrazione vede tutti gli account con email e stato della richiesta", async () => {
    const users = await asUser(db, anna, () =>
      db.query<{ email: string; role: string; approval_status: string | null }>(
        "select email, role, approval_status from public.admin_list_users()",
      ),
    );
    expect(users.rows).toHaveLength(4);
    expect(users.rows).toContainEqual({ email: "luca@example.com", role: "client", approval_status: "pending" });
  });

  it("coach e clienti non possono elencare gli utenti", async () => {
    for (const userId of [giulia, luca]) {
      await asUser(db, userId, async () => {
        await expect(db.query("select * from public.admin_list_users()")).rejects.toThrow(/riservata agli admin/);
      });
    }
  });
});

describe("cambio di ruolo", () => {
  it("l'amministrazione non può cambiare i ruoli: serve il super admin", async () => {
    await asUser(db, anna, async () => {
      await expect(db.query("select public.set_user_role($1, 'coach')", [luca])).rejects.toThrow(/super admin/);
    });
    expect(await roleOf(luca)).toBe("client");
  });

  it("nessuno può cambiare il proprio ruolo", async () => {
    await asUser(db, sofia, async () => {
      await expect(db.query("select public.set_user_role($1, 'client')", [sofia])).rejects.toThrow(/tuo ruolo/);
    });
  });

  it("promuovere una cliente a coach elimina la sua richiesta di iscrizione in attesa", async () => {
    await asUser(db, sofia, () => db.query("select public.set_user_role($1, 'coach')", [luca]));
    const leftovers = await db.query("select 1 from public.clients where user_id = $1", [luca]);
    expect(await roleOf(luca)).toBe("coach");
    expect(leftovers.rows).toHaveLength(0);
  });

  it("una coach riportata a cliente perde assegnazioni e accesso ai dati", async () => {
    expect(await coachIdsOf(saraClientId)).toEqual([giulia]);
    await asUser(db, sofia, () => db.query("select public.set_user_role($1, 'client')", [giulia]));

    expect(await roleOf(giulia)).toBe("client");
    expect(await coachIdsOf(saraClientId)).toEqual([]);
    const visible = await asUser(db, giulia, () => db.query("select id from public.clients"));
    expect(visible.rows).toHaveLength(0);

    // La cliente resta visibile all'amministrazione, senza coach.
    const forAdmin = await asUser(db, anna, () =>
      db.query<{ coach_count: number }>("select coach_count from public.client_overview where id = $1", [saraClientId]),
    );
    expect(forAdmin.rows[0]?.coach_count).toBe(0);
  });
});

describe("assegnazione delle coach", () => {
  it("l'amministrazione sostituisce l'elenco delle coach di una cliente", async () => {
    await asUser(db, anna, () => db.query("select public.set_client_coaches($1, $2::uuid[])", [saraClientId, [luca, anna]]));
    expect(await coachIdsOf(saraClientId)).toEqual([luca, anna].sort());

    await asUser(db, anna, () => db.query("select public.set_client_coaches($1, $2::uuid[])", [saraClientId, [luca]]));
    expect(await coachIdsOf(saraClientId)).toEqual([luca]);
  });

  it("solo verso membri dello staff, e solo per l'amministrazione", async () => {
    await asUser(db, anna, async () => {
      await expect(
        db.query("select public.set_client_coaches($1, $2::uuid[])", [saraClientId, [giulia]]),
      ).rejects.toThrow(/Coach non valida/);
    });
    await asUser(db, luca, async () => {
      await expect(
        db.query("select public.set_client_coaches($1, $2::uuid[])", [saraClientId, [luca]]),
      ).rejects.toThrow(/riservata agli admin/);
    });
    expect(await coachIdsOf(saraClientId)).toEqual([luca]);
  });

  it("il super admin ha anche tutti i poteri dell'amministrazione", async () => {
    const visible = await asUser(db, sofia, () => db.query("select id from public.clients"));
    expect(visible.rows.length).toBeGreaterThan(0);
    await asUser(db, sofia, () => db.query("select public.set_client_coaches($1, $2::uuid[])", [saraClientId, [sofia]]));
    expect(await coachIdsOf(saraClientId)).toEqual([sofia]);
  });
});
