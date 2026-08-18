-- ============================================================================
-- Push: fecha en el aviso + avisar cuando el turno cambia de estado
-- ============================================================================
-- Date: 2026-08-12
--
-- Dos cosas pedidas:
--
--  1. El aviso de reserva nueva mandaba la HORA pero no la FECHA, así que el
--     barbero veía "Lucas · 15:00" sin saber si era para hoy o para el jueves.
--
--  2. El trigger estaba registrado SOLO para INSERT, por eso no llegaba nada
--     cuando el cliente confirmaba o cancelaba desde el link de WhatsApp. El
--     barbero tenía que entrar al turnero a fijarse si le habían contestado.
--
-- El aviso al CLIENTE cuando el barbero confirma/cancela NO va acá: esos push
-- no pasan por la cola (client_push_subscriptions se envía directo desde Node
-- con web-push). Eso vive en /api/appointments/notify-client.
--
-- Todo es aditivo y a prueba de fallas: si la notificación explota, la reserva
-- y el cambio de estado se completan igual.
-- ============================================================================

-- Todo en una transacción: se reemplazan DOS RPC de las que depende el link
-- público del cliente. Si algo falla a mitad, preferimos que no quede nada
-- aplicado antes que dejar confirmar/cancelar roto.
begin;

-- ── HELPER: etiqueta de fecha legible, en hora argentina ────────────────────
-- "hoy" / "mañana" / "vie 15/08". Se usa hora de Argentina y no UTC a
-- propósito: el server corre en UTC, así que pasadas las 21:00 un current_date
-- pelado ya está en el día siguiente y un turno de esta noche diría "mañana".

