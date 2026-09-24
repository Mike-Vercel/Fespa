/**
 * Popola il progetto Supabase con i dati demo di FESPA Coach AI.
 *
 *   npm run db:seed        (legge .env.local)
 *
 * - Crea (o riallinea) gli account demo tramite l'Admin API di Supabase Auth, con il ruolo
 *   impostato esplicitamente (super_admin, admin, coach, client).
 * - Cancella e ricrea SOLO i dati demo (clienti delle coach demo e iscrizioni demo):
 *   nessun altro dato viene toccato.
 * - Le date sono relative ad "adesso": la demo resta sempre attuale.
 *
 * Usa la service role key: è l'unico punto del progetto che la legge, e gira solo in locale.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { addDays, calendarDateIn } from "../src/domain/dates";
import type { Database, DbEnum } from "../src/server/db/database.types";
import { checkinAnswersSchema } from "../src/validation/checkin";
import { onboardingHealthSchema, onboardingProfileSchema, STANDARD_INJURY_QUESTIONS } from "../src/validation/onboarding";
import {
  DEMO_COACHES,
  DEMO_MANAGERS,
  DEMO_REGISTRATIONS,
  type DemoCheckin,
  type DemoClient,
  type DemoFollowup,
  type DemoHealth,
  type DemoProfile,
  type DemoRegistration,
} from "./demo-data";

type AdminClient = SupabaseClient<Database>;
type Role = DbEnum<"app_role">;

const MIN_PASSWORD_LENGTH = 12;
const USERS_PAGE_SIZE = 200;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DEFAULT_CHECKIN_HOUR = 19;
const NOTE_HOUR = 18;
const ONBOARDING_HOUR = 10;
const REGISTRATION_HOUR = 21;
const REVIEW_DELAY_HOURS = 14;
/** Un evento "di oggi" non può essere nel futuro: al massimo di poco precedente ad adesso. */
const MIN_DISTANCE_FROM_NOW_MS = 30 * MINUTE_MS;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`Manca la variabile ${name} in .env.local (vedi .env.example).`);
  }
  return value;
}

function demoEmail(localPart: string, domain: string): string {
  return `${localPart}@${domain}`.toLowerCase();
}

// --- Date nel fuso della coach ---------------------------------------------------

function timezoneOffsetMs(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const wallClockAsUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return wallClockAsUtc - instant.getTime();
}

/** Istante corrispondente a "giorno X, ore H" nel fuso indicato, mai oltre adesso. */
function localInstant(calendarDate: string, hour: number, timezone: string, now: Date): string {
  const wallClockAsUtc = new Date(`${calendarDate}T${String(hour).padStart(2, "0")}:00:00Z`);
  const instant = new Date(wallClockAsUtc.getTime() - timezoneOffsetMs(wallClockAsUtc, timezone));
  const latestAllowed = now.getTime() - MIN_DISTANCE_FROM_NOW_MS;
  return new Date(Math.min(instant.getTime(), latestAllowed)).toISOString();
}

// --- Account demo ------------------------------------------------------------------

async function listAllUsers(admin: AdminClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USERS_PAGE_SIZE });
    if (error) fail(`Impossibile leggere gli utenti: ${error.message}. La service role key è corretta?`);
    users.push(...data.users);
    if (data.users.length < USERS_PAGE_SIZE) return users;
  }
}

