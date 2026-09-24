-- L'approvazione di una cliente non richiede più l'assegnazione immediata di una coach.
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

  if p_decision = 'approved' and p_coach_id is not null then
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