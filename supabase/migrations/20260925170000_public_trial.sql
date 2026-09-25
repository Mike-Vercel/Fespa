-- =============================================================================
-- Prova FESPA: chat pubblica con FESPA AI nella home, al massimo 3 messaggi per visitatore.
--
-- I visitatori non hanno un account: la prova è identificata da un token casuale in un cookie
-- HttpOnly; qui arriva solo il suo SHA-256 (token_hash), mai il token.
--
-- Accesso SOLO dal server dell'app (service_role, modulo src/server/trial): RLS attiva senza
-- policy e privilegi revocati ad anon/authenticated, anche sulle funzioni. Il browser non può
-- leggere né modificare sessioni, conteggi o riepiloghi, nemmeno con la chiave pubblica.
--
-- Le regole stanno nelle funzioni, in una transazione con la riga della prova bloccata
-- (select … for update): richieste parallele, doppi clic o retry non superano il limite,
-- e il vincolo message_count <= 3 lo garantisce comunque a livello di tabella.
--
-- Codici di errore (SQLSTATE personalizzati, vedi src/server/trial/repository.ts):
--   FC010 = prova non trovata o scaduta
--   FC011 = messaggi esauriti o prova già completata
--   FC012 = una risposta è già in preparazione
--   FC013 = servono nome ed email prima del terzo messaggio
--   FC014 = operazione non valida nello stato attuale
-- =============================================================================

create type public.trial_message_role as enum ('user', 'assistant');
create type public.trial_email_status as enum ('not_requested', 'sending', 'sent', 'failed');

create table public.trial_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  message_count smallint not null default 0 check (message_count between 0 and 3),
  -- Generazione in corso: una sola risposta alla volta. Scade da sola se il server si interrompe.
  generation_locked_until timestamptz,
  lead_name text check (char_length(btrim(lead_name)) between 1 and 80),
  lead_email text check (char_length(lead_email) between 3 and 254 and lead_email = lower(lead_email)),
  -- Consenso esplicito al trattamento per ricevere il riepilogo (nessun consenso marketing).
  privacy_consent_at timestamptz,
  summary jsonb,
  completed_at timestamptz,
  email_status public.trial_email_status not null default 'not_requested',
  email_attempts smallint not null default 0 check (email_attempts between 0 and 3),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Conservazione: dopo 30 giorni la prova scade e viene cancellata (vedi trial_start).
  expires_at timestamptz not null default now() + interval '30 days',
  constraint trial_sessions_lead_complete
    check ((lead_name is null) = (lead_email is null) and (lead_email is null) = (privacy_consent_at is null)),
  constraint trial_sessions_summary_on_completion check ((completed_at is null) = (summary is null))
);

create table public.trial_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.trial_sessions (id) on delete cascade,
  seq smallint not null check (seq between 1 and 10),
  role public.trial_message_role not null,
  content text not null check (char_length(content) between 1 and 2000),
  -- Idempotenza: lo stesso invio (doppio clic, retry HTTP) non crea un secondo messaggio.
  client_message_id uuid,
  created_at timestamptz not null default now(),
  unique (session_id, seq),
  unique (session_id, client_message_id)
);

-- Rate limit condiviso tra le funzioni serverless: un evento per richiesta, contato per finestra.
-- bucket: chiave opaca calcolata dal server (mai un IP in chiaro).
create table public.trial_rate_events (
  id bigint generated always as identity primary key,
  bucket text not null check (char_length(bucket) between 1 and 120),
  created_at timestamptz not null default now()
);

create index trial_rate_events_bucket_created_at on public.trial_rate_events (bucket, created_at);
create index trial_sessions_expires_at on public.trial_sessions (expires_at);

create trigger trial_sessions_set_updated_at
  before update on public.trial_sessions
  for each row execute function private.set_updated_at();

alter table public.trial_sessions enable row level security;
alter table public.trial_messages enable row level security;
alter table public.trial_rate_events enable row level security;

revoke all on public.trial_sessions, public.trial_messages, public.trial_rate_events from public, anon, authenticated;
grant all on public.trial_sessions, public.trial_messages, public.trial_rate_events to service_role;

-- -----------------------------------------------------------------------------
-- Funzioni interne
-- -----------------------------------------------------------------------------

-- Stato della prova come lo vede l'app (niente token, niente id interni).
create function private.trial_state_json(p_session public.trial_sessions)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'messageCount', p_session.message_count,
    'leadName', p_session.lead_name,
    'leadEmail', p_session.lead_email,
    'summary', p_session.summary,
    'completedAt', p_session.completed_at,
    'emailStatus', p_session.email_status,
    'emailAttempts', p_session.email_attempts,
    'generationLocked', coalesce(p_session.generation_locked_until > now(), false),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('seq', m.seq, 'role', m.role, 'content', m.content, 'createdAt', m.created_at) order by m.seq)
      from public.trial_messages m
      where m.session_id = p_session.id
    ), '[]'::jsonb)
  )
$$;

