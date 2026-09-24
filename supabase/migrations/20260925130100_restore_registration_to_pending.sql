-- Il ripristino di una richiesta rifiutata la riporta tra quelle da approvare.
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
declare
  v_current_status public.client_approval_status;
begin
  if not (select private.is_admin()) then
    raise exception 'Operazione riservata agli admin' using errcode = 'FC001';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Cliente non trovata' using errcode = 'FC006';
  end if;

  select approval_status into v_current_status from public.clients where id = p_client_id;

  if p_decision = 'pending' then
    if v_current_status is distinct from 'rejected' then
      raise exception 'Solo una richiesta rifiutata può essere ripristinata' using errcode = 'FC001';
    end if;
    update public.clients
    set approval_status = 'pending', reviewed_at = null, reviewed_by = null
    where id = p_client_id;
    return;
  end if;

  if p_decision = 'approved' then
    if p_coach_id is not null and not exists (
      select 1 from public.profiles where id = p_coach_id and role in ('coach', 'admin', 'super_admin')
    ) then
      raise exception 'Coach non valida' using errcode = 'FC005';
    end if;
    if p_coach_id is not null then
      insert into public.coach_clients (coach_id, client_id) values (p_coach_id, p_client_id)
      on conflict do nothing;
    end if;
  elsif p_decision <> 'rejected' then
    raise exception 'Decisione non valida' using errcode = 'FC001';
  end if;

  update public.clients
  set approval_status = p_decision, reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = p_client_id;
end;
$$;