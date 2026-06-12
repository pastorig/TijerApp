-- ============================================================================
-- Barber Weekly Schedule — pausa al medio (Opción B)
-- ============================================================================
-- Algunos barberos trabajan en bloques discontinuos (típico almuerzo o pausa
-- entre la mañana y la tarde). Antes el modelo solo soportaba 1 rango
-- continuo por día. Ahora soporta opcionalmente 1 pausa con break_start +
-- break_end dentro del horario.
--
-- Ejemplo SV Barber lunes:
--   start_time=15:00, end_time=21:00, break_start=16:20, break_end=18:30
--   → trabaja 15:00-16:20 y 18:30-21:00
--
-- Por barbero (cada barbero define su propio horario, no afecta a otros).
-- ============================================================================

alter table public.barber_weekly_schedules
  add column if not exists break_start time null;

alter table public.barber_weekly_schedules
  add column if not exists break_end time null;

-- Constraint: o las 2 están null, o las 2 están seteadas (no permitimos
-- una sí y la otra no — confunde la lógica de availability).
alter table public.barber_weekly_schedules
  drop constraint if exists barber_weekly_schedules_break_both_or_neither;
alter table public.barber_weekly_schedules
  add constraint barber_weekly_schedules_break_both_or_neither
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null)
  );

-- Constraint: si hay break, break_start < break_end y AMBAS dentro del rango
-- start_time .. end_time
alter table public.barber_weekly_schedules
  drop constraint if exists barber_weekly_schedules_break_within_range;
alter table public.barber_weekly_schedules
  add constraint barber_weekly_schedules_break_within_range
  check (
    break_start is null
    or (
      break_start < break_end
      and break_start >= start_time
      and break_end <= end_time
    )
  );
