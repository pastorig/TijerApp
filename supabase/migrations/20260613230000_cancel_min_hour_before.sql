-- ============================================================================
-- Cancelación pública: mínimo 1 hora antes del turno
-- ============================================================================
-- Problema: el cliente podía cancelar 1 minuto antes del turno, dejando al
-- barbero colgado sin tiempo de reacomodar su agenda.
--
-- Solución: el RPC cancel_appointment_by_token (que usa SOLO el cliente vía
-- /r/[token]/responder) rechaza la cancelación si falta menos de 1 hora.
-- Devuelve reason='too_late' para que el frontend muestre mensaje claro.
--
-- IMPORTANTE: esto NO afecta la cancelación del ADMIN (cancelAppointment en
-- src/lib/appointments.ts usa otro camino con service role). El barbero
-- siempre puede cancelar/mover cualquier turno.
--
-- Timezone: los turnos se guardan en hora local Argentina (UTC-3). Comparamos
-- el inicio del turno contra now() convertido a America/Argentina/Buenos_Aires.
-- ============================================================================

drop function if exists public.cancel_appointment_by_token(uuid);

create or replace function public.cancel_appointment_by_token(
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_appointment_date text;
  v_appointment_time text;
  v_appointment_start timestamp;
  v_now_ar timestamp;
begin
  select a.status, a.appointment_date::text, a.appointment_time::text
    into v_current_status, v_appointment_date, v_appointment_time
    from public.appointments as a
   where a.confirmation_token = p_token
   limit 1;

  if v_current_status is null then
    return json_build_object('ok', false, 'status', null, 'reason', 'not_found');
  end if;

  if v_current_status = 'cancelled' then
    return json_build_object('ok', true, 'status', v_current_status, 'reason', 'already_cancelled');
  end if;

  if v_current_status not in ('pending', 'confirmed') then
    return json_build_object('ok', false, 'status', v_current_status, 'reason', 'invalid_state');
  end if;

  -- ── Ventana mínima de 1 hora ────────────────────────────────────────────
  -- Construimos el timestamp de inicio del turno (hora local AR) y lo
  -- comparamos contra ahora en AR. Si falta menos de 1 hora, rechazamos.
  -- El concatenado funciona tanto si las columnas son text como date/time.
  begin
    v_appointment_start :=
      (v_appointment_date || ' ' || v_appointment_time)::timestamp;
    v_now_ar := (now() at time zone 'America/Argentina/Buenos_Aires');

    if v_appointment_start - v_now_ar < interval '1 hour' then
      return json_build_object(
        'ok', false,
        'status', v_current_status,
        'reason', 'too_late'
      );
    end if;
  exception
    -- Si por algún dato corrupto no se puede parsear la fecha/hora, NO
    -- bloqueamos la cancelación (preferimos dejar cancelar antes que trabar
    -- al cliente por un bug de datos). Solo seguimos al update.
    when others then
      null;
  end;

  update public.appointments as a
     set status = 'cancelled'
   where a.confirmation_token = p_token
     and a.status in ('pending', 'confirmed');

  return json_build_object('ok', true, 'status', 'cancelled', 'reason', 'ok');
end;
$$;

revoke all on function public.cancel_appointment_by_token(uuid) from public;
grant execute on function public.cancel_appointment_by_token(uuid)
  to anon, authenticated;
