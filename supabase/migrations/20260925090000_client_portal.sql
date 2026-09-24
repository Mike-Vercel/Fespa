-- =============================================================================
-- FESPA Coach AI — portale clienti, ruoli e approvazioni
--
--  * Nuovo ruolo "client": chiunque si registri da solo nasce cliente, senza accesso ai dati.
--    Coach e admin si creano solo internamente (seed / SQL).
--  * Le clienti possono avere un account (clients.user_id) e compilare i propri dati.
--  * Le auto-iscritte restano "pending" finché un admin non approva e assegna una coach.
--  * Le clienti scrivono SOLO tramite funzioni RPC con controlli espliciti:
--    nessun privilegio di scrittura diretto sulle tabelle.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum aggiornati
-- ALTER TYPE ... ADD VALUE non è utilizzabile nella stessa transazione in cui il valore
-- viene usato: si ricrea il tipo con i nuovi valori (la migration resta eseguibile in blocco).
-- -----------------------------------------------------------------------------
alter type public.app_role rename to app_role_previous;
create type public.app_role as enum ('coach', 'admin', 'client');
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
-- Chi si registra da solo è una cliente: il ruolo minimo è il default.
alter table public.profiles alter column role set default 'client';
drop type public.app_role_previous;

alter type public.ai_request_type rename to ai_request_type_previous;
create type public.ai_request_type as enum ('checkin_analysis', 'copilot_question', 'reply_draft', 'onboarding_questions');
alter table public.ai_interactions
  alter column request_type type public.ai_request_type using request_type::text::public.ai_request_type;
drop type public.ai_request_type_previous;

create type public.client_approval_status as enum ('pending', 'approved', 'rejected');
create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
create type public.contact_channel as enum ('whatsapp', 'email', 'phone');

-- -----------------------------------------------------------------------------
-- 2. Dati della cliente
-- -----------------------------------------------------------------------------
alter table public.clients
  add column user_id uuid unique references auth.users (id) on delete set null,
  add column email text check (email is null or (char_length(email) <= 254 and position('@' in email) > 1)),
  add column approval_status public.client_approval_status not null default 'approved',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column phone text check (phone is null or char_length(phone) between 6 and 30),
  add column birth_date date check (birth_date is null or birth_date >= '1900-01-01'),
  add column experience_level public.experience_level,
  add column weekly_availability smallint check (weekly_availability is null or weekly_availability between 1 and 7),
  add column preferred_contact public.contact_channel,
  add column notes_for_coach text check (notes_for_coach is null or char_length(notes_for_coach) <= 1500),
  add column privacy_consent_at timestamptz,
  add column onboarding_completed_at timestamptz;

-- Una persona = una scheda: l'email (quando presente) identifica la cliente.
create unique index clients_email_unique_idx on public.clients (lower(email)) where email is not null;
create index clients_approval_status_idx on public.clients (approval_status);

-- Dati su infortuni e traumi fisici: tabella separata, consenso esplicito dedicato.
create table public.client_health_profiles (
  client_id uuid primary key references public.clients (id) on delete cascade,
  has_injuries boolean not null,
  description text check (description is null or char_length(description) <= 1500),
  -- Domande di approfondimento e risposte della cliente: [{ "question": "...", "answer": "..." }]
  followup jsonb not null default '[]' check (jsonb_typeof(followup) = 'array'),
  -- Origine delle domande: generate dall'AI, dal provider mock (demo) o standard predefinite.
  questions_source text check (questions_source is null or questions_source in ('ai', 'mock', 'standard')),
  consent_at timestamptz not null,
  updated_at timestamptz not null default now()
);

-- I check-in inviati dalle clienti prendono l'orario del server.
alter table public.checkins alter column submitted_at set default now();

-- -----------------------------------------------------------------------------
-- 3. Helper di autorizzazione per le clienti
-- -----------------------------------------------------------------------------
create function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function private.own_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.clients where user_id = (select auth.uid());
$$;

-- Le coach assegnate alla cliente corrente (per mostrarle il nome della sua coach).
create function private.my_coach_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coach_id from public.coach_clients where client_id = (select private.own_client_id());
$$;

revoke all on all functions in schema private from public;
grant execute on function private.current_role() to authenticated;
grant execute on function private.own_client_id() to authenticated;
grant execute on function private.my_coach_ids() to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Privilegi e policy
-- -----------------------------------------------------------------------------
grant select on public.client_health_profiles to authenticated;
grant all on public.client_health_profiles to service_role;
alter table public.client_health_profiles enable row level security;

create policy "client_health_select_staff_or_own" on public.client_health_profiles
  for select to authenticated
  using (
    client_id in (select private.accessible_client_ids())
    or client_id = (select private.own_client_id())
  );

