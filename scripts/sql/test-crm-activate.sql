-- Tests de crm_activate_barbershop. Corre después del stub y de las migraciones.
-- Cada bloque falla con un mensaje claro; psql corre con ON_ERROR_STOP.

insert into public.barbershops (id, slug, name) values
  ('11111111-1111-4111-8111-111111111111', 'lopez', 'Barbería López'),
  ('22222222-2222-4222-8222-222222222222', 'sin-fila', 'Barbería Sin Fila');

insert into public.barbershop_subscriptions (barbershop_slug, status, trial_started_at, trial_expires_at)
values ('lopez', 'trial', '2026-09-01T00:00:00Z', '2026-09-15T00:00:00Z');

do $$
declare r jsonb;
begin
  r := public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-1',
    12000.00, 'transferencia', 'comprobante 1',
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  assert (r->>'replayed')::boolean = false, 'T1: no es una repetición';
  assert (r->>'paid_until')::timestamptz = '2026-10-15T00:00:00Z', 'T1: pagado hasta la fecha pedida';
  assert (select status::text from barbershop_subscriptions where barbershop_slug = 'lopez') = 'active', 'T1: queda activa';
  assert (select trial_expires_at from barbershop_subscriptions where barbershop_slug = 'lopez') is null, 'T1: sin prueba';
  assert (select current_period_ends_at from barbershop_subscriptions where barbershop_slug = 'lopez') = '2026-10-15T00:00:00Z', 'T1: período';
  assert (select count(*) from barbershop_payments) = 1, 'T1: un pago';
  assert (select source from barbershop_payments) = 'crm', 'T1: origen crm';
  assert (select paid_at from barbershop_payments) = '2026-09-15T12:00:00Z', 'T1: fecha de pago';
  assert (select note from barbershop_payments) = 'comprobante 1', 'T1: la referencia queda en la nota';
  raise notice 'ok T1 activa hasta la fecha pagada';
end $$;

do $$
declare r jsonb; primero uuid;
begin
  select id into primero from barbershop_payments;
  r := public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-1',
    12000.00, 'transferencia', 'comprobante 1',
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  assert (r->>'replayed')::boolean = true, 'T2: es una repetición';
  assert (r->>'payment_id')::uuid = primero, 'T2: devuelve el mismo pago';
  assert (select count(*) from barbershop_payments) = 1, 'T2: no duplica';
  raise notice 'ok T2 repetir no duplica';
end $$;

do $$
begin
  perform public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-otro',
    99.00, 'efectivo', null,
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  raise exception 'T3: tenía que fallar';
exception when others then
  assert sqlerrm = 'command_conflict', 'T3: esperaba command_conflict, vino ' || sqlerrm;
  assert (select count(*) from barbershop_payments) = 1, 'T3: no escribe';
  raise notice 'ok T3 mismo commandId con otro contenido es conflicto';
end $$;

do $$
begin
  perform public.crm_activate_barbershop(
    '99999999-9999-4999-8999-999999999999', 'aaaaaaaa-0000-4000-8000-000000000003', 'hash-3',
    12000.00, 'transferencia', null,
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  raise exception 'T4: tenía que fallar';
exception when others then
  assert sqlerrm = 'account_not_found', 'T4: esperaba account_not_found, vino ' || sqlerrm;
  raise notice 'ok T4 barbería inexistente';
end $$;

do $$
declare r jsonb;
begin
  -- Un pago viejo cargado tarde: cubre hasta el 1/10, pero ya estaba pago hasta el 15/10.
  r := public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000005', 'hash-5',
    12000.00, 'transferencia', null,
    '2026-09-01T12:00:00Z', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');
  assert (r->>'paid_until')::timestamptz = '2026-10-15T00:00:00Z', 'T5: no acorta el período';
  assert (select current_period_ends_at from barbershop_subscriptions where barbershop_slug = 'lopez') = '2026-10-15T00:00:00Z', 'T5: período intacto';
  assert (select count(*) from barbershop_payments) = 2, 'T5: el pago igual queda registrado';
  raise notice 'ok T5 un pago viejo no acorta el período';
end $$;

do $$
declare r jsonb;
begin
  r := public.crm_activate_barbershop(
    '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000006', 'hash-6',
    12000.00, 'mercadopago', null,
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  assert (select status::text from barbershop_subscriptions where barbershop_slug = 'sin-fila') = 'active', 'T6: crea la fila activa';
  assert (select current_period_ends_at from barbershop_subscriptions where barbershop_slug = 'sin-fila') = '2026-10-15T00:00:00Z', 'T6: con su período';
  raise notice 'ok T6 una barbería sin fila de suscripción queda activa';
end $$;

do $$
begin
  assert not has_function_privilege('anon', 'public.crm_activate_barbershop(uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz)', 'execute'), 'T7: anon no ejecuta';
  assert not has_function_privilege('authenticated', 'public.crm_activate_barbershop(uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz)', 'execute'), 'T7: authenticated no ejecuta';
  assert has_function_privilege('service_role', 'public.crm_activate_barbershop(uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz)', 'execute'), 'T7: service_role sí';
  raise notice 'ok T7 sólo el service_role puede activar';
end $$;
