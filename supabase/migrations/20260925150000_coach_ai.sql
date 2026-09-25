-- =============================================================================
-- FESPA Coach AI — "Coach AI", l'agente operativo dello staff
--
--  * Conversazioni, messaggi e allegati: privati di chi li ha scritti (RLS "solo proprietario").
--  * Richieste di azione: ogni modifica proposta dall'AI è una riga qui, eseguita dal server
--    SOLO dopo la conferma esplicita dell'utente, con i SUOI permessi (nessun privilegio proprio).
--  * Registro delle azioni: append-only, niente update né delete.
--  * Automazioni: regole persistenti; per costruzione non possono inviare nulla da sole.
--  * Archiviazione delle clienti (soft-delete, ripristinabile): unica forma di "eliminazione".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum
-- -----------------------------------------------------------------------------
alter type public.ai_request_type rename to ai_request_type_previous;
create type public.ai_request_type as enum (
  'checkin_analysis', 'copilot_question', 'reply_draft', 'onboarding_questions', 'coach_agent'
);
alter table public.ai_interactions
  alter column request_type type public.ai_request_type using request_type::text::public.ai_request_type;
drop type public.ai_request_type_previous;

create type public.ai_message_role as enum ('user', 'assistant');
-- streaming: risposta in corso (se resta così, la generazione è stata interrotta dal server).
create type public.ai_message_status as enum ('streaming', 'complete', 'stopped', 'failed');
create type public.ai_risk_level as enum ('read', 'draft', 'write', 'high_risk', 'destructive');
-- draft: bozza pronta (es. risposta a un check-in) che attende la revisione umana.
create type public.ai_action_status as enum (
  'draft', 'pending', 'executing', 'succeeded', 'failed', 'cancelled', 'expired'
);
create type public.ai_automation_trigger as enum (
  'new_checkin', 'followup_due', 'followup_overdue', 'new_registration', 'new_message'
);
create type public.ai_automation_action as enum ('generate_reply_draft');
create type public.ai_automation_run_status as enum ('success', 'failed', 'partial');
create type public.ai_automation_event_status as enum ('pending', 'processing', 'done', 'failed', 'skipped');

-- -----------------------------------------------------------------------------
-- 2. Archiviazione delle clienti (soft-delete)
-- Una cliente archiviata sparisce da liste, check-in, follow-up e dashboard per tutto lo staff;
-- i dati restano e l'amministrazione può ripristinarla.
-- -----------------------------------------------------------------------------
alter table public.clients
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles (id) on delete set null;

create index clients_archived_at_idx on public.clients (archived_at) where archived_at is not null;
create index clients_archived_by_idx on public.clients (archived_by);

create or replace function private.accessible_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.clients where (select private.is_admin()) and archived_at is null
  union
  select cc.client_id
  from public.coach_clients as cc
  join public.clients as c on c.id = cc.client_id
  where cc.coach_id = (select auth.uid()) and (select private.is_staff()) and c.archived_at is null;
$$;

-- L'amministrazione deve poter trovare le clienti archiviate per ripristinarle.
create policy "clients_select_archived_admin" on public.clients
  for select to authenticated
  using (archived_at is not null and (select private.is_admin()));

-- Stessa vista di prima, senza le clienti archiviate.
create or replace view public.client_overview
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
) as ai_stats on true
where c.archived_at is null;