-- Prova valida bloccata per la durata della transazione.
create function private.trial_lock(p_token_hash text)
returns public.trial_sessions
language plpgsql
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  select * into v_session
  from public.trial_sessions
  where token_hash = p_token_hash and expires_at > now()
  for update;

  if not found then
    raise exception 'prova non trovata o scaduta' using errcode = 'FC010';
  end if;
  return v_session;
end;
$$;

create function private.trial_last_role(p_session_id uuid)
returns public.trial_message_role
language sql
stable
set search_path = ''
as $$
  select role from public.trial_messages where session_id = p_session_id order by seq desc limit 1
$$;

revoke all on function private.trial_state_json(public.trial_sessions) from public;
revoke all on function private.trial_lock(text) from public;
revoke all on function private.trial_last_role(uuid) from public;

-- -----------------------------------------------------------------------------
-- Funzioni chiamate dal server (solo service_role)
-- -----------------------------------------------------------------------------

-- Stato della prova, o null se non esiste o è scaduta. Non crea nulla.
create function public.trial_get(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  select * into v_session from public.trial_sessions where token_hash = p_token_hash and expires_at > now();
  if not found then
    return null;
  end if;
  return private.trial_state_json(v_session);
end;
$$;

-- Nuova prova (al primo messaggio). Cancella anche le prove scadute, un blocco alla volta.
create function public.trial_start(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  delete from public.trial_sessions
  where id in (select id from public.trial_sessions where expires_at < now() limit 200);

  insert into public.trial_sessions (token_hash) values (p_token_hash)
  on conflict (token_hash) do nothing;

  v_session := private.trial_lock(p_token_hash);
  return private.trial_state_json(v_session);
end;
$$;

-- Messaggio della visitatrice: conta, blocca la generazione della risposta e rispetta le regole.
create function public.trial_add_user_message(p_token_hash text, p_client_message_id uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
  v_seq smallint;
begin
  v_session := private.trial_lock(p_token_hash);

  -- Stesso invio già registrato (doppio clic, retry HTTP): nessun effetto, e chi chiama lo sa
  -- ("inserted": false), così non avvia una seconda generazione della risposta.
  if exists (select 1 from public.trial_messages where session_id = v_session.id and client_message_id = p_client_message_id) then
    return private.trial_state_json(v_session) || jsonb_build_object('inserted', false);
  end if;

  if v_session.completed_at is not null or v_session.message_count >= 3 then
    raise exception 'messaggi esauriti' using errcode = 'FC011';
  end if;
  -- Il messaggio precedente aspetta ancora la risposta (o la sta ricevendo): prima quella.
  if private.trial_last_role(v_session.id) = 'user' or v_session.generation_locked_until > now() then
    raise exception 'risposta in preparazione' using errcode = 'FC012';
  end if;
  if v_session.message_count = 2 and v_session.lead_email is null then
    raise exception 'servono nome ed email' using errcode = 'FC013';
  end if;

  select coalesce(max(seq), 0) + 1 into v_seq from public.trial_messages where session_id = v_session.id;
  insert into public.trial_messages (session_id, seq, role, content, client_message_id)
  values (v_session.id, v_seq, 'user', p_content, p_client_message_id);

  update public.trial_sessions
  set message_count = message_count + 1, generation_locked_until = now() + interval '90 seconds'
  where id = v_session.id
  returning * into v_session;

  return private.trial_state_json(v_session) || jsonb_build_object('inserted', true);
end;
$$;

-- Riprendere una generazione (retry, ultima domanda dopo i dati): una alla volta.
create function public.trial_claim_generation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  v_session := private.trial_lock(p_token_hash);
  if v_session.generation_locked_until > now() then
    raise exception 'risposta in preparazione' using errcode = 'FC012';
  end if;

  update public.trial_sessions
  set generation_locked_until = now() + interval '90 seconds'
  where id = v_session.id
  returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

-- Generazione fallita: si può riprovare subito.
create function public.trial_release_generation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  v_session := private.trial_lock(p_token_hash);
  update public.trial_sessions set generation_locked_until = null where id = v_session.id returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

-- Risposta di FESPA AI (già validata dal server). Al massimo 3: due risposte e l'ultima domanda.
create function public.trial_add_assistant_message(p_token_hash text, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
  v_seq smallint;
begin
  v_session := private.trial_lock(p_token_hash);
  if v_session.completed_at is not null or v_session.generation_locked_until is null then
    raise exception 'nessuna risposta attesa' using errcode = 'FC014';
  end if;
  if (select count(*) from public.trial_messages where session_id = v_session.id and role = 'assistant') >= 3 then
    raise exception 'risposte esaurite' using errcode = 'FC014';
  end if;

  select coalesce(max(seq), 0) + 1 into v_seq from public.trial_messages where session_id = v_session.id;
  insert into public.trial_messages (session_id, seq, role, content) values (v_session.id, v_seq, 'assistant', p_content);

  update public.trial_sessions set generation_locked_until = null where id = v_session.id returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

-- Nome, email e consenso per ricevere il riepilogo (validati anche dal server con Zod).
create function public.trial_save_lead(p_token_hash text, p_name text, p_email text, p_privacy_consent boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  v_session := private.trial_lock(p_token_hash);
  if v_session.completed_at is not null then
    raise exception 'prova già completata' using errcode = 'FC011';
  end if;
  if v_session.message_count < 1
    or p_privacy_consent is distinct from true
    or char_length(btrim(coalesce(p_name, ''))) not between 1 and 80
    or lower(btrim(coalesce(p_email, ''))) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'dati non validi' using errcode = 'FC014';
  end if;

  update public.trial_sessions
  set lead_name = btrim(p_name),
      lead_email = lower(btrim(p_email)),
      privacy_consent_at = coalesce(privacy_consent_at, now())
  where id = v_session.id
  returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

-- Riepilogo strutturato (già validato dal server): chiude la prova. Ripetuto, non cambia nulla.
create function public.trial_complete(p_token_hash text, p_summary jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  v_session := private.trial_lock(p_token_hash);
  if v_session.completed_at is not null then
    return private.trial_state_json(v_session);
  end if;
  if v_session.message_count <> 3
    or v_session.lead_email is null
    or private.trial_last_role(v_session.id) <> 'user'
    or jsonb_typeof(p_summary) <> 'object' then
    raise exception 'riepilogo non atteso' using errcode = 'FC014';
  end if;

  update public.trial_sessions
  set summary = p_summary, completed_at = now(), generation_locked_until = null
  where id = v_session.id
  returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

-- Invio del riepilogo via email: al massimo 3 tentativi, uno alla volta, mai dopo un invio riuscito.
-- Se l'invio è già riuscito lo stato resta "sent" e il server non invia di nuovo.
create function public.trial_begin_email(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  v_session := private.trial_lock(p_token_hash);
  if v_session.completed_at is null or v_session.lead_email is null then
    raise exception 'nessun riepilogo da inviare' using errcode = 'FC014';
  end if;
  if v_session.email_status = 'sent' then
    return private.trial_state_json(v_session);
  end if;
  if v_session.email_status = 'sending' and v_session.updated_at > now() - interval '2 minutes' then
    raise exception 'invio in corso' using errcode = 'FC012';
  end if;
  if v_session.email_attempts >= 3 then
    raise exception 'tentativi esauriti' using errcode = 'FC011';
  end if;

  update public.trial_sessions
  set email_status = 'sending', email_attempts = email_attempts + 1
  where id = v_session.id
  returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

create function public.trial_finish_email(p_token_hash text, p_sent boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.trial_sessions;
begin
  v_session := private.trial_lock(p_token_hash);
  if v_session.email_status <> 'sending' then
    return private.trial_state_json(v_session);
  end if;

  update public.trial_sessions
  set email_status = case when p_sent then 'sent'::public.trial_email_status else 'failed'::public.trial_email_status end,
      email_sent_at = case when p_sent then now() end
  where id = v_session.id
  returning * into v_session;
  return private.trial_state_json(v_session);
end;
$$;

-- Registra una richiesta nel bucket e dice se è entro il limite della finestra.
-- Con richieste in raffica il limite scatta al massimo "troppo presto", mai troppo tardi.
create function public.trial_rate_limit(p_bucket text, p_window_seconds integer, p_max_events integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trial_rate_events
  where id in (select id from public.trial_rate_events where created_at < now() - interval '2 days' limit 500);

  insert into public.trial_rate_events (bucket) values (p_bucket);
  return (
    select count(*) from public.trial_rate_events
    where bucket = p_bucket and created_at > now() - make_interval(secs => p_window_seconds)
  ) <= p_max_events;
end;
$$;

revoke all on function public.trial_get(text) from public, anon, authenticated;
revoke all on function public.trial_start(text) from public, anon, authenticated;
revoke all on function public.trial_add_user_message(text, uuid, text) from public, anon, authenticated;
revoke all on function public.trial_claim_generation(text) from public, anon, authenticated;
revoke all on function public.trial_release_generation(text) from public, anon, authenticated;
revoke all on function public.trial_add_assistant_message(text, text) from public, anon, authenticated;
revoke all on function public.trial_save_lead(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.trial_complete(text, jsonb) from public, anon, authenticated;
revoke all on function public.trial_begin_email(text) from public, anon, authenticated;
revoke all on function public.trial_finish_email(text, boolean) from public, anon, authenticated;
revoke all on function public.trial_rate_limit(text, integer, integer) from public, anon, authenticated;

grant execute on function public.trial_get(text) to service_role;
grant execute on function public.trial_start(text) to service_role;
grant execute on function public.trial_add_user_message(text, uuid, text) to service_role;
grant execute on function public.trial_claim_generation(text) to service_role;
grant execute on function public.trial_release_generation(text) to service_role;
grant execute on function public.trial_add_assistant_message(text, text) to service_role;
grant execute on function public.trial_save_lead(text, text, text, boolean) to service_role;
grant execute on function public.trial_complete(text, jsonb) to service_role;
grant execute on function public.trial_begin_email(text) to service_role;
grant execute on function public.trial_finish_email(text, boolean) to service_role;
grant execute on function public.trial_rate_limit(text, integer, integer) to service_role;
