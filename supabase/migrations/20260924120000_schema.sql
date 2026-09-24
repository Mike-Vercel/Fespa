-- =============================================================================
-- FESPA Coach AI — schema
-- Tabelle, vincoli, indici e trigger.
-- La sicurezza (grant, RLS, policy) è nella migration successiva.
--
-- Convenzioni:
--   *_at  → timestamptz (istante preciso)
--   *_on  → date (giorno di calendario, senza fuso orario)
-- =============================================================================

-- Schema non esposto dalle API REST: contiene helper e funzioni dei trigger.
create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Tipi enumerati
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('coach', 'admin');
create type public.client_status as enum ('onboarding', 'active', 'paused', 'completed');
create type public.followup_status as enum ('pending', 'completed', 'cancelled');
create type public.followup_source as enum ('manual', 'ai_suggestion');
create type public.ai_confidence as enum ('low', 'medium', 'high');
create type public.ai_followup_decision as enum ('pending', 'accepted', 'dismissed');
create type public.ai_request_type as enum ('checkin_analysis', 'copilot_question', 'reply_draft');
create type public.ai_interaction_status as enum ('started', 'succeeded', 'failed', 'rate_limited');

-- -----------------------------------------------------------------------------
-- profiles: un profilo per ogni utente di Supabase Auth
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  role public.app_role not null default 'coach',
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- clients: anagrafica minima (niente email/telefono: non servono all'app)
-- -----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  status public.client_status not null default 'onboarding',
  goal text check (goal is null or char_length(goal) <= 500),
  started_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_status_idx on public.clients (status);

-- -----------------------------------------------------------------------------
-- coach_clients: unica fonte di verità per "quale coach segue quale cliente"
-- -----------------------------------------------------------------------------
create table public.coach_clients (
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (coach_id, client_id)
);

create index coach_clients_client_id_idx on public.coach_clients (client_id);

-- -----------------------------------------------------------------------------
-- checkins: compilati dalle clienti (canale esterno), revisionati dalla coach
-- -----------------------------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  submitted_at timestamptz not null,
  -- Struttura validata dall'applicazione (schema Zod versionato), anche in lettura.
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  coach_reply text check (coach_reply is null or char_length(coach_reply) <= 4000),
  created_at timestamptz not null default now(),
  -- Permette alle FK composite di garantire che un'analisi punti a un check-in della stessa cliente.
  unique (id, client_id),
  constraint checkins_reviewer_requires_review check (reviewed_by is null or reviewed_at is not null),
  constraint checkins_reply_requires_review check (coach_reply is null or reviewed_at is not null)
);

create index checkins_client_submitted_idx on public.checkins (client_id, submitted_at desc);
create index checkins_pending_review_idx on public.checkins (submitted_at desc) where reviewed_at is null;
create index checkins_reviewed_by_idx on public.checkins (reviewed_by);

-- -----------------------------------------------------------------------------
-- coach_notes: note operative, visibili a chi segue la cliente
-- -----------------------------------------------------------------------------
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  -- restrict: per eliminare una coach bisogna prima riassegnare o archiviare ciò che ha scritto.
  coach_id uuid not null references public.profiles (id) on delete restrict,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_notes_client_created_idx on public.coach_notes (client_id, created_at desc);
create index coach_notes_coach_id_idx on public.coach_notes (coach_id);

