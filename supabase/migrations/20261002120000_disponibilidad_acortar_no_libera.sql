-- ============================================================================
-- Acortar un turno ya no le libera horarios a la reserva pública
-- ============================================================================
-- La RPC devolvía coalesce(actual_duration_minutes, service_duration_minutes):
-- la "duración real" que el barbero ajusta con −5/+5 desde el turnero pisaba
-- la del servicio. En SV Barber (2/10/2026) un "Corte y barba" de 40 min quedó
-- en 30 por dos toques de −5, la página de reservas ofreció las 15:30 y entró
-- un corte encima.
--
-- Regla nueva (la misma que `minutosQueOcupa` en src/lib/availability.ts):
-- el turno ocupa el MAYOR entre las dos. Alargar bloquea más; acortar no
-- libera nada.
-- ============================================================================

begin;

create or replace function public.get_public_barber_day_appointments(
  p_barbershop_slug text,
  p_barber_id text,
  p_appointment_date text
)
returns table (
  appointment_time text,
  service_duration_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    appointment.appointment_time,
    greatest(
      appointment.service_duration_minutes,
      appointment.actual_duration_minutes
    ) as service_duration_minutes
  from public.appointments as appointment
  where appointment.barbershop_slug = p_barbershop_slug
    and appointment.barber_id = p_barber_id
    and appointment.appointment_date = p_appointment_date::date
    and appointment.status in ('pending', 'confirmed');
$$;

revoke all on function public.get_public_barber_day_appointments(text, text, text) from public;
grant execute on function public.get_public_barber_day_appointments(text, text, text) to anon, authenticated;

commit;
