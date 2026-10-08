-- reservar_turno_atomico: chequear que el horario esté libre y guardar el turno
-- en UN solo paso (feature 037). La corre Bautista en el SQL Editor.
--
-- ── El problema ─────────────────────────────────────────────────────────────
-- La reserva pública hacía dos cosas separadas: primero preguntaba "¿está
-- libre?" y después insertaba. Entre una y otra pasan unos milisegundos, y dos
-- clientes reservando a la vez podían pasar los dos el chequeo.
--
-- El índice único `appointments_unique_active_slot` frena el caso de la MISMA
-- hora de inicio. Pero no el de dos turnos que se pisan con horas distintas:
-- un corte de 40 minutos a las 9:00 y otro a las 9:20. Los dos entraban.
--
-- ── La salida ───────────────────────────────────────────────────────────────
-- Un candado por (barbería, barbero, día) que dura lo que dura la transacción:
-- el segundo pedido para ese barbero y ese día espera a que termine el primero,
-- y cuando le toca, vuelve a mirar la agenda y ya ve el turno del otro.
--
-- Qué mira: los turnos activos (pendientes y confirmados) de ese barbero ese
-- día, con la misma regla de duración que usa el resto del sistema — si el
-- barbero alargó un turno, ocupa lo que dura de verdad.
--
-- Qué NO mira: el horario del barbero, sus pausas, bloqueos y la anticipación
-- mínima. Eso lo sigue validando el servidor antes de llamar acá; no cambia en
-- milisegundos, así que no hay carrera que cubrir.
--
-- Si el horario está ocupado tira el error 23505 (el mismo del índice único),
-- que el servidor ya traduce a "ese horario acaba de ocuparse".
--
-- Hasta que esta migración se corra, la reserva sigue funcionando como hoy: el
-- servidor detecta que la función no existe y guarda el turno por el camino
-- anterior.

begin;

create or replace function public.reservar_turno_atomico(p_turno jsonb)
returns table (turno_id uuid, turno_token uuid)
language plpgsql
set search_path = public
as $$
declare
  v_slug text := p_turno->>'barbershop_slug';
  v_barbero text := p_turno->>'barber_id';
  v_fecha date := (p_turno->>'appointment_date')::date;
  v_hora text := left(coalesce(p_turno->>'appointment_time', ''), 5);
  v_duracion integer := (p_turno->>'service_duration_minutes')::integer;
  v_inicio integer;
  v_fin integer;
begin
  if v_slug is null or v_barbero is null or v_fecha is null
     or v_hora !~ '^\d{2}:\d{2}$' or coalesce(v_duracion, 0) <= 0 then
    raise exception 'Turno inválido' using errcode = '22023';
  end if;

  v_inicio := split_part(v_hora, ':', 1)::integer * 60 + split_part(v_hora, ':', 2)::integer;
  v_fin := v_inicio + v_duracion;

  -- El candado. Se suelta solo al terminar la transacción (commit o rollback).
  perform pg_advisory_xact_lock(
    hashtextextended(v_slug || '|' || v_barbero || '|' || v_fecha::text, 0)
  );

  -- Con el candado tomado, ¿hay algún turno activo que se pise con este?
  -- Dos rangos se pisan si cada uno empieza antes de que termine el otro.
  if exists (
    select 1
    from public.appointments a
    where a.barbershop_slug = v_slug
      and a.barber_id = v_barbero
      and a.appointment_date = v_fecha
      and a.status in ('pending', 'confirmed')
      and a.appointment_time ~ '^\d{2}:\d{2}'
      and (split_part(a.appointment_time, ':', 1)::integer * 60
           + split_part(a.appointment_time, ':', 2)::integer) < v_fin
      and (split_part(a.appointment_time, ':', 1)::integer * 60
           + split_part(a.appointment_time, ':', 2)::integer
           + greatest(coalesce(a.service_duration_minutes, 0),
                      coalesce(a.actual_duration_minutes, 0))) > v_inicio
  ) then
    raise exception 'Horario ocupado' using errcode = '23505';
  end if;

  return query
  insert into public.appointments as nuevo (
    barbershop_slug, barber_id, barber_name,
    customer_name, customer_phone, customer_email,
    service_name, service_price, service_duration_minutes,
    appointment_date, appointment_time, comment, status,
    coupon_id, discount_amount,
    deposit_required, deposit_amount, deposit_status, deposit_expires_at
  ) values (
    v_slug, v_barbero, p_turno->>'barber_name',
    p_turno->>'customer_name', p_turno->>'customer_phone', p_turno->>'customer_email',
    p_turno->>'service_name', (p_turno->>'service_price')::integer, v_duracion,
    v_fecha, p_turno->>'appointment_time', coalesce(p_turno->>'comment', ''),
    coalesce(p_turno->>'status', 'pending'),
    (p_turno->>'coupon_id')::uuid, (p_turno->>'discount_amount')::numeric,
    coalesce((p_turno->>'deposit_required')::boolean, false),
    (p_turno->>'deposit_amount')::integer, p_turno->>'deposit_status',
    (p_turno->>'deposit_expires_at')::timestamptz
  )
  returning nuevo.id, nuevo.confirmation_token;
end;
$$;

comment on function public.reservar_turno_atomico(jsonb) is
  'Reserva pública: candado por barbero y día, chequeo de superposición e insert en una sola transacción (037).';

-- Solo el servidor. Una función nueva nace ejecutable por todos.
revoke all on function public.reservar_turno_atomico(jsonb) from public, anon, authenticated;
grant execute on function public.reservar_turno_atomico(jsonb) to service_role;

commit;

-- Verificación (tiene que devolver una fila con el nombre de la función):
-- select proname from pg_proc where proname = 'reservar_turno_atomico';
