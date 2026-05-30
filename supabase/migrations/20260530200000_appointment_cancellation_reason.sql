begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Motivo de cancelación por turno
-- Texto opcional que registra POR QUÉ se canceló un turno. Habilita
-- analytics futuras (no-shows %, motivos top, etc.) y da contexto al
-- ver el historial.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.appointments
  add column if not exists cancellation_reason text null;

comment on column public.appointments.cancellation_reason is
  'Motivo registrado al cancelar el turno (no-show, cliente avisó, error de carga, etc.). NULL si no se cargó al cancelar o si el turno no está cancelled. Texto libre, opcionalmente con un valor de preset prepended.';

commit;
