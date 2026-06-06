-- ============================================================================
-- Fix: enqueue_push_for_appointment usa columnas inexistentes
-- ============================================================================
-- Date: 2026-06-06
--
-- El trigger anterior referenciaba NEW.barber_service_id y hacía JOIN contra
-- public.barber_services, pero la tabla appointments NO tiene esa columna.
-- Tiene service_name y barber_name como TEXT directamente.
--
-- El error en runtime ("column NEW.barber_service_id does not exist") hacía
-- rollback de toda la transacción del INSERT en appointments, lo cual hacía
-- que las reservas públicas fallaran con "No pudimos guardar la reserva".
--
-- Esta migration corrige el trigger usando los campos correctos del schema.
-- ============================================================================

create or replace function public.enqueue_push_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_name text;
  v_time_label text;
  v_body_parts text[];
  v_payload jsonb;
  v_sub record;
begin
  -- No-op si la reserva no es activa (cancelada, etc.)
  if NEW.status not in ('pending', 'confirmed') then
    return NEW;
  end if;

  -- v_client_name: primer nombre, fallback a "Cliente"
  v_client_name := coalesce(
    nullif(split_part(NEW.customer_name, ' ', 1), ''),
    'Cliente'
  );

  -- v_time_label: "HH:MM" del appointment_time
  -- appointment_time puede venir como text o time → cast safe a text primero
  v_time_label := substring(NEW.appointment_time::text from 1 for 5);

  -- Construir body con partes opcionales (no fallar si faltan campos)
  v_body_parts := array[v_client_name, v_time_label];
  if NEW.barber_name is not null and NEW.barber_name <> '' then
    v_body_parts := array_append(v_body_parts, 'con ' || NEW.barber_name);
  end if;
  if NEW.service_name is not null and NEW.service_name <> '' then
    v_body_parts := array_append(v_body_parts, NEW.service_name);
  end if;

  -- Payload final
  v_payload := jsonb_build_object(
    'title', 'Nueva reserva',
    'body', array_to_string(v_body_parts, ' · '),
    'url', '/' || NEW.barbershop_slug || '/admin/turnero',
    'tag', 'appointment-' || NEW.id::text
  );

  -- Encolar para cada subscription activa de la barbería
  -- Si ALGO falla acá, no debe romper el insert del appointment original
  -- (la reserva es más importante que la notificación)
  begin
    for v_sub in
      select id
        from public.push_subscriptions
        where barbershop_slug = NEW.barbershop_slug
          and expired_at is null
    loop
      insert into public.push_notification_queue (subscription_id, payload, status)
        values (v_sub.id, v_payload, 'pending');
    end loop;
  exception
    when others then
      -- Log el error pero NO hacer rollback del appointment.
      -- (Postgres raise notice se pierde en producción, pero podemos
      -- al menos no romper la transacción del usuario)
      raise notice 'enqueue_push_for_appointment failed for appointment %: %', NEW.id, SQLERRM;
  end;

  return NEW;
end;
$$;

comment on function public.enqueue_push_for_appointment() is
  'Trigger AFTER INSERT en appointments: encola push notifications para todas las subs activas de la barbería. Errores internos no rompen el insert del appointment.';