--   FC008 = cliente già archiviata / FC009 = cliente non archiviata
create function public.archive_client(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;

  update public.clients
  set archived_at = now(), archived_by = (select auth.uid())
  where id = p_client_id and archived_at is null and approval_status = 'approved';

  if not found then
    if exists (select 1 from public.clients where id = p_client_id and archived_at is not null) then
      raise exception 'Cliente già archiviata' using errcode = 'FC008';
    end if;
    raise exception 'Cliente non trovata' using errcode = 'FC006';
  end if;
end;
$$;

create function public.restore_client(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;

  update public.clients
  set archived_at = null, archived_by = null
  where id = p_client_id and archived_at is not null;

  if not found then
    if exists (select 1 from public.clients where id = p_client_id) then
      raise exception 'Cliente non archiviata' using errcode = 'FC009';
    end if;
    raise exception 'Cliente non trovata' using errcode = 'FC006';
  end if;
end;
$$;

revoke all on function public.archive_client(uuid) from public, anon;
revoke all on function public.restore_client(uuid) from public, anon;
grant execute on function public.archive_client(uuid) to authenticated;
grant execute on function public.restore_client(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Conversazioni e messaggi
-- -----------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Nuova chat' check (char_length(btrim(title)) between 1 and 120),
  -- true dopo una rinomina: il titolo automatico non la sovrascrive più.
  title_is_custom boolean not null default false,
  preview text check (preview is null or char_length(preview) <= 200),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_owner_updated_idx on public.ai_conversations (owner_id, updated_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  role public.ai_message_role not null,
  content text not null default '' check (char_length(content) <= 20000),
  status public.ai_message_status not null default 'complete',
  -- Solo metadati sicuri (attività dei tool, riferimenti ad azioni e allegati): mai prompt né ragionamenti.
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  -- Idempotenza dell'invio: lo stesso messaggio ritrasmesso dal browser non viene duplicato.
  client_message_id uuid,
  provider text check (provider is null or char_length(provider) <= 40),
  model text check (model is null or char_length(model) <= 100),
  prompt_version text check (prompt_version is null or char_length(prompt_version) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, client_message_id)
);

create index ai_messages_conversation_created_idx on public.ai_messages (conversation_id, created_at desc);
create index ai_messages_owner_id_idx on public.ai_messages (owner_id);

-- -----------------------------------------------------------------------------
-- 4. Allegati (file nel bucket privato "coach-ai-attachments", cartella = id utente)
-- -----------------------------------------------------------------------------
create table public.ai_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.ai_conversations (id) on delete cascade,
  message_id uuid references public.ai_messages (id) on delete set null,
  file_name text not null check (char_length(file_name) between 1 and 160),
  mime_type text not null check (
    mime_type in ('application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp')
  ),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 4194304),
  storage_path text not null unique check (char_length(storage_path) <= 300),
  created_at timestamptz not null default now()
);

create index ai_attachments_owner_created_idx on public.ai_attachments (owner_id, created_at desc);
create index ai_attachments_conversation_id_idx on public.ai_attachments (conversation_id);
create index ai_attachments_message_id_idx on public.ai_attachments (message_id);

-- -----------------------------------------------------------------------------
-- 5. Automazioni
-- -----------------------------------------------------------------------------
create table public.ai_automations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  trigger public.ai_automation_trigger not null,
  action public.ai_automation_action not null,
  enabled boolean not null default true,
  config jsonb not null default '{}' check (jsonb_typeof(config) = 'object'),
  -- Garanzie strutturali: l'automazione prepara, non invia. La revisione umana è obbligatoria.
  auto_execute boolean not null default true,
  send_message boolean not null default false check (send_message = false),
  requires_confirmation boolean not null default true check (requires_confirmation = true),
  last_run_at timestamptz,
  last_status public.ai_automation_run_status,
  last_error text check (last_error is null or char_length(last_error) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Solo le combinazioni realmente implementate (gli altri trigger sono previsti ma non ancora attivi).
  constraint ai_automations_supported check (trigger = 'new_checkin' and action = 'generate_reply_draft'),
  unique (owner_id, trigger, action)
);

-- -----------------------------------------------------------------------------
-- 6. Richieste di azione e registro
-- -----------------------------------------------------------------------------
create table public.ai_action_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.ai_conversations (id) on delete cascade,
  message_id uuid references public.ai_messages (id) on delete set null,
  automation_id uuid references public.ai_automations (id) on delete set null,
  tool_name text not null check (char_length(tool_name) between 1 and 60),
  risk_level public.ai_risk_level not null check (risk_level in ('write', 'high_risk', 'destructive')),
  status public.ai_action_status not null,
  -- Input già validato (Zod): è ESATTAMENTE ciò che verrà eseguito dopo la conferma.
  input jsonb not null check (jsonb_typeof(input) = 'object'),
  -- Anteprima per la UI: cosa cambierà.
  preview jsonb not null check (jsonb_typeof(preview) = 'object'),
  target_type text check (target_type is null or char_length(target_type) <= 40),
  target_id uuid,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  error_code text check (error_code is null or char_length(error_code) <= 60),
  error_message text check (error_message is null or char_length(error_message) <= 300),
  expires_at timestamptz,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index ai_action_requests_owner_status_idx on public.ai_action_requests (owner_id, status, created_at desc);
create index ai_action_requests_conversation_id_idx on public.ai_action_requests (conversation_id);
create index ai_action_requests_message_id_idx on public.ai_action_requests (message_id);
create index ai_action_requests_automation_id_idx on public.ai_action_requests (automation_id);

create table public.ai_action_logs (
  id uuid primary key default gen_random_uuid(),
  -- set null: il registro sopravvive all'eliminazione dell'account o della conversazione.
  actor_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  action_request_id uuid references public.ai_action_requests (id) on delete set null,
  automation_id uuid references public.ai_automations (id) on delete set null,
  tool_name text not null check (char_length(tool_name) between 1 and 60),
  risk_level public.ai_risk_level not null,
  event text not null check (
    event in ('proposed', 'draft_created', 'confirmed', 'cancelled', 'succeeded', 'failed', 'denied', 'expired')
  ),
  target_type text check (target_type is null or char_length(target_type) <= 40),
  target_id uuid,
  -- Input minimizzato: identificativi e campi strutturati, mai testi liberi o dati sanitari.
  input_summary jsonb not null default '{}' check (jsonb_typeof(input_summary) = 'object'),
  error_code text check (error_code is null or char_length(error_code) <= 60),
  created_at timestamptz not null default now()
);

create index ai_action_logs_actor_created_idx on public.ai_action_logs (actor_id, created_at desc);
create index ai_action_logs_action_request_id_idx on public.ai_action_logs (action_request_id);
create index ai_action_logs_conversation_id_idx on public.ai_action_logs (conversation_id);
create index ai_action_logs_automation_id_idx on public.ai_action_logs (automation_id);

-- -----------------------------------------------------------------------------
-- 7. Eventi delle automazioni
-- Scritti SOLO dal trigger sui check-in; elaborati dal server con la sessione della
-- proprietaria dell'automazione (i suoi permessi, la sua RLS).
-- -----------------------------------------------------------------------------
create table public.ai_automation_events (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.ai_automations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  trigger public.ai_automation_trigger not null,
  client_id uuid references public.clients (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete cascade,
  status public.ai_automation_event_status not null default 'pending',
  attempts smallint not null default 0 check (attempts between 0 and 10),
  action_request_id uuid references public.ai_action_requests (id) on delete set null,
  error_code text check (error_code is null or char_length(error_code) <= 60),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (automation_id, checkin_id)
);

create index ai_automation_events_owner_status_idx on public.ai_automation_events (owner_id, status, created_at);
create index ai_automation_events_client_id_idx on public.ai_automation_events (client_id);
create index ai_automation_events_checkin_id_idx on public.ai_automation_events (checkin_id);
create index ai_automation_events_action_request_id_idx on public.ai_automation_events (action_request_id);

create function private.enqueue_checkin_automations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo per chi segue davvero la cliente (e fa ancora parte dello staff), mai per clienti archiviate.
  insert into public.ai_automation_events (automation_id, owner_id, trigger, client_id, checkin_id)
  select a.id, a.owner_id, 'new_checkin', new.client_id, new.id
  from public.ai_automations as a
  join public.profiles as p on p.id = a.owner_id and p.role in ('coach', 'admin', 'super_admin')
  join public.coach_clients as cc on cc.coach_id = a.owner_id and cc.client_id = new.client_id
  join public.clients as c on c.id = new.client_id and c.archived_at is null
  where a.enabled and a.trigger = 'new_checkin'
  on conflict (automation_id, checkin_id) do nothing;
  return new;
end;
$$;

revoke all on function private.enqueue_checkin_automations() from public;

create trigger checkins_enqueue_automations
  after insert on public.checkins
  for each row execute function private.enqueue_checkin_automations();

-- -----------------------------------------------------------------------------
-- 8. updated_at
-- -----------------------------------------------------------------------------
create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function private.set_updated_at();

create trigger ai_messages_set_updated_at
  before update on public.ai_messages
  for each row execute function private.set_updated_at();

create trigger ai_automations_set_updated_at
  before update on public.ai_automations
  for each row execute function private.set_updated_at();

create trigger ai_action_requests_set_updated_at
  before update on public.ai_action_requests
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. Privilegi (colonna per colonna dove serve)
-- -----------------------------------------------------------------------------
revoke all on public.ai_conversations, public.ai_messages, public.ai_attachments, public.ai_automations,
  public.ai_action_requests, public.ai_action_logs, public.ai_automation_events from anon, authenticated;
grant all on public.ai_conversations, public.ai_messages, public.ai_attachments, public.ai_automations,
  public.ai_action_requests, public.ai_action_logs, public.ai_automation_events to service_role;

grant select, delete on public.ai_conversations to authenticated;
grant insert (owner_id, title, preview) on public.ai_conversations to authenticated;
grant update (title, title_is_custom, preview, archived_at) on public.ai_conversations to authenticated;

grant select on public.ai_messages to authenticated;
grant insert (conversation_id, owner_id, role, content, status, metadata, client_message_id, provider, model, prompt_version)
  on public.ai_messages to authenticated;
grant update (content, status, metadata) on public.ai_messages to authenticated;

grant select, delete on public.ai_attachments to authenticated;
grant insert (owner_id, conversation_id, file_name, mime_type, size_bytes, storage_path) on public.ai_attachments to authenticated;
grant update (conversation_id, message_id) on public.ai_attachments to authenticated;

grant select, delete on public.ai_automations to authenticated;
grant insert (owner_id, trigger, action, enabled, config) on public.ai_automations to authenticated;
grant update (enabled, config, last_run_at, last_status, last_error) on public.ai_automations to authenticated;

grant select on public.ai_action_requests to authenticated;
grant insert (
  owner_id, conversation_id, message_id, automation_id, tool_name, risk_level, status, input, preview,
  target_type, target_id, idempotency_key, expires_at
) on public.ai_action_requests to authenticated;
grant update (message_id, status, input, preview, result, error_code, error_message, confirmed_at, executed_at)
  on public.ai_action_requests to authenticated;

-- Registro append-only: nessun privilegio di update o delete.
grant select on public.ai_action_logs to authenticated;
grant insert (
  actor_id, conversation_id, action_request_id, automation_id, tool_name, risk_level, event,
  target_type, target_id, input_summary, error_code
) on public.ai_action_logs to authenticated;

grant select on public.ai_automation_events to authenticated;
grant update (status, attempts, action_request_id, error_code, processed_at) on public.ai_automation_events to authenticated;

-- -----------------------------------------------------------------------------
-- 10. Row Level Security: ogni riga appartiene a chi l'ha creata, e solo lo staff usa Coach AI.
-- -----------------------------------------------------------------------------
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_attachments enable row level security;
alter table public.ai_automations enable row level security;
alter table public.ai_action_requests enable row level security;
alter table public.ai_action_logs enable row level security;
alter table public.ai_automation_events enable row level security;

create policy "ai_conversations_owner" on public.ai_conversations
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (select private.is_staff()));

create policy "ai_messages_owner" on public.ai_messages
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.ai_conversations as c
      where c.id = conversation_id and c.owner_id = (select auth.uid())
    )
  );

