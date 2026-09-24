import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnonymous, asUser, createTestDatabase, createUser } from "../support/test-database";

/*
 * Portale clienti: ruoli, inviti, auto-iscrizioni e approvazioni, verificati sulle migration reali.
 *
 *   Giulia (coach)  invita "Sara" (sara@example.com)
 *   Sara   (client) email verificata      → si collega all'invito, approvata
 *   Nadia  (client) si iscrive da sola    → in attesa finché l'admin non approva
 *   Eva    (client) email NON verificata  → non può collegarsi a nessun invito
 *   Anna   (admin)  approva e assegna
 *   Marta  (coach)  nessuna relazione con le clienti di Giulia
 */

const giulia = randomUUID();
const marta = randomUUID();
const anna = randomUUID();
const sara = randomUUID();
const nadia = randomUUID();
const eva = randomUUID();

const CONSENT_PROFILE = {
  fullName: "Sara Bianchi",
  goal: "Più energia durante la settimana",
  phone: "+39 333 1234567",
  birthDate: "1990-05-12",
  experienceLevel: "beginner",
  weeklyAvailability: 3,
  preferredContact: "whatsapp",
  notesForCoach: "Lavoro su turni",
  privacyConsent: true,
};

const VALID_ANSWERS = {
  version: 1,
  energy: 3,
  sleepQuality: 3,
  stress: 3,
  nutritionAdherence: 3,
  trainingSessionsDone: 2,
  trainingSessionsPlanned: 3,
  wins: "Due allenamenti",
  challenges: "Poco tempo",
  questionsForCoach: null,
};

let db: PGlite;
let invitedClientId: string;

async function rpc<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const result = await db.query<{ value: T }>(sql, params);
  return result.rows[0]?.value;
}

beforeAll(async () => {
  db = await createTestDatabase();
  await createUser(db, { id: giulia, email: "giulia@example.com", fullName: "Giulia Ferri", role: "coach" });
  await createUser(db, { id: marta, email: "marta@example.com", fullName: "Marta Colli", role: "coach" });
  await createUser(db, { id: anna, email: "anna@example.com", fullName: "Anna Admin", role: "admin" });
  await createUser(db, { id: sara, email: "sara@example.com", fullName: "Sara", role: "client" });
  await createUser(db, { id: nadia, email: "nadia@example.com", fullName: "Nadia", role: "client" });
  await createUser(db, { id: eva, email: "eva@example.com", fullName: "Eva", role: "client", emailConfirmed: false });

  const created = await asUser(db, giulia, () =>
    rpc<string>("select public.create_client_by_staff($1, $2, $3, current_date) as value", [
      "Sara Bianchi",
      "Sara@Example.com",
      "Più energia",
    ]),
  );
  if (!created) throw new Error("Creazione della cliente non riuscita");
  invitedClientId = created;

  // Anche un invito con l'email di Eva, per verificare che senza email verificata non si colleghi.
  await asUser(db, giulia, () => rpc("select public.create_client_by_staff('Eva Invitata', 'eva@example.com', null, null) as value"));
});

afterAll(async () => {
  await db.close();
});

