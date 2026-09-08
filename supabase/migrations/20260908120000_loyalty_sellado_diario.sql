-- ============================================================================
-- FIX: el sello de fidelizacion nunca se otorgaba
-- ============================================================================
-- Sintoma: Leo Cuts tiene 143 turnos confirmados y 4 sellos. En toda la
-- plataforma habia 4 sellos, todos suyos.
--
-- Dos causas encimadas:
--
-- 1) El trigger `tr_appointment_grant_stamp` solo dispara al INSERT/UPDATE de
--    la fila, y exige que la fecha del turno YA HAYA PASADO. Pero un turno se
--    graba para manana o para el jueves: cuando se escribe, la fecha es futura
--    y no sella. Pasa el dia, nadie vuelve a tocar la fila, y no sella nunca.
--    Los 4 sellos que existen son turnos que alguien edito despues de la fecha.
--    La funcion que resuelve esto, `batch_grant_loyalty_stamps()`, existe desde
--    el dia uno y NADIE la llamaba. Ahora la llama el cron de recordatorios
--    (src/app/api/cron/reminders/route.ts), que ya corre cada hora.
--
-- 2) `current_date` en Postgres es UTC, no la fecha de la barberia. Entre las
--    21:00 y la medianoche ART, UTC ya esta en el dia siguiente, asi que un
--    turno de HOY a las 22:00 se sellaba a las 21:00, antes de que el cliente
--    se sentara en la silla. Misma clase de bug que el de la anticipacion
--    minima: la hora del server no es la hora del negocio.
--
-- Esta migracion es idempotente y no borra nada: `loyalty_stamps` tiene unique
-- por appointment_id, asi que reprocesar turnos viejos no duplica sellos.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- La fecha de hoy en la barberia, no en el server
-- ─────────────────────────────────────────────────────────────────────────────
-- Una sola definicion para que ninguna de las tres funciones de abajo pueda
-- quedar comparando contra otra cosa.

create or replace function public.fecha_hoy_argentina()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

comment on function public.fecha_hoy_argentina() is
  'Fecha actual en America/Argentina/Buenos_Aires. Usar en vez de current_date '
  '(que es UTC) en toda logica de negocio con fechas de turnos.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) grant_loyalty_stamp_for_appointment: misma logica, fecha correcta
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.grant_loyalty_stamp_for_appointment(
  p_appointment_id uuid
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment record;
  v_program_active boolean;
  v_insertado int;
begin
  select id, barbershop_slug, customer_phone, status, appointment_date
  into v_appointment
  from public.appointments
  where id = p_appointment_id;

  if not found then return 0; end if;
  if v_appointment.status <> 'confirmed' then return 0; end if;
  -- El turno tiene que haber pasado EN LA ZONA DE LA BARBERIA.
  if v_appointment.appointment_date >= public.fecha_hoy_argentina() then
    return 0;
  end if;
  if v_appointment.customer_phone is null or v_appointment.customer_phone = '' then
    return 0;
  end if;

  select is_active into v_program_active
  from public.loyalty_programs
  where barbershop_slug = v_appointment.barbershop_slug;

  if not found or not v_program_active then return 0; end if;

  insert into public.loyalty_stamps
    (barbershop_slug, customer_phone, appointment_id)
  values
    (v_appointment.barbershop_slug, v_appointment.customer_phone, v_appointment.id)
  on conflict (appointment_id) do nothing;

  -- Devolver 1 solo si realmente se inserto. Antes devolvia 1 siempre, asi que
  -- el conteo del batch contaba intentos y no sellos: un run que no sellaba
  -- nada informaba exactamente lo mismo que uno que sellaba todo.
  get diagnostics v_insertado = row_count;
  return v_insertado;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) batch_grant_loyalty_stamps: el que barre lo que el trigger no ve
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotente por diseno: solo mira turnos confirmados, ya pasados, de una
-- barberia con programa activo, y que todavia no tengan sello. Correrlo de
-- mas no hace nada; correrlo de menos es lo que estuvo pasando hasta hoy.

create or replace function public.batch_grant_loyalty_stamps()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sellados int := 0;
  v_appointment record;
begin
  for v_appointment in
    select a.id
      from public.appointments a
      join public.loyalty_programs lp on lp.barbershop_slug = a.barbershop_slug
      where a.status = 'confirmed'
        and a.appointment_date < public.fecha_hoy_argentina()
        and a.customer_phone is not null
        and a.customer_phone <> ''
        and lp.is_active = true
        and not exists (
          select 1 from public.loyalty_stamps ls
          where ls.appointment_id = a.id
        )
  loop
    v_sellados := v_sellados
      + public.grant_loyalty_stamp_for_appointment(v_appointment.id);
  end loop;
  return v_sellados;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) El trigger, con la misma fecha
-- ─────────────────────────────────────────────────────────────────────────────
-- Se queda como atajo: cuando alguien edita un turno ya pasado, el sello sale
-- en el acto en vez de esperar al cron. Ya no es el unico camino.

create or replace function public.tr_appointment_grant_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if NEW.status = 'confirmed'
     and NEW.appointment_date < public.fecha_hoy_argentina()
     and (TG_OP = 'INSERT' or OLD.status <> 'confirmed' or OLD.appointment_date <> NEW.appointment_date)
  then
    perform public.grant_loyalty_stamp_for_appointment(NEW.id);
  end if;
  return NEW;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────
-- El cron pega con service_role. Nadie mas tiene por que sellar a mano.

revoke all on function public.grant_loyalty_stamp_for_appointment(uuid) from public;
revoke all on function public.batch_grant_loyalty_stamps() from public;
grant execute on function public.batch_grant_loyalty_stamps() to service_role;
grant execute on function public.fecha_hoy_argentina() to anon, authenticated, service_role;