create policy "ai_attachments_owner" on public.ai_attachments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (select private.is_staff())
    -- Il file deve stare nella cartella dell'utente.
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and (
      conversation_id is null
      or exists (
        select 1 from public.ai_conversations as c
        where c.id = conversation_id and c.owner_id = (select auth.uid())
      )
    )
  );

create policy "ai_automations_owner" on public.ai_automations
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (select private.is_staff()));

create policy "ai_action_requests_owner" on public.ai_action_requests
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (select private.is_staff())
    and (
      conversation_id is null
      or exists (
        select 1 from public.ai_conversations as c
        where c.id = conversation_id and c.owner_id = (select auth.uid())
      )
    )
  );

create policy "ai_action_logs_select_own_or_admin" on public.ai_action_logs
  for select to authenticated
  using (actor_id = (select auth.uid()) or (select private.is_admin()));

create policy "ai_action_logs_insert_own" on public.ai_action_logs
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select private.is_staff()));

create policy "ai_automation_events_owner" on public.ai_automation_events
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "ai_automation_events_update_owner" on public.ai_automation_events
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 11. Storage: bucket privato per gli allegati (solo dove esiste lo schema storage di Supabase)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'coach-ai-attachments',
      'coach-ai-attachments',
      false,
      4194304,
      array['application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp']
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    create policy "coach_ai_attachments_select_own" on storage.objects
      for select to authenticated
      using (bucket_id = 'coach-ai-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

    create policy "coach_ai_attachments_insert_own" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'coach-ai-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and (select private.is_staff())
      );

    create policy "coach_ai_attachments_delete_own" on storage.objects
      for delete to authenticated
      using (bucket_id = 'coach-ai-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end;
$$;
