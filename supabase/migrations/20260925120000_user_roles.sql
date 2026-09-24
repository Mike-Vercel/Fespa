-- =============================================================================
-- FESPA Coach AI — ruoli dello staff e gestione degli utenti
--
--  * Nuovo ruolo "super_admin": fa tutto ciò che fa l'amministrazione ("admin")
--    e in più gestisce i ruoli degli utenti.
--  * "admin" (amministrazione): iscrizioni, tutte le clienti, assegnazione delle coach.
--  * I cambi di ruolo e le assegnazioni passano da funzioni RPC con controlli espliciti.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum dei ruoli
-- Si ricrea il tipo (come nella migration precedente) invece di ADD VALUE, così il nuovo
-- valore è utilizzabile subito nelle funzioni sotto. current_role() restituisce il tipo:
-- va eliminata e ricreata. Le funzioni plpgsql che la chiamano la risolvono per nome.
-- -----------------------------------------------------------------------------
alter type public.app_role rename to app_role_previous;
create type public.app_role as enum ('client', 'coach', 'admin', 'super_admin');
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
alter table public.profiles alter column role set default 'client';
drop function private.current_role();
drop type public.app_role_previous;

create function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 2. Helper di autorizzazione
-- -----------------------------------------------------------------------------
create or replace function private.is_admin()
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
      and role in ('admin', 'super_admin')
  );
$$;

create function private.is_staff()
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
      and role in ('coach', 'admin', 'super_admin')
  );
$$;

-- Le assegnazioni valgono solo per chi è ancora nello staff: un account riportato
-- a "client" non deve poter leggere le sue ex clienti, nemmeno per un residuo di dati.
create or replace function private.accessible_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.clients where (select private.is_admin())
  union
  select client_id from public.coach_clients
  where coach_id = (select auth.uid()) and (select private.is_staff());
$$;

revoke all on all functions in schema private from public;
grant execute on function private.current_role() to authenticated;
grant execute on function private.is_staff() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPC esistenti: stessi controlli, estesi al nuovo ruolo
-- -----------------------------------------------------------------------------
create or replace function public.create_client_by_staff(
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
  if not (select private.is_staff()) then
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

create or replace function public.review_client_registration(
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
  if not (select private.is_admin()) then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;
  if p_decision = 'pending' then
    raise exception 'Decisione non valida' using errcode = 'FC001';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Cliente non trovata' using errcode = 'FC006';
  end if;

  if p_decision = 'approved' then
    if not exists (
      select 1 from public.profiles where id = p_coach_id and role in ('coach', 'admin', 'super_admin')
    ) then
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

-- -----------------------------------------------------------------------------
-- 4. Gestione degli utenti (nuove RPC)
--   FC007 = non si può modificare il proprio ruolo
-- -----------------------------------------------------------------------------

-- Elenco degli account per l'amministrazione. L'email vive in auth.users (non esposta
-- dalle API): la funzione la legge per conto dell'admin dopo il controllo del ruolo.
create function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.app_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  client_id uuid,
  approval_status public.client_approval_status,
  onboarding_completed_at timestamptz,
  assigned_client_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;

  return query
  select
    p.id,
    p.full_name,
    u.email::text,
    p.role,
    p.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at is not null,
    c.id,
    c.approval_status,
    c.onboarding_completed_at,
    (select count(*)::integer from public.coach_clients as cc where cc.coach_id = p.id)
  from public.profiles as p
  join auth.users as u on u.id = p.id
  left join public.clients as c on c.user_id = p.id
  order by p.created_at desc;
end;
$$;

-- Cambio di ruolo, riservato al super admin.
create function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.app_role;
begin
  if (select private.current_role()) is distinct from 'super_admin' then
    raise exception 'Operazione riservata al super admin' using errcode = 'FC001';
  end if;
  -- Nessuno cambia il proprio ruolo: così resta sempre almeno un super admin.
  if p_user_id = (select auth.uid()) then
    raise exception 'Non puoi modificare il tuo ruolo' using errcode = 'FC007';
  end if;

  select role into v_current from public.profiles where id = p_user_id;
  if v_current is null then
    raise exception 'Utente non trovato' using errcode = 'FC006';
  end if;
  if v_current = p_role then
    return;
  end if;

  if p_role = 'client' then
    -- Chi esce dallo staff perde le assegnazioni: le clienti restano visibili all'amministrazione.
    delete from public.coach_clients where coach_id = p_user_id;
  elsif v_current = 'client' then
    -- Una richiesta di iscrizione come cliente non più rilevante per un membro dello staff.
    delete from public.clients where user_id = p_user_id and approval_status <> 'approved';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- Coach assegnate a una cliente approvata (sostituisce l'elenco), riservato all'amministrazione.
create function public.set_client_coaches(p_client_id uuid, p_coach_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Cliente non trovata' using errcode = 'FC006';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id and approval_status = 'approved') then
    raise exception 'La cliente non è approvata' using errcode = 'FC001';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_coach_ids, '{}')) as requested (coach_id)
    where not exists (
      select 1 from public.profiles
      where id = requested.coach_id and role in ('coach', 'admin', 'super_admin')
    )
  ) then
    raise exception 'Coach non valida' using errcode = 'FC005';
  end if;

  delete from public.coach_clients
  where client_id = p_client_id and coach_id <> all (coalesce(p_coach_ids, '{}'));
  insert into public.coach_clients (coach_id, client_id)
  select distinct requested.coach_id, p_client_id from unnest(p_coach_ids) as requested (coach_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke all on function public.set_client_coaches(uuid, uuid[]) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.set_client_coaches(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Vista aggregata: numero di coach assegnate (per trovare le clienti senza coach)
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
  c.onboarding_completed_at,
  -- Con la RLS una coach conta solo sé stessa; l'amministrazione vede il numero reale.
  (select count(*)::integer from public.coach_clients as cc where cc.client_id = c.id) as coach_count
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
