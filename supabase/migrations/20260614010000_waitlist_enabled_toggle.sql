-- ============================================================================
-- Toggle de lista de espera por barbería
-- ============================================================================
-- Algunos barberos tienen problemas con clientes que no entienden cómo
-- funciona la lista de espera. Les damos un switch en Configuración para
-- activarla o desactivarla. Si está OFF, el botón "Anotarme en lista de
-- espera" no aparece en el booking público.
--
-- Default true: no cambia el comportamiento actual de nadie.
-- ============================================================================

alter table public.barbershops
  add column if not exists waitlist_enabled boolean not null default true;