create or replace function public.push_date_label(p_date date)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
declare
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_dias text[] := array['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
begin
  if p_date = v_today then
    return 'hoy';
  end if;
  if p_date = v_today + 1 then
    return 'mañana';
  end if;
  -- extract(dow) da 0=domingo … 6=sábado; el array arranca en 1.
  return v_dias[extract(dow from p_date)::int + 1] || ' ' || to_char(p_date, 'DD/MM');
end;
$fn$;

comment on function public.push_date_label(date) is
  'Fecha corta para notificaciones: "hoy", "mañana" o "vie 15/08". En hora de Argentina, no UTC.';

-- ── HELPER: encolar un push para todos los admins de una barbería ───────────
-- El loop estaba adentro del trigger; ahora lo comparten el trigger de reserva
-- nueva y las dos RPC del link público. Nunca propaga errores: una
-- notificación que falla no puede voltear la operación que la disparó.

create or replace function public.enqueue_admin_push(
  p_barbershop_slug text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_sub record;
begin
  for v_sub in
    select id
      from public.push_subscriptions
     where barbershop_slug = p_barbershop_slug
       and expired_at is null
  loop
    insert into public.push_notification_queue (subscription_id, payload, status)
      values (v_sub.id, p_payload, 'pending');
  end loop;
exception
  when others then
    raise notice 'enqueue_admin_push failed for %: %', p_barbershop_slug, SQLERRM;
end;
$fn$;

comment on function public.enqueue_admin_push(text, jsonb) is
  'Encola un push para cada subscription activa de la barbería. Se traga los errores a propósito.';

-- ── Reserva nueva: ahora con la fecha ──────────────────────────────────────
-- Antes:  "Lucas · 15:00 · con Santi · Corte"
-- Ahora:  "Lucas · mañana 15:00 · con Santi · Corte"

create or replace function public.enqueue_push_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_client_name text;
  v_when_label text;
  v_body_parts text[];
begin
  if NEW.status not in ('pending', 'confirmed') then
    return NEW;
  end if;

  v_client_name := coalesce(
    nullif(split_part(NEW.customer_name, ' ', 1), ''),
    'Cliente'
  );

  -- "mañana 15:00". Si la fecha viniera corrupta cae a solo la hora, en vez
  -- de perder la notificación entera.
  begin
    v_when_label :=
      public.push_date_label(NEW.appointment_date::date)
      || ' ' || substring(NEW.appointment_time::text from 1 for 5);
  exception
    when others then
      v_when_label := substring(NEW.appointment_time::text from 1 for 5);
  end;

  v_body_parts := array[v_client_name, v_when_label];
  if NEW.barber_name is not null and NEW.barber_name <> '' then
    v_body_parts := array_append(v_body_parts, 'con ' || NEW.barber_name);
  end if;
  if NEW.service_name is not null and NEW.service_name <> '' then
    v_body_parts := array_append(v_body_parts, NEW.service_name);
  end if;

  perform public.enqueue_admin_push(
    NEW.barbershop_slug,
    jsonb_build_object(
      'title', 'Nueva reserva',
      'body', array_to_string(v_body_parts, ' · '),
      'url', '/' || NEW.barbershop_slug || '/admin/turnero',
      'tag', 'appointment-' || NEW.id::text
    )
  );

  return NEW;
end;
$fn$;

-- ── El cliente responde el link → le avisa al barbero ──────────────────────
-- Se engancha DENTRO de las RPC del token y no en un trigger AFTER UPDATE a
-- propósito: estas RPC son el único camino que usa el cliente, así que el
-- barbero no recibe un push por sus propios cambios desde el turnero.
-- Se preserva la lógica que ya tenían (estados válidos, ventana de 1 hora).

create or replace function public.confirm_appointment_by_token(
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_appt record;
  v_when_label text;
begin
  select a.status, a.appointment_date, a.appointment_time,
         a.customer_name, a.barbershop_slug, a.id
    into v_appt
    from public.appointments as a
   where a.confirmation_token = p_token
   limit 1;

  if not found then
    return json_build_object('ok', false, 'status', null, 'reason', 'not_found');
  end if;

  if v_appt.status = 'confirmed' then
    return json_build_object('ok', true, 'status', v_appt.status, 'reason', 'already_confirmed');
  end if;

  if v_appt.status <> 'pending' then
    return json_build_object('ok', false, 'status', v_appt.status, 'reason', 'invalid_state');
  end if;

  update public.appointments as a
     set status = 'confirmed'
   where a.confirmation_token = p_token
     and a.status = 'pending';

  begin
    v_when_label := public.push_date_label(v_appt.appointment_date::date)
      || ' ' || substring(v_appt.appointment_time::text from 1 for 5);
    perform public.enqueue_admin_push(
      v_appt.barbershop_slug,
      jsonb_build_object(
        'title', 'Turno confirmado',
        'body', coalesce(nullif(split_part(v_appt.customer_name, ' ', 1), ''), 'El cliente')
                || ' confirmó · ' || v_when_label,
        'url', '/' || v_appt.barbershop_slug || '/admin/turnero',
        'tag', 'appointment-' || v_appt.id::text
      )
    );
  exception
    when others then null;
  end;

  return json_build_object('ok', true, 'status', 'confirmed', 'reason', 'ok');
end;
$fn$;

revoke all on function public.confirm_appointment_by_token(uuid) from public;
grant execute on function public.confirm_appointment_by_token(uuid) to anon, authenticated;

create or replace function public.cancel_appointment_by_token(
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_appt record;
  v_appointment_start timestamp;
  v_now_ar timestamp;
  v_when_label text;
begin
  select a.status, a.appointment_date::text as fecha, a.appointment_time::text as hora,
         a.customer_name, a.barbershop_slug, a.id
    into v_appt
    from public.appointments as a
   where a.confirmation_token = p_token
   limit 1;

  if not found then
    return json_build_object('ok', false, 'status', null, 'reason', 'not_found');
  end if;

  if v_appt.status = 'cancelled' then
    return json_build_object('ok', true, 'status', v_appt.status, 'reason', 'already_cancelled');
  end if;

  if v_appt.status not in ('pending', 'confirmed') then
    return json_build_object('ok', false, 'status', v_appt.status, 'reason', 'invalid_state');
  end if;

  -- Ventana mínima de 1 hora (sin cambios respecto de la versión anterior).
  begin
    v_appointment_start := (v_appt.fecha || ' ' || v_appt.hora)::timestamp;
    v_now_ar := (now() at time zone 'America/Argentina/Buenos_Aires');

    if v_appointment_start - v_now_ar < interval '1 hour' then
      return json_build_object('ok', false, 'status', v_appt.status, 'reason', 'too_late');
    end if;
  exception
    -- Dato corrupto: preferimos dejar cancelar antes que trabar al cliente.
    when others then
      null;
  end;

  update public.appointments as a
     set status = 'cancelled'
   where a.confirmation_token = p_token
     and a.status in ('pending', 'confirmed');

  begin
    v_when_label := public.push_date_label(v_appt.fecha::date)
      || ' ' || substring(v_appt.hora from 1 for 5);
    perform public.enqueue_admin_push(
      v_appt.barbershop_slug,
      jsonb_build_object(
        'title', 'Turno cancelado',
        'body', coalesce(nullif(split_part(v_appt.customer_name, ' ', 1), ''), 'El cliente')
                || ' canceló · ' || v_when_label,
        'url', '/' || v_appt.barbershop_slug || '/admin/turnero',
        'tag', 'appointment-' || v_appt.id::text
      )
    );
  exception
    when others then null;
  end;

  return json_build_object('ok', true, 'status', 'cancelled', 'reason', 'ok');
end;
$fn$;

revoke all on function public.cancel_appointment_by_token(uuid) from public;
grant execute on function public.cancel_appointment_by_token(uuid) to anon, authenticated;

commit;
