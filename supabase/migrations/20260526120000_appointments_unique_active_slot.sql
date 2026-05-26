-- BarberSync — phase 6: blindaje contra double-booking a nivel servidor
--
-- Objetivo:
-- Garantizar a nivel Postgres que NO se puedan crear dos turnos en estado
-- activo (pending o confirmed) para la misma combinación de
-- (barbershop_slug, barber_id, appointment_date, appointment_time).
--
-- Why:
-- El frontend valida con `validateAppointmentTimeIsAvailable` antes del
-- insert, pero entre esa validación y el INSERT existe una race condition:
-- dos clientes intentando reservar el mismo slot exactamente al mismo
-- segundo pasarían ambos la validación y se duplicarían en la DB.
-- Este índice único parcial cierra esa ventana a nivel servidor.
--
-- Diseño:
-- - Índice PARCIAL: solo aplica a status in ('pending', 'confirmed').
--   Esto permite que un mismo slot quede libre cuando se cancela/elimina
--   un turno previo (status = 'cancelled' o 'deleted' no cuentan).
-- - IF NOT EXISTS: re-ejecutable sin romper.

begin;

create unique index if not exists appointments_unique_active_slot
on public.appointments (
  barbershop_slug,
  barber_id,
  appointment_date,
  appointment_time
)
where status in ('pending', 'confirmed');

commit;
