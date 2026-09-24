-- =============================================================================
-- FESPA Coach AI — vista aggregata per lista clienti e dashboard
--
-- security_invoker = true: la vista viene eseguita con i permessi di chi la
-- interroga, quindi la RLS delle tabelle sottostanti resta pienamente attiva.
-- I confronti con "oggi" NON sono qui: dipendono dal fuso orario della coach
-- e vengono calcolati nell'applicazione.
-- =============================================================================

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
  ai_stats.pending_ai_suggestion_count
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
