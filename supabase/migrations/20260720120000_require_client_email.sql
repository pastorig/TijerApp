-- 008-email-obligatorio-config — Email del cliente obligatorio por barbería
-- Aditivo. No toca datos existentes.
--
-- Cada barbería decide si el email en la reserva es obligatorio. Default false
-- (comportamiento actual: opcional). Cuando true, el BookingForm exige el email
-- y el server lo valida en el camino con seña.

alter table public.barbershops
  add column if not exists require_client_email boolean not null default false;

comment on column public.barbershops.require_client_email is
  'Cuando true, el email del cliente es obligatorio al reservar. Default false (opcional).';