async function createOrUpdateUser(
  admin: AdminClient,
  existingUsers: User[],
  account: { email: string; fullName: string; password: string },
): Promise<string> {
  const existing = existingUsers.find((user) => user.email?.toLowerCase() === account.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (error) fail(`Impossibile aggiornare ${account.email}: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName },
  });
  if (error) {
    fail(
      `Impossibile creare ${account.email}: ${error.message}\n` +
        "  - Hai applicato le migration (supabase/migrations) al progetto?\n" +
        "  - Se il dominio email viene rifiutato, imposta SEED_DEMO_EMAIL_DOMAIN in .env.local.",
    );
  }
  return data.user.id;
}

/** Account con ruolo esplicito: il trigger del database crea ogni nuovo profilo come "client". */
async function ensureAccount(
  admin: AdminClient,
  existingUsers: User[],
  account: { email: string; fullName: string; password: string; role: Role },
): Promise<string> {
  const userId = await createOrUpdateUser(admin, existingUsers, account);
  const { error } = await admin.from("profiles").update({ full_name: account.fullName, role: account.role }).eq("id", userId);
  if (error) fail(`Impossibile impostare il ruolo di ${account.email}: ${error.message}`);
  return userId;
}

// --- Pulizia -----------------------------------------------------------------------

async function removeExistingDemoData(admin: AdminClient, coachId: string): Promise<void> {
  const { data: assignments, error } = await admin.from("coach_clients").select("client_id").eq("coach_id", coachId);
  if (error) fail(`Lettura delle assegnazioni fallita: ${error.message}`);

  const clientIds = assignments.map((assignment) => assignment.client_id);
  if (clientIds.length > 0) {
    // Le FK con on delete cascade rimuovono check-in, note, follow-up, analisi e dati sanitari collegati.
    const { error: deleteError } = await admin.from("clients").delete().in("id", clientIds);
    if (deleteError) fail(`Pulizia delle clienti demo fallita: ${deleteError.message}`);
  }
  await admin.from("ai_interactions").delete().eq("coach_id", coachId);
}

/** Schede legate alle email o agli account demo, anche se non (più) assegnate a una coach demo. */
async function removeDemoClientRecords(admin: AdminClient, emails: string[], userIds: string[]): Promise<void> {
  const byEmail = await admin.from("clients").delete().in("email", emails);
  if (byEmail.error) fail(`Pulizia delle schede demo fallita: ${byEmail.error.message}`);
  const byUser = await admin.from("clients").delete().in("user_id", userIds);
  if (byUser.error) fail(`Pulizia delle schede demo fallita: ${byUser.error.message}`);
}

// --- Dati di dominio -------------------------------------------------------------

type SeedContext = {
  admin: AdminClient;
  now: Date;
  today: string;
  timezone: string;
  emailDomain: string;
  /** Account delle clienti demo, per emailLocalPart. */
  clientUserIds: Map<string, string>;
};

type CoachSeedContext = SeedContext & { coachId: string };

/** Colonne del questionario di ingresso, validate con lo stesso schema usato dall'app. */
function profileColumns(fullName: string, goal: string, profile: DemoProfile, completedAt: string) {
  // Il form invia i campi facoltativi vuoti come assenti: stessa forma qui.
  const valid = onboardingProfileSchema.parse({
    ...profile,
    fullName,
    goal,
    phone: profile.phone ?? undefined,
    notesForCoach: profile.notesForCoach ?? undefined,
    privacyConsent: true,
  });
  return {
    phone: valid.phone,
    birth_date: valid.birthDate,
    experience_level: valid.experienceLevel,
    weekly_availability: valid.weeklyAvailability,
    preferred_contact: valid.preferredContact,
    notes_for_coach: valid.notesForCoach,
    privacy_consent_at: completedAt,
    onboarding_completed_at: completedAt,
  };
}

async function insertHealthProfile(admin: AdminClient, clientId: string, health: DemoHealth, consentAt: string) {
  const followup = health.hasInjuries
    ? STANDARD_INJURY_QUESTIONS.map((question, index) => ({ question, answer: health.answers[index] ?? "" }))
    : [];
  const valid = onboardingHealthSchema.parse({
    hasInjuries: health.hasInjuries,
    description: health.description ?? undefined,
    followup,
    questionsSource: health.hasInjuries ? "standard" : null,
  });

  const { error } = await admin.from("client_health_profiles").insert({
    client_id: clientId,
    has_injuries: valid.hasInjuries,
    description: valid.description,
    followup: valid.followup,
    questions_source: valid.questionsSource,
    consent_at: consentAt,
    updated_at: consentAt,
  });
  if (error) fail(`Inserimento dei dati sanitari demo fallito: ${error.message}`);
}

function toCheckinRow(checkin: DemoCheckin, clientId: string, context: CoachSeedContext) {
  const answers = checkinAnswersSchema.parse({ version: 1, ...checkin.answers });
  const day = addDays(context.today, -checkin.daysAgo);
  const submittedAt = localInstant(day, checkin.hour ?? DEFAULT_CHECKIN_HOUR, context.timezone, context.now);
  const reviewedAt = checkin.reviewed
    ? new Date(
        Math.min(
          new Date(submittedAt).getTime() + REVIEW_DELAY_HOURS * HOUR_MS,
          context.now.getTime() - MIN_DISTANCE_FROM_NOW_MS,
        ),
      ).toISOString()
    : null;

  return {
    client_id: clientId,
    submitted_at: submittedAt,
    answers,
    reviewed_at: reviewedAt,
    reviewed_by: checkin.reviewed ? context.coachId : null,
    coach_reply: checkin.reviewed ? (checkin.reply ?? null) : null,
  };
}

function toFollowupRow(followup: DemoFollowup, clientId: string, context: CoachSeedContext) {
  const dueOn = addDays(context.today, followup.dueInDays);
  const createdAt = localInstant(addDays(context.today, Math.min(followup.dueInDays, 0) - 4), 10, context.timezone, context.now);
  const closedAt = followup.status === "pending" ? null : localInstant(dueOn, 17, context.timezone, context.now);

  return {
    client_id: clientId,
    coach_id: context.coachId,
    title: followup.title,
    description: followup.description ?? null,
    due_on: dueOn,
    status: followup.status,
    completed_at: followup.status === "completed" ? closedAt : null,
    created_at: createdAt,
    updated_at: closedAt ?? createdAt,
  };
}

async function insertDemoClient(client: DemoClient, context: CoachSeedContext): Promise<void> {
  const { admin, coachId } = context;
  const startedOn = addDays(context.today, -client.startedDaysAgo);
  const portal = client.portal;
  const onboardingAt = localInstant(startedOn, ONBOARDING_HOUR, context.timezone, context.now);

  const { data: inserted, error } = await admin
    .from("clients")
    .insert({
      full_name: client.fullName,
      status: client.status,
      goal: client.goal,
      started_on: startedOn,
      email: portal ? demoEmail(portal.emailLocalPart, context.emailDomain) : null,
      ...(portal?.kind === "account"
        ? {
            user_id: context.clientUserIds.get(portal.emailLocalPart) ?? fail(`Account demo mancante: ${portal.emailLocalPart}`),
            ...profileColumns(client.fullName, client.goal, portal.profile, onboardingAt),
          }
        : {}),
    })
    .select("id")
    .single();
  if (error) fail(`Creazione della cliente ${client.fullName} fallita: ${error.message}`);
  const clientId = inserted.id;

  if (portal?.kind === "account" && portal.health) {
    await insertHealthProfile(admin, clientId, portal.health, onboardingAt);
  }

  const results = await Promise.all([
    admin.from("coach_clients").insert({ coach_id: coachId, client_id: clientId }),
    client.checkins.length > 0
      ? admin.from("checkins").insert(client.checkins.map((checkin) => toCheckinRow(checkin, clientId, context)))
      : null,
    client.notes.length > 0
      ? admin.from("coach_notes").insert(
          client.notes.map((note) => {
            const createdAt = localInstant(addDays(context.today, -note.daysAgo), NOTE_HOUR, context.timezone, context.now);
            return { client_id: clientId, coach_id: coachId, content: note.content, created_at: createdAt, updated_at: createdAt };
          }),
        )
      : null,
    client.followups.length > 0
      ? admin.from("followups").insert(client.followups.map((followup) => toFollowupRow(followup, clientId, context)))
      : null,
  ]);

  const failure = results.find((result) => result?.error);
  if (failure?.error) fail(`Inserimento dei dati di ${client.fullName} fallito: ${failure.error.message}`);
}

/** Auto-iscrizione: scheda con account, senza coach, in attesa (o già rifiutata dall'admin). */
async function insertRegistration(
  registration: DemoRegistration,
  userId: string,
  reviewerId: string,
  context: SeedContext,
): Promise<void> {
  const registeredOn = addDays(context.today, -registration.registeredDaysAgo);
  const registeredAt = localInstant(registeredOn, REGISTRATION_HOUR, context.timezone, context.now);
  const isRejected = registration.status === "rejected";

  const { data: inserted, error } = await context.admin
    .from("clients")
    .insert({
      full_name: registration.fullName,
      goal: registration.goal,
      status: "onboarding",
      started_on: registeredOn,
      email: demoEmail(registration.emailLocalPart, context.emailDomain),
      user_id: userId,
      approval_status: registration.status,
      reviewed_at: isRejected ? localInstant(addDays(registeredOn, 1), ONBOARDING_HOUR, context.timezone, context.now) : null,
      reviewed_by: isRejected ? reviewerId : null,
      ...profileColumns(registration.fullName, registration.goal, registration.profile, registeredAt),
    })
    .select("id")
    .single();
  if (error) fail(`Creazione dell'iscrizione di ${registration.fullName} fallita: ${error.message}`);

  if (registration.health) {
    await insertHealthProfile(context.admin, inserted.id, registration.health, registeredAt);
  }
}

// --- Main ------------------------------------------------------------------------

async function main(): Promise<void> {
  // Solo l'origine: tollera l'URL REST (".../rest/v1/") incollato dalla dashboard.
  const supabaseUrl = new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).origin;
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const password = requireEnv("SEED_DEMO_PASSWORD");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`SEED_DEMO_PASSWORD deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`);
  }
  const emailDomain = process.env.SEED_DEMO_EMAIL_DOMAIN?.trim() || "example.com";
  const timezone = process.env.APP_TIMEZONE?.trim() || "Europe/Rome";

  const admin: AdminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const today = calendarDateIn(timezone, now);

  console.log(`\nSeed dei dati demo su ${new URL(supabaseUrl).host} (oggi: ${today}, ${timezone})\n`);
  const existingUsers = await listAllUsers(admin);
  const summary: Array<{ name: string; email: string; detail: string }> = [];

  // 1. Staff: super admin, amministrazione e coach, con ruolo esplicito.
  const managerIds: string[] = [];
  for (const manager of DEMO_MANAGERS) {
    const email = demoEmail(manager.emailLocalPart, emailDomain);
    managerIds.push(await ensureAccount(admin, existingUsers, { email, fullName: manager.fullName, password, role: manager.role }));
    summary.push({ name: manager.fullName, email, detail: manager.description });
  }
  const reviewerId = managerIds[0] ?? fail("Nessun account di amministrazione demo");

  const coachIds = new Map<string, string>();
  for (const coach of DEMO_COACHES) {
    const email = demoEmail(coach.emailLocalPart, emailDomain);
    const coachId = await ensureAccount(admin, existingUsers, { email, fullName: coach.fullName, password, role: "coach" });
    coachIds.set(coach.emailLocalPart, coachId);
    await removeExistingDemoData(admin, coachId);
    summary.push({ name: coach.fullName, email, detail: `coach, ${coach.clients.length} clienti` });
  }

  // 2. Account delle clienti che usano l'area clienti (già attive o in attesa di approvazione).
  const clientAccounts = [
    ...DEMO_COACHES.flatMap((coach) =>
      coach.clients.flatMap((client) =>
        client.portal?.kind === "account" ? [{ fullName: client.fullName, localPart: client.portal.emailLocalPart }] : [],
      ),
    ),
    ...DEMO_REGISTRATIONS.map((registration) => ({ fullName: registration.fullName, localPart: registration.emailLocalPart })),
  ];
  const clientUserIds = new Map<string, string>();
  for (const account of clientAccounts) {
    const email = demoEmail(account.localPart, emailDomain);
    clientUserIds.set(
      account.localPart,
      await ensureAccount(admin, existingUsers, { email, fullName: account.fullName, password, role: "client" }),
    );
  }

  // 3. Via le schede legate a email/account demo, poi i dati freschi.
  const demoClientEmails = [
    ...DEMO_COACHES.flatMap((coach) => coach.clients.flatMap((client) => (client.portal ? [client.portal.emailLocalPart] : []))),
    ...DEMO_REGISTRATIONS.map((registration) => registration.emailLocalPart),
  ].map((localPart) => demoEmail(localPart, emailDomain));
  await removeDemoClientRecords(admin, demoClientEmails, [...clientUserIds.values()]);

  const context: SeedContext = { admin, now, today, timezone, emailDomain, clientUserIds };
  for (const coach of DEMO_COACHES) {
    const coachId = coachIds.get(coach.emailLocalPart) ?? fail(`Coach demo mancante: ${coach.fullName}`);
    for (const client of coach.clients) {
      await insertDemoClient(client, { ...context, coachId });
      if (client.portal) {
        summary.push({
          name: client.fullName,
          email: demoEmail(client.portal.emailLocalPart, emailDomain),
          detail:
            client.portal.kind === "account"
              ? `cliente di ${coach.fullName}, area clienti attiva`
              : `invitata da ${coach.fullName}, non ancora registrata`,
        });
      }
    }
  }

  for (const registration of DEMO_REGISTRATIONS) {
    const userId = clientUserIds.get(registration.emailLocalPart) ?? fail(`Account demo mancante: ${registration.fullName}`);
    await insertRegistration(registration, userId, reviewerId, context);
    summary.push({
      name: registration.fullName,
      email: demoEmail(registration.emailLocalPart, emailDomain),
      detail: registration.status === "pending" ? "iscrizione in attesa di approvazione" : "iscrizione rifiutata",
    });
  }

  for (const { name, email, detail } of summary) {
    console.log(`  ✓ ${name.padEnd(18)} ${email.padEnd(36)} ${detail}`);
  }
  console.log("\nFatto. Gli account usano la password impostata in SEED_DEMO_PASSWORD (le clienti solo invitate non hanno account).\n");
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