describe("creazione di una cliente da parte della coach", () => {
  it("la cliente nasce approvata, con email normalizzata e assegnata a chi la crea", async () => {
    const client = await db.query<{ approval_status: string; email: string }>(
      "select approval_status, email from public.clients where id = $1",
      [invitedClientId],
    );
    const assignment = await db.query("select 1 from public.coach_clients where coach_id = $1 and client_id = $2", [
      giulia,
      invitedClientId,
    ]);
    expect(client.rows[0]).toEqual({ approval_status: "approved", email: "sara@example.com" });
    expect(assignment.rows).toHaveLength(1);
  });

  it("una cliente non può creare schede", async () => {
    await asUser(db, nadia, async () => {
      await expect(db.query("select public.create_client_by_staff('X', null, null, null)")).rejects.toThrow(
        /riservata allo staff/,
      );
    });
  });

  it("un visitatore anonimo non può eseguire nessuna funzione", async () => {
    await asAnonymous(db, async () => {
      await expect(db.query("select public.create_client_by_staff('X', null, null, null)")).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.query("select public.submit_client_checkin('{}'::jsonb)")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("onboarding della cliente", () => {
  it("senza email verificata non ci si può collegare a un invito", async () => {
    await asUser(db, eva, async () => {
      await expect(
        db.query("select public.complete_client_onboarding($1::jsonb, null)", [JSON.stringify(CONSENT_PROFILE)]),
      ).rejects.toThrow(/Email non verificata/);
    });
  });

  it("il consenso privacy è obbligatorio", async () => {
    await asUser(db, sara, async () => {
      await expect(
        db.query("select public.complete_client_onboarding($1::jsonb, null)", [
          JSON.stringify({ ...CONSENT_PROFILE, privacyConsent: false }),
        ]),
      ).rejects.toThrow(/Consenso privacy/);
    });
  });

  it("con email verificata la cliente si collega all'invito della coach ed è già approvata", async () => {
    const status = await asUser(db, sara, () =>
      rpc<string>("select public.complete_client_onboarding($1::jsonb, $2::jsonb) as value", [
        JSON.stringify(CONSENT_PROFILE),
        JSON.stringify({ hasInjuries: true, description: "Distorsione alla caviglia l'anno scorso", followup: [], questionsSource: "standard" }),
      ]),
    );
    const linked = await db.query<{ user_id: string }>("select user_id from public.clients where id = $1", [invitedClientId]);

    expect(status).toBe("approved");
    expect(linked.rows[0]?.user_id).toBe(sara);
  });

  it("chi si iscrive da sola ottiene una nuova scheda in attesa, senza coach", async () => {
    const status = await asUser(db, nadia, () =>
      rpc<string>("select public.complete_client_onboarding($1::jsonb, null) as value", [
        JSON.stringify({ ...CONSENT_PROFILE, fullName: "Nadia Russo" }),
      ]),
    );
    const record = await db.query<{ id: string; approval_status: string }>(
      "select id, approval_status from public.clients where user_id = $1",
      [nadia],
    );
    expect(record.rows).toHaveLength(1);
    const assignments = await db.query("select 1 from public.coach_clients where client_id = $1", [record.rows[0]?.id]);

    expect(status).toBe("pending");
    expect(record.rows[0]?.approval_status).toBe("pending");
    expect(assignments.rows).toHaveLength(0);
  });
});

describe("cosa vede e cosa può fare una cliente", () => {
  it("vede solo la propria scheda e le proprie coach", async () => {
    await asUser(db, sara, async () => {
      const clients = await db.query<{ id: string }>("select id from public.clients");
      const profiles = await db.query<{ id: string }>("select id from public.profiles order by full_name");
      expect(clients.rows.map((row) => row.id)).toEqual([invitedClientId]);
      expect(profiles.rows.map((row) => row.id).sort()).toEqual([giulia, sara].sort());
    });
  });

  it("non vede note, analisi AI, follow-up né interazioni dello staff", async () => {
    await db.query("insert into public.coach_notes (client_id, coach_id, content) values ($1, $2, 'Nota interna')", [
      invitedClientId,
      giulia,
    ]);
    await asUser(db, sara, async () => {
      for (const table of ["coach_notes", "ai_analyses", "followups", "coach_clients"]) {
        const result = await db.query(`select 1 from public.${table}`);
        expect(result.rows, table).toHaveLength(0);
      }
    });
  });

  it("non può modificare direttamente la propria scheda (es. approvarsi da sola)", async () => {
    const nadiaClient = await db.query<{ id: string }>("select id from public.clients where user_id = $1", [nadia]);
    await asUser(db, nadia, async () => {
      const result = await db.query("update public.clients set approval_status = 'approved' where id = $1", [
        nadiaClient.rows[0]?.id,
      ]);
      expect(result.affectedRows).toBe(0);
    });
    const after = await db.query<{ approval_status: string }>("select approval_status from public.clients where user_id = $1", [nadia]);
    expect(after.rows[0]?.approval_status).toBe("pending");
  });

  it("in attesa di approvazione non può inviare check-in", async () => {
    await asUser(db, nadia, async () => {
      await expect(db.query("select public.submit_client_checkin($1::jsonb)", [JSON.stringify(VALID_ANSWERS)])).rejects.toThrow(
        /non abilitato/,
      );
    });
  });

  it("approvata, invia un check-in (uno ogni 20 ore) e lo vede insieme alla risposta della coach", async () => {
    const checkinId = await asUser(db, sara, () =>
      rpc<string>("select public.submit_client_checkin($1::jsonb) as value", [JSON.stringify(VALID_ANSWERS)]),
    );
    await asUser(db, sara, async () => {
      await expect(db.query("select public.submit_client_checkin($1::jsonb)", [JSON.stringify(VALID_ANSWERS)])).rejects.toThrow(
        /già inviato/,
      );
    });

    await db.query("update public.checkins set reviewed_at = now(), reviewed_by = $1, coach_reply = 'Brava!' where id = $2", [
      giulia,
      checkinId,
    ]);
    const visible = await asUser(db, sara, async () =>
      (await db.query<{ coach_reply: string }>("select coach_reply from public.checkins")).rows,
    );
    expect(visible).toEqual([{ coach_reply: "Brava!" }]);
  });
});

describe("dati su infortuni e traumi", () => {
  it("sono visibili alla coach assegnata e non alle altre coach", async () => {
    const giuliaView = await asUser(db, giulia, async () => (await db.query("select 1 from public.client_health_profiles")).rows);
    const martaView = await asUser(db, marta, async () => (await db.query("select 1 from public.client_health_profiles")).rows);
    expect(giuliaView).toHaveLength(1);
    expect(martaView).toHaveLength(0);
  });

  it("non sono modificabili direttamente, nemmeno dalla cliente", async () => {
    await asUser(db, sara, async () => {
      await expect(db.query("update public.client_health_profiles set description = 'x'")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("approvazione dell'admin", () => {
  it("solo un admin può approvare, e solo verso una coach reale", async () => {
    const nadiaClient = await db.query<{ id: string }>("select id from public.clients where user_id = $1", [nadia]);
    const clientId = nadiaClient.rows[0]?.id;

    await asUser(db, giulia, async () => {
      await expect(
        db.query("select public.review_client_registration($1, 'approved', $2)", [clientId, giulia]),
      ).rejects.toThrow(/riservata agli admin/);
    });
    await asUser(db, anna, async () => {
      await expect(
        db.query("select public.review_client_registration($1, 'approved', $2)", [randomUUID(), marta]),
      ).rejects.toThrow(/Cliente non trovata/);
      await expect(
        db.query("select public.review_client_registration($1, 'approved', $2)", [clientId, sara]),
      ).rejects.toThrow(/Coach non valida/);
      await db.query("select public.review_client_registration($1, 'approved', $2)", [clientId, marta]);
    });

    const approved = await db.query<{ approval_status: string }>("select approval_status from public.clients where id = $1", [clientId]);
    const assigned = await db.query("select 1 from public.coach_clients where coach_id = $1 and client_id = $2", [marta, clientId]);
    expect(approved.rows[0]?.approval_status).toBe("approved");
    expect(assigned.rows).toHaveLength(1);

    const checkinId = await asUser(db, nadia, () =>
      rpc<string>("select public.submit_client_checkin($1::jsonb) as value", [JSON.stringify(VALID_ANSWERS)]),
    );
    expect(checkinId).toBeTypeOf("string");
  });

  it("solo una richiesta rifiutata può tornare in attesa", async () => {
    const nadiaClient = await db.query<{ id: string }>("select id from public.clients where user_id = $1", [nadia]);
    const clientId = nadiaClient.rows[0]?.id;

    await asUser(db, anna, async () => {
      // Nadia è già approvata: non si "ripristina" una cliente attiva.
      await expect(db.query("select public.review_client_registration($1, 'pending', null)", [clientId])).rejects.toThrow(
        /Solo una richiesta rifiutata/,
      );
      await db.query("select public.review_client_registration($1, 'rejected', null)", [clientId]);
      await db.query("select public.review_client_registration($1, 'pending', null)", [clientId]);
    });

    const restored = await db.query<{ approval_status: string; reviewed_at: string | null }>(
      "select approval_status, reviewed_at from public.clients where id = $1",
      [clientId],
    );
    expect(restored.rows[0]).toEqual({ approval_status: "pending", reviewed_at: null });
  });
});
