-- ============================================================================
-- FIX: cast UUID en RPCs públicas que buscan por confirmation_token
-- ============================================================================
-- Bug: confirmation_token en appointments es de tipo UUID, pero los RPCs
-- públicos reciben p_token TEXT. Sin cast explícito, Postgres tira:
--   "operator does not exist: uuid = text"
-- Aplica a las 2 RPC: get_public_loyalty_status_by_token (FASE B) y
-- subscribe_client_push_by_token (FASE M).
-- ============================================================================

-- ─── 1) FIX get_public_loyalty_status_by_token ──────────────────────────────

create or replace function public.get_public_loyalty_status_by_token(
  p_token text
) returns table (
  visits_required int,
  reward_name text,
  reward_description text,
  active_stamps int,
  is_program_active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text;
  v_slug text;
begin
  -- Cast explícito p_token::uuid para que matchee con confirmation_token uuid
  select customer_phone, barbershop_slug
  into v_phone, v_slug
  from public.appointments
  where confirmation_token = p_token::uuid
  limit 1;

  if v_phone is null then return; end if;

  return query
  select
    lp.visits_required,
    lp.reward_name,
    lp.reward_description,
    coalesce((
      select count(*)::int
      from public.loyalty_stamps ls
      where ls.barbershop_slug = v_slug
        and ls.customer_phone = v_phone
        and ls.redeemed_at is null
    ), 0) as active_stamps,
    lp.is_active
  from public.loyalty_programs lp
  where lp.barbershop_slug = v_slug;

exception
  -- Si p_token no es UUID válido, no rompemos — devolvemos vacío
  when invalid_text_representation then return;
end;
$$;

-- ─── 2) FIX subscribe_client_push_by_token ──────────────────────────────────

create or replace function public.subscribe_client_push_by_token(
  p_token text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns table (
  success boolean,
  error_message text,
  subscription_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment_id uuid;
  v_subscription_id uuid;
begin
  -- Cast explícito p_token::uuid
  begin
    select id into v_appointment_id
    from public.appointments
    where confirmation_token = p_token::uuid
    limit 1;
  exception
    when invalid_text_representation then
      return query select false, 'invalid_token'::text, null::uuid;
      return;
  end;

  if v_appointment_id is null then
    return query select false, 'invalid_token'::text, null::uuid;
    return;
  end if;

  insert into public.client_push_subscriptions
    (appointment_id, endpoint, p256dh, auth, user_agent)
  values
    (v_appointment_id, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (appointment_id, endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    expired_at = null
  returning id into v_subscription_id;

  return query select true, null::text, v_subscription_id;
end;
$$;
