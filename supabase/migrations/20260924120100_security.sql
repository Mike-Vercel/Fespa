-- =============================================================================
-- FESPA Coach AI — sicurezza
-- Principio: least privilege.
--   * anon: nessun accesso ai dati.
--   * authenticated: solo i privilegi necessari, colonna per colonna dove serve,
--     sempre filtrati dalla Row Level Security.
--   * Una coach vede e modifica solo i dati delle clienti a lei assegnate.
--   * Un admin (ruolo previsto per il futuro) ha accesso completo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper di autorizzazione (schema "private", non esposto dalle API REST).
-- security definer: leggono coach_clients/profiles senza passare dalla RLS,
-- così le policy non diventano ricorsive. search_path vuoto contro l'hijacking.
-- -----------------------------------------------------------------------------
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- Insieme delle clienti accessibili all'utente corrente.
-- Usato come "client_id in (select private.accessible_client_ids())":
-- Postgres lo valuta una volta per query invece che riga per riga.
create function private.accessible_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.clients where (select private.is_admin())
  union
  select client_id from public.coach_clients where coach_id = (select auth.uid());
$$;

-- Vero se l'utente corrente e il profilo indicato seguono almeno una cliente in comune
-- (serve per mostrare il nome di chi ha scritto una nota o revisionato un check-in).
create function private.shares_client_with(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_clients as mine
    join public.coach_clients as theirs on theirs.client_id = mine.client_id
    where mine.coach_id = (select auth.uid())
      and theirs.coach_id = target_profile_id
  );
$$;

revoke all on schema private from public;
revoke all on all functions in schema private from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.accessible_client_ids() to authenticated;
grant execute on function private.shares_client_with(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Privilegi sulle tabelle
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

-- profiles: la coach può cambiare solo nome e avatar, mai il ruolo.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- clients e assegnazioni: scrittura riservata agli admin (vedi policy).
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, delete on public.coach_clients to authenticated;

-- checkins: la coach può solo registrarne la revisione e la risposta.
grant select on public.checkins to authenticated;
grant update (reviewed_at, reviewed_by, coach_reply) on public.checkins to authenticated;

-- coach_notes: il contenuto è l'unico campo modificabile.
grant select, insert, delete on public.coach_notes to authenticated;
grant update (content) on public.coach_notes to authenticated;

-- followups: cliente e autrice non si possono cambiare dopo la creazione.
grant select on public.followups to authenticated;
grant insert (client_id, coach_id, title, description, due_on, source, ai_analysis_id)
  on public.followups to authenticated;
grant update (title, description, due_on, status) on public.followups to authenticated;

-- ai_analyses: dopo il salvataggio si registra solo la decisione della coach.
grant select on public.ai_analyses to authenticated;
grant insert (
  client_id, checkin_id, coach_id, summary, topics, follow_up_needed, followup_suggestion,
  followup_decision, suggested_questions, confidence, sensitive_content_note,
  provider, model, prompt_version, is_mock
) on public.ai_analyses to authenticated;
grant update (followup_decision, followup_decided_at) on public.ai_analyses to authenticated;

-- ai_interactions: audit scritto dal server per conto della coach autenticata.
grant select on public.ai_interactions to authenticated;
grant insert (coach_id, client_id, request_type, status, provider, model, is_mock)
  on public.ai_interactions to authenticated;
grant update (status, provider, model, is_mock, input_tokens, output_tokens, latency_ms, error_code, completed_at)
  on public.ai_interactions to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.coach_clients enable row level security;
alter table public.checkins enable row level security;
alter table public.coach_notes enable row level security;
alter table public.followups enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.ai_interactions enable row level security;

-- profiles --------------------------------------------------------------------
create policy "profiles_select_self_colleagues_or_admin" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.shares_client_with(id)
    or (select private.is_admin())
  );

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- clients ---------------------------------------------------------------------
create policy "clients_select_accessible" on public.clients
  for select to authenticated
  using (id in (select private.accessible_client_ids()));

create policy "clients_insert_admin" on public.clients
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "clients_update_admin" on public.clients
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "clients_delete_admin" on public.clients
  for delete to authenticated
  using ((select private.is_admin()));

-- coach_clients ---------------------------------------------------------------
create policy "coach_clients_select_own_or_admin" on public.coach_clients
  for select to authenticated
  using (coach_id = (select auth.uid()) or (select private.is_admin()));

create policy "coach_clients_insert_admin" on public.coach_clients
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "coach_clients_delete_admin" on public.coach_clients
  for delete to authenticated
  using ((select private.is_admin()));

-- checkins --------------------------------------------------------------------
-- Nessuna policy di insert: i check-in arrivano dal canale delle clienti, non dalla coach.
create policy "checkins_select_accessible" on public.checkins
  for select to authenticated
  using (client_id in (select private.accessible_client_ids()));

create policy "checkins_update_review_accessible" on public.checkins
  for update to authenticated
  using (client_id in (select private.accessible_client_ids()))
  with check (
    client_id in (select private.accessible_client_ids())
    and (reviewed_by is null or reviewed_by = (select auth.uid()))
  );

-- coach_notes -----------------------------------------------------------------
create policy "coach_notes_select_accessible" on public.coach_notes
  for select to authenticated
  using (client_id in (select private.accessible_client_ids()));

create policy "coach_notes_insert_own" on public.coach_notes
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and client_id in (select private.accessible_client_ids())
  );

create policy "coach_notes_update_own" on public.coach_notes
  for update to authenticated
  using (
    coach_id = (select auth.uid())
    and client_id in (select private.accessible_client_ids())
  )
  with check (
    coach_id = (select auth.uid())
    and client_id in (select private.accessible_client_ids())
  );

create policy "coach_notes_delete_own" on public.coach_notes
  for delete to authenticated
  using (
    coach_id = (select auth.uid())
    and client_id in (select private.accessible_client_ids())
  );

-- followups -------------------------------------------------------------------
-- Nessuna policy di delete: un follow-up si annulla (status = cancelled), la storia resta.
create policy "followups_select_accessible" on public.followups
  for select to authenticated
  using (client_id in (select private.accessible_client_ids()));

create policy "followups_insert_own_pending" on public.followups
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and client_id in (select private.accessible_client_ids())
    and status = 'pending'
  );

create policy "followups_update_accessible" on public.followups
  for update to authenticated
  using (client_id in (select private.accessible_client_ids()))
  with check (client_id in (select private.accessible_client_ids()));

-- ai_analyses -----------------------------------------------------------------
create policy "ai_analyses_select_accessible" on public.ai_analyses
  for select to authenticated
  using (client_id in (select private.accessible_client_ids()));

create policy "ai_analyses_insert_own" on public.ai_analyses
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and client_id in (select private.accessible_client_ids())
  );

create policy "ai_analyses_update_decision_accessible" on public.ai_analyses
  for update to authenticated
  using (client_id in (select private.accessible_client_ids()))
  with check (client_id in (select private.accessible_client_ids()));

-- ai_interactions -------------------------------------------------------------
create policy "ai_interactions_select_own_or_admin" on public.ai_interactions
  for select to authenticated
  using (coach_id = (select auth.uid()) or (select private.is_admin()));

create policy "ai_interactions_insert_own" on public.ai_interactions
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and (client_id is null or client_id in (select private.accessible_client_ids()))
  );

create policy "ai_interactions_update_own" on public.ai_interactions
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
