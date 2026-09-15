-- Activación desde crmsaas (contrato de activación v1).
-- Aditivo: cuatro columnas en barbershop_payments y una RPC nueva.
-- No toca register_barbershop_payment ni datos existentes.

alter table public.barbershop_payments
  add column if not exists command_id uuid null,
  add column if not exists request_hash text null,
  add column if not exists paid_at timestamptz null,
  add column if not exists source text not null default 'owner';

-- Un pedido del CRM entra una sola vez. Los pagos del owner no tienen command_id.
create unique index if not exists barbershop_payments_command_id_key
  on public.barbershop_payments (command_id)
  where command_id is not null;

create or replace function public.crm_activate_barbershop(
  p_barbershop_id uuid,
  p_command_id uuid,
  p_request_hash text,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_paid_at timestamptz,
  p_coverage_start timestamptz,
  p_coverage_end timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_existing public.barbershop_payments;
  v_current_end timestamptz;
  v_paid_until timestamptz;
  v_payment public.barbershop_payments;
begin
  -- Repetición: el mismo pedido devuelve lo mismo; otro contenido es conflicto.
  select * into v_existing from public.barbershop_payments where command_id = p_command_id;
  if found then
    if v_existing.request_hash is distinct from p_request_hash then
      raise exception 'command_conflict';
    end if;
    return jsonb_build_object(
      'payment_id', v_existing.id,
      'paid_until', (select current_period_ends_at from public.barbershop_subscriptions
                      where barbershop_slug = v_existing.barbershop_slug),
      'replayed', true);
  end if;

  select slug into v_slug from public.barbershops where id = p_barbershop_id;
  if v_slug is null then
    raise exception 'account_not_found';
  end if;

  -- Una barbería sin fila de suscripción tiene una prueba sólo en memoria
  -- (getBarbershopPlan): se crea la fila para que el pago tenga dónde quedar.
  insert into public.barbershop_subscriptions (barbershop_slug, status)
  values (v_slug, 'active')
  on conflict (barbershop_slug) do nothing;

  select current_period_ends_at into v_current_end
    from public.barbershop_subscriptions
   where barbershop_slug = v_slug
   for update;

  -- Un pago viejo cargado tarde no acorta un período vigente.
  -- greatest ignora el null de una barbería que nunca pagó.
  v_paid_until := greatest(v_current_end, p_coverage_end);

  insert into public.barbershop_payments (
    barbershop_slug, amount, method, period_start, period_end, note,
    registered_by, command_id, request_hash, paid_at, source
  ) values (
    v_slug, p_amount, p_method, p_coverage_start, p_coverage_end, p_reference,
    'crmsaas', p_command_id, p_request_hash, p_paid_at, 'crm'
  )
  returning * into v_payment;

  update public.barbershop_subscriptions
     set current_period_started_at = case
           when v_current_end is null or p_coverage_end > v_current_end then p_coverage_start
           else current_period_started_at
         end,
         current_period_ends_at = v_paid_until,
         status                 = 'active',
         trial_expires_at       = null,
         grace_expires_at       = null,
         updated_at             = now()
   where barbershop_slug = v_slug;

  return jsonb_build_object('payment_id', v_payment.id, 'paid_until', v_paid_until, 'replayed', false);
exception
  when unique_violation then
    -- Dos pedidos iguales a la vez: el segundo espera al primero y choca con
    -- el índice. Si es el mismo contenido, es una repetición.
    select * into v_existing from public.barbershop_payments where command_id = p_command_id;
    if found and v_existing.request_hash = p_request_hash then
      return jsonb_build_object('payment_id', v_existing.id, 'paid_until', v_existing.period_end, 'replayed', true);
    end if;
    raise exception 'command_conflict';
end;
$$;

revoke all on function public.crm_activate_barbershop(
  uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.crm_activate_barbershop(
  uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz
) to service_role;