-- La cliente vede la propria scheda (anche in attesa: serve per mostrarle lo stato).
create policy "clients_select_own" on public.clients
  for select to authenticated
  using (user_id = (select auth.uid()));

-- La cliente vede i propri check-in, incluse le risposte approvate dalla coach.
create policy "checkins_select_own" on public.checkins
  for select to authenticated
  using (client_id = (select private.own_client_id()));

-- La cliente vede il profilo (nome) delle sue coach.
create policy "profiles_select_my_coaches" on public.profiles
  for select to authenticated
  using (id in (select private.my_coach_ids()));

-- -----------------------------------------------------------------------------
-- 5. Funzioni RPC (unico canale di scrittura per clienti e per operazioni composte)
-- security definer + controlli espliciti di ruolo; niente accesso per anon.
-- Errori con SQLSTATE dedicati, tradotti in messaggi chiari dall'applicazione.
--   FC001 = operazione non consentita per il ruolo o lo stato dell'utente
--   FC002 = check-in già inviato di recente
--   FC003 = email non verificata
--   FC004 = consenso privacy mancante
--   FC005 = coach non valida
-- -----------------------------------------------------------------------------

-- La coach (o l'admin) crea una cliente: nasce approvata e assegnata a chi la crea.
create function public.create_client_by_staff(
  p_full_name text,
  p_email text,
  p_goal text,
  p_started_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  if (select private.current_role()) is distinct from 'coach'
     and (select private.current_role()) is distinct from 'admin' then
    raise exception 'Operazione riservata allo staff' using errcode = 'FC001';
  end if;

  insert into public.clients (full_name, email, goal, started_on, status, approval_status)
  values (
    btrim(p_full_name),
    nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_goal), ''),
    coalesce(p_started_on, current_date),
    'onboarding',
    'approved'
  )
  returning id into v_client_id;

  insert into public.coach_clients (coach_id, client_id) values ((select auth.uid()), v_client_id);
  return v_client_id;
end;
$$;

-- La cliente completa (o aggiorna) i propri dati.
-- Collegamento sicuro all'invito della coach: solo con email VERIFICATA uguale a quella dell'invito.
-- Senza invito si crea una nuova scheda in attesa di approvazione dell'admin.
create function public.complete_client_onboarding(p_profile jsonb, p_health jsonb)
returns public.client_approval_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_email_confirmed_at timestamptz;
  v_client_id uuid;
  v_status public.client_approval_status;
begin
  if (select private.current_role()) is distinct from 'client' then
    raise exception 'Operazione riservata alle clienti' using errcode = 'FC001';
  end if;
  if coalesce((p_profile ->> 'privacyConsent')::boolean, false) is not true then
    raise exception 'Consenso privacy obbligatorio' using errcode = 'FC004';
  end if;

  select lower(email), email_confirmed_at into v_email, v_email_confirmed_at from auth.users where id = v_user_id;
  if v_email_confirmed_at is null then
    raise exception 'Email non verificata' using errcode = 'FC003';
  end if;

  select id into v_client_id from public.clients where user_id = v_user_id;

  if v_client_id is null then
    update public.clients set user_id = v_user_id
    where lower(email) = v_email and user_id is null
    returning id into v_client_id;
  end if;

  if v_client_id is null then
    insert into public.clients (full_name, email, user_id, status, approval_status, started_on)
    values (btrim(p_profile ->> 'fullName'), v_email, v_user_id, 'onboarding', 'pending', current_date)
    returning id into v_client_id;
  end if;

  update public.clients set
    full_name = btrim(p_profile ->> 'fullName'),
    goal = nullif(btrim(p_profile ->> 'goal'), ''),
    phone = nullif(btrim(p_profile ->> 'phone'), ''),
    birth_date = nullif(p_profile ->> 'birthDate', '')::date,
    experience_level = (p_profile ->> 'experienceLevel')::public.experience_level,
    weekly_availability = (p_profile ->> 'weeklyAvailability')::smallint,
    preferred_contact = (p_profile ->> 'preferredContact')::public.contact_channel,
    notes_for_coach = nullif(btrim(p_profile ->> 'notesForCoach'), ''),
    privacy_consent_at = coalesce(privacy_consent_at, now()),
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_client_id
  returning approval_status into v_status;

  if p_health is null then
    -- Nessun consenso ai dati sanitari: non si conserva nulla.
    delete from public.client_health_profiles where client_id = v_client_id;
  else
    insert into public.client_health_profiles (client_id, has_injuries, description, followup, questions_source, consent_at)
    values (
      v_client_id,
      (p_health ->> 'hasInjuries')::boolean,
      nullif(btrim(p_health ->> 'description'), ''),
      coalesce(p_health -> 'followup', '[]'::jsonb),
      nullif(p_health ->> 'questionsSource', ''),
      now()
    )
    on conflict (client_id) do update set
      has_injuries = excluded.has_injuries,
      description = excluded.description,
      followup = excluded.followup,
      questions_source = excluded.questions_source,
      updated_at = now();
  end if;

  update public.profiles set full_name = btrim(p_profile ->> 'fullName') where id = v_user_id;
  return v_status;
