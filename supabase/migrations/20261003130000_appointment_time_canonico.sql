-- appointment_time: un solo formato, "HH:MM:SS".
-- La corre Bautista en el SQL Editor de Supabase.
--
-- El problema: la columna es TEXTO y venía con dos formatos mezclados. La
-- reserva pública guarda "16:20" y el panel "16:20:00" (03/09/2026: 466 filas
-- sin segundos y 144 con). Para el índice único `appointments_unique_active_slot`
-- son claves DISTINTAS, así que dos turnos del mismo barbero, mismo día y mismo
-- minuto podían entrar los dos si llegaban en formatos distintos.
--
-- Por qué texto canónico y no pasar la columna a `time`: varias RPC públicas
-- declaran `appointment_time text` en lo que devuelven, y cambiar el tipo las
-- rompería. Con texto canónico el índice vuelve a valer y nada más cambia.
--
-- Por qué "HH:MM:SS": es lo que ya escribe la mayoría de los caminos (panel,
-- empleado, reprogramar, lista de espera) y lo que esperan las dos
-- comparaciones exactas que hay en el código (mover y reprogramar). Las
-- pantallas leen con `normalizeTimeValue` / slice(0, 5): ven lo mismo.
--
-- Todo va en una transacción: si cualquier chequeo falla, no cambia nada.

begin;

-- 1) Nada más debe reaccionar a un UPDATE de appointments. Normalizar toca cada
--    fila vieja; si hubiera un trigger de UPDATE que no conocemos (un aviso de
--    "tu turno cambió", por ejemplo), le llegaría a cientos de clientes. El
--    único conocido es el de fidelización, que solo mira estado y fecha.
do $$
declare
  v_desconocidos text;
begin
  select string_agg(t.tgname, ', ')
    into v_desconocidos
    from pg_trigger t
   where t.tgrelid = 'public.appointments'::regclass
     and not t.tgisinternal
     and (t.tgtype & 16) <> 0 -- dispara en UPDATE
     and t.tgname not in (
       'appointment_grant_stamp_trg',
       'appointments_time_canonico_trg'
     );

  if v_desconocidos is not null then
    raise exception
      'Hay triggers de UPDATE en appointments que esta migración no conoce: %. Revisar que no manden avisos antes de normalizar.',
      v_desconocidos;
  end if;
end;
$$;

-- 2) Ningún valor fuera de formato. Si hay alguno, se corta y se lista: mejor
--    verlo que adivinar qué quiso decir.
do $$
declare
  v_raros text;
begin
  select string_agg(distinct appointment_time, ', ')
    into v_raros
    from public.appointments
   where appointment_time !~ '^\d{1,2}:\d{2}(:\d{2})?$';

  if v_raros is not null then
    raise exception 'appointment_time con formato desconocido: %', v_raros;
  end if;
end;
$$;

-- 3) Ningún horario pisado que normalizar destaparía. Si hubiera dos turnos
--    activos en el mismo minuto con formatos distintos, el UPDATE chocaría con
--    el índice; mejor nombrarlos para que se resuelvan a mano.
do $$
declare
  v_pisados text;
begin
  select string_agg(
           format('%s / %s / %s %s (%s turnos)',
                  barbershop_slug, barber_id, appointment_date, hora, n),
           '; ')
    into v_pisados
    from (
      select barbershop_slug, barber_id, appointment_date,
             to_char(appointment_time::time, 'HH24:MI:SS') as hora,
             count(*) as n
        from public.appointments
       where status in ('pending', 'confirmed')
         and not is_sobreturno
       group by 1, 2, 3, 4
      having count(*) > 1
    ) d;

  if v_pisados is not null then
    raise exception 'Turnos activos en el mismo horario: %', v_pisados;
  end if;
end;
$$;

-- 4) Normalizar lo que ya está.
update public.appointments
   set appointment_time = to_char(appointment_time::time, 'HH24:MI:SS')
 where appointment_time !~ '^\d{2}:\d{2}:\d{2}$';

-- 5) Lo que entre de acá en adelante se normaliza solo, venga del camino que
--    venga. Así no depende de que cada endpoint se acuerde.
create or replace function public.tr_appointment_time_canonico()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if NEW.appointment_time ~ '^\d{1,2}:\d{2}(:\d{2})?$' then
    NEW.appointment_time := to_char(NEW.appointment_time::time, 'HH24:MI:SS');
  end if;
  -- Lo que no tiene forma de hora lo rechaza el CHECK de abajo.
  return NEW;
end;
$$;

drop trigger if exists appointments_time_canonico_trg on public.appointments;
create trigger appointments_time_canonico_trg
  before insert or update of appointment_time on public.appointments
  for each row
  execute function public.tr_appointment_time_canonico();

-- 6) Y la base lo garantiza.
alter table public.appointments
  drop constraint if exists appointments_time_formato_chk;
alter table public.appointments
  add constraint appointments_time_formato_chk
  check (appointment_time ~ '^\d{2}:\d{2}:\d{2}$');

comment on column public.appointments.appointment_time is
  'Hora del turno como texto "HH:MM:SS". Un trigger normaliza "HH:MM" al guardar; el CHECK rechaza cualquier otra cosa.';

commit;

-- Verificación (correr después; tiene que dar una sola fila, con_segundos = total):
-- select count(*) as total,
--        count(*) filter (where appointment_time ~ '^\d{2}:\d{2}:\d{2}$') as con_segundos
--   from public.appointments;
