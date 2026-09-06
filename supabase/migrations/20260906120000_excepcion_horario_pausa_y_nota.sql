-- Feature 030 — Excepción de horario por rango de días
--
-- Objetivo:
-- Que una excepción de horario pueda conservar (o redefinir) la pausa del
-- mediodía, y que se le pueda poner un motivo.
--
-- Why:
-- Hoy, cuando una fecha tiene excepción, el motor arma el día con la pausa en
-- null: la excepción reemplaza la jornada entera, almuerzo incluido. El código
-- lo llamaba "caso edge raro" y no lo es — 5 de los barberos en producción
-- tienen pausa configurada, y ya pegó dos veces: el 30 y el 31 de julio de
-- 2026, un barbero con pausa de 13:00 a 16:00 quedó con esas tres horas
-- abiertas a reservas.
--
-- Con la pantalla nueva para cargar semanas enteras, eso pasaría de raro a
-- cotidiano. Por eso el arreglo va ANTES que la pantalla.
--
-- Diseño:
-- - `hereda_pausa` con DEFAULT TRUE arregla las 16 filas ya cargadas sin
--   necesidad de backfill: todas pasan a respetar la pausa semanal.
-- - Son TRES estados y dos columnas no alcanzan:
--     hereda_pausa = true            → usa la pausa de la regla semanal
--     hereda_pausa = false + horas   → pausa propia de ese día
--     hereda_pausa = false + nulls   → ese día no para
-- - Todo aditivo y con default: no rompe nada de lo que ya está andando.

begin;

alter table public.barber_day_overrides
  add column if not exists hereda_pausa boolean not null default true,
  add column if not exists break_start time,
  add column if not exists break_end time,
  add column if not exists nota text;

comment on column public.barber_day_overrides.hereda_pausa is
  'true = la pausa sale de la regla semanal de ese día. false = manda break_start/break_end (ambos null = ese día no para).';

-- Media pausa no significa nada: o están las dos puntas, o no hay pausa.
alter table public.barber_day_overrides
  drop constraint if exists barber_day_overrides_pausa_completa;
alter table public.barber_day_overrides
  add constraint barber_day_overrides_pausa_completa
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_start < break_end)
  );

-- Y tiene que caer adentro de la jornada, o taparía horarios que no existen.
alter table public.barber_day_overrides
  drop constraint if exists barber_day_overrides_pausa_dentro_de_jornada;
alter table public.barber_day_overrides
  add constraint barber_day_overrides_pausa_dentro_de_jornada
  check (
    break_start is null
    or (break_start >= start_time and break_end <= end_time)
  );

commit;