end;
$$;

-- La cliente approvata invia il check-in settimanale.
create function public.submit_client_checkin(p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_last_submitted_at timestamptz;
  v_checkin_id uuid;
begin
  select id into v_client_id
  from public.clients
  where user_id = (select auth.uid()) and approval_status = 'approved';
  if v_client_id is null then
    raise exception 'Account non abilitato ai check-in' using errcode = 'FC001';
  end if;

  -- Al massimo un check-in ogni 20 ore: evita invii doppi e abusi.
  select max(submitted_at) into v_last_submitted_at from public.checkins where client_id = v_client_id;
  if v_last_submitted_at is not null and v_last_submitted_at > now() - interval '20 hours' then
    raise exception 'Check-in già inviato di recente' using errcode = 'FC002';
  end if;

  insert into public.checkins (client_id, answers) values (v_client_id, p_answers) returning id into v_checkin_id;
  -- Il primo check-in segna l'inizio effettivo del percorso.
  update public.clients set status = 'active' where id = v_client_id and status = 'onboarding';
  return v_checkin_id;
end;
$$;

-- L'admin approva (assegnando una coach) o rifiuta un'auto-iscrizione.
create function public.review_client_registration(
  p_client_id uuid,
  p_decision public.client_approval_status,
  p_coach_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;
  if p_decision = 'pending' then
    raise exception 'Decisione non valida' using errcode = 'FC001';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Cliente non trovata' using errcode = 'FC006';
  end if;

  if p_decision = 'approved' then
    if not exists (select 1 from public.profiles where id = p_coach_id and role in ('coach', 'admin')) then
      raise exception 'Coach non valida' using errcode = 'FC005';
    end if;
    insert into public.coach_clients (coach_id, client_id) values (p_coach_id, p_client_id)
    on conflict do nothing;
  end if;

  update public.clients
  set approval_status = p_decision, reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = p_client_id;
end;
$$;

revoke all on function public.create_client_by_staff(text, text, text, date) from public, anon;
revoke all on function public.complete_client_onboarding(jsonb, jsonb) from public, anon;
revoke all on function public.submit_client_checkin(jsonb) from public, anon;
revoke all on function public.review_client_registration(uuid, public.client_approval_status, uuid) from public, anon;
grant execute on function public.create_client_by_staff(text, text, text, date) to authenticated;
grant execute on function public.complete_client_onboarding(jsonb, jsonb) to authenticated;
grant execute on function public.submit_client_checkin(jsonb) to authenticated;
grant execute on function public.review_client_registration(uuid, public.client_approval_status, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Vista aggregata: nuovi campi per stato dell'account e approvazione
-- -----------------------------------------------------------------------------
drop view public.client_overview;

create view public.client_overview
with (security_invoker = true)
as
select
  c.id,
  c.full_name,
  c.status,
  c.goal,
  c.started_on,
  checkin_stats.last_checkin_at,
  checkin_stats.pending_review_count,
  checkin_stats.oldest_pending_review_at,
  followup_stats.next_followup_on,
  followup_stats.pending_followup_count,
  ai_stats.pending_ai_suggestion_count,
  c.approval_status,
  c.email,
  (c.user_id is not null) as has_account,
  c.onboarding_completed_at
from public.clients as c
left join lateral (
  select
    max(ch.submitted_at) as last_checkin_at,
    count(*) filter (where ch.reviewed_at is null)::integer as pending_review_count,
    min(ch.submitted_at) filter (where ch.reviewed_at is null) as oldest_pending_review_at
  from public.checkins as ch
  where ch.client_id = c.id
) as checkin_stats on true
left join lateral (
  select
    min(f.due_on) as next_followup_on,
    count(*)::integer as pending_followup_count
  from public.followups as f
  where f.client_id = c.id
    and f.status = 'pending'
) as followup_stats on true
left join lateral (
  select count(*)::integer as pending_ai_suggestion_count
  from public.ai_analyses as a
  where a.client_id = c.id
    and a.followup_decision = 'pending'
) as ai_stats on true;

revoke all on public.client_overview from anon, authenticated;
grant select on public.client_overview to authenticated;
grant select on public.client_overview to service_role;