-- -----------------------------------------------------------------------------
-- ai_analyses: solo output AI validati (mai ragionamenti interni del modello)
-- -----------------------------------------------------------------------------
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  checkin_id uuid not null,
  -- Coach che ha richiesto l'analisi.
  coach_id uuid not null references public.profiles (id) on delete restrict,
  summary text not null check (char_length(summary) between 1 and 2000),
  topics text[] not null default '{}' check (cardinality(topics) <= 8),
  follow_up_needed boolean not null,
  -- Proposta di follow-up ({ title, reason, dueInDays }): resta una proposta finché la coach non decide.
  followup_suggestion jsonb check (followup_suggestion is null or jsonb_typeof(followup_suggestion) = 'object'),
  followup_decision public.ai_followup_decision,
  followup_decided_at timestamptz,
  suggested_questions text[] not null default '{}' check (cardinality(suggested_questions) <= 6),
  confidence public.ai_confidence not null,
  sensitive_content_note text check (sensitive_content_note is null or char_length(sensitive_content_note) <= 600),
  provider text not null check (char_length(provider) between 1 and 40),
  model text not null check (char_length(model) between 1 and 100),
  prompt_version text not null check (char_length(prompt_version) between 1 and 60),
  -- true = risultato del provider mock (DEMO_AI_MODE): non generato da un modello AI.
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, client_id),
  foreign key (checkin_id, client_id) references public.checkins (id, client_id) on delete cascade,
  constraint ai_analyses_decision_consistency check (
    case
      when followup_suggestion is null then followup_decision is null and followup_decided_at is null
      when followup_decision = 'pending' then followup_decided_at is null
      else followup_decision is not null and followup_decided_at is not null
    end
  )
);

create index ai_analyses_checkin_created_idx on public.ai_analyses (checkin_id, created_at desc);
create index ai_analyses_client_created_idx on public.ai_analyses (client_id, created_at desc);
create index ai_analyses_coach_id_idx on public.ai_analyses (coach_id);

-- -----------------------------------------------------------------------------
-- followups: promemoria operativi della coach
-- -----------------------------------------------------------------------------
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  due_on date not null,
  status public.followup_status not null default 'pending',
  -- Gestito dal trigger: valorizzato solo quando lo stato è "completed".
  completed_at timestamptz,
  source public.followup_source not null default 'manual',
  -- Collegamento all'analisi AI da cui nasce la proposta (tracciabilità human-in-the-loop).
  ai_analysis_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (ai_analysis_id, client_id) references public.ai_analyses (id, client_id)
    on delete set null (ai_analysis_id),
  constraint followups_completion_consistency check ((status = 'completed') = (completed_at is not null)),
  constraint followups_ai_link_requires_ai_source check (ai_analysis_id is null or source = 'ai_suggestion')
);

create index followups_client_due_idx on public.followups (client_id, due_on);
create index followups_coach_status_due_idx on public.followups (coach_id, status, due_on);
create index followups_ai_analysis_id_idx on public.followups (ai_analysis_id);

-- -----------------------------------------------------------------------------
-- ai_interactions: audit delle richieste AI e base del rate limit.
-- Non contiene prompt né risposte: solo metadati.
-- -----------------------------------------------------------------------------
create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  -- set null: l'audit sopravvive all'eliminazione dell'account.
  coach_id uuid references public.profiles (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  request_type public.ai_request_type not null,
  status public.ai_interaction_status not null default 'started',
  provider text check (provider is null or char_length(provider) <= 40),
  model text check (model is null or char_length(model) <= 100),
  is_mock boolean not null default false,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 60),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_interactions_coach_created_idx on public.ai_interactions (coach_id, created_at desc);
create index ai_interactions_client_id_idx on public.ai_interactions (client_id);

-- -----------------------------------------------------------------------------
-- Trigger
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger clients_set_updated_at before update on public.clients
  for each row execute function private.set_updated_at();
create trigger coach_notes_set_updated_at before update on public.coach_notes
  for each row execute function private.set_updated_at();
create trigger followups_set_updated_at before update on public.followups
  for each row execute function private.set_updated_at();

-- completed_at è derivato dallo stato: la coach non può impostarlo a mano.
create function private.sync_followup_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger followups_sync_completed_at before insert or update on public.followups
  for each row execute function private.sync_followup_completed_at();

-- Crea il profilo alla creazione dell'utente.
-- Il ruolo NON viene mai letto dai metadata (modificabili dall'utente): parte sempre da "coach".
-- La promozione ad admin avviene solo via SQL da un operatore.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
      120
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
