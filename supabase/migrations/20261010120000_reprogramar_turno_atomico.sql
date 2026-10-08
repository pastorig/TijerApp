-- reprogramar_turno_atomico: el mismo candado de la reserva (037), para cuando
-- el CLIENTE mueve su turno desde el link. La corre Bautista en el SQL Editor.
--
-- ── El problema ─────────────────────────────────────────────────────────────
-- La 037 cerró la carrera en la reserva pública, pero reprogramar quedó como
-- estaba: primero se pregunta "¿está libre?" y después se hace el update. Un
-- cliente moviendo su turno a las 9:20 y otro reservando 40 minutos a las 9:00
-- en el mismo instante pasaban los dos. El índice único solo frena la misma
-- hora de inicio.
--
-- ── La salida ───────────────────────────────────────────────────────────────
-- La misma receta: candado por (barbería, barbero, día), mirar la agenda con el
-- candado tomado y recién ahí mover. La clave del candado es IDÉNTICA a la de
-- `reservar_turno_atomico`, así que una reserva y una reprogramación para el
-- mismo barbero y el mismo día se esperan entre sí.
--
-- El candado se toma sobre el día de DESTINO, que es donde puede haber choque.
--
-- Qué NO cubre, a propósito: mover un turno desde el panel del dueño o desde la
-- agenda del empleado. Ahí encimar es una decisión de quien atiende (existen
-- los sobreturnos), no una carrera.
--
-- Si el horario está ocupado tira 23505, igual que la reserva. Hasta que esta
-- migración se corra, reprogramar sigue funcionando como hoy: el servidor
-- detecta que la función no existe y hace el update por el camino anterior.

begin;

create or replace function public.reprogramar_turno_atomico(
  p_turno_id uuid,
  p_fecha date,
  p_hora text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_turno public.appointments%rowtype;
  v_hora text := left(coalesce(p_hora, ''), 5);
  v_duracion integer;
  v_inicio integer;
  v_fin integer;
begin
  if p_turno_id is null or p_fecha is null or v_hora !~ '^\d{2}:\d{2}$' then
    raise exception 'Reprogramación inválida' using errcode = '22023';
  end if;

  select * into v_turno from public.appointments a where a.id = p_turno_id;
  if not found or v_turno.status in ('cancelled', 'deleted') then
    raise exception 'Turno no encontrado' using errcode = 'P0002';
  end if;

  -- Lo que ocupa: la misma regla que el resto del sistema. Un turno viejo sin
  -- duración cargada ocupa un intervalo de la barbería.
  v_duracion := greatest(
    coalesce(v_turno.service_duration_minutes, 0),
    coalesce(v_turno.actual_duration_minutes, 0)
  );
  if v_duracion <= 0 then
    select coalesce(b.slot_interval_minutes, 30) into v_duracion
    from public.barbershops b where b.slug = v_turno.barbershop_slug;
    v_duracion := coalesce(v_duracion, 30);
  end if;

  v_inicio := split_part(v_hora, ':', 1)::integer * 60 + split_part(v_hora, ':', 2)::integer;
  v_fin := v_inicio + v_duracion;

  -- El candado. Misma clave que `reservar_turno_atomico`.
  perform pg_advisory_xact_lock(
    hashtextextended(
      v_turno.barbershop_slug || '|' || v_turno.barber_id || '|' || p_fecha::text, 0
    )
  );

  -- ¿Algún OTRO turno activo se pisa con el horario nuevo?
  if exists (
    select 1
    from public.appointments a
    where a.barbershop_slug = v_turno.barbershop_slug
      and a.barber_id = v_turno.barber_id
      and a.appointment_date = p_fecha
      and a.id <> p_turno_id
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

  -- Vuelve a "pendiente": el barbero tiene que confirmar el horario nuevo.
  update public.appointments
  set appointment_date = p_fecha,
      appointment_time = v_hora || ':00',
      status = 'pending'
  where id = p_turno_id;

  return p_turno_id;
end;
$$;

comment on function public.reprogramar_turno_atomico(uuid, date, text) is
  'Reprogramación del cliente: candado por barbero y día, chequeo de superposición y update en una sola transacción (037).';

-- Solo el servidor. Una función nueva nace ejecutable por todos.
revoke all on function public.reprogramar_turno_atomico(uuid, date, text) from public, anon, authenticated;
grant execute on function public.reprogramar_turno_atomico(uuid, date, text) to service_role;

commit;

-- Verificación (tiene que devolver una fila con el nombre de la función):
-- select proname from pg_proc where proname = 'reprogramar_turno_atomico';
