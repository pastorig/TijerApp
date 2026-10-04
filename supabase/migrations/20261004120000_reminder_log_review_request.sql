-- reminder_log: permitir kind = 'review_request' (feature 033, pedido de reseña).
-- La corre Bautista en el SQL Editor de Supabase.
--
-- El cron de cierre anota cada pedido de reseña en reminder_log ANTES de mandar
-- el mail: el índice único (turno, tipo, canal) es lo que impide mandarle dos
-- veces el mismo pedido a un cliente. Sin este valor en el CHECK el insert
-- falla y el cron no manda nada — a propósito: mejor ningún pedido que uno por
-- hora. El cierre de turnos NO depende de esta migración.
--
-- Se reescribe el CHECK entero con todos los tipos que usa el código, por si la
-- migración que agregó 'deposit_reminder' (20260706130000) nunca se corrió.

begin;

alter table public.reminder_log
  drop constraint if exists reminder_log_kind_check;

alter table public.reminder_log
  add constraint reminder_log_kind_check
    check (kind in ('reminder_24h', 'confirmation', 'deposit_reminder', 'review_request'));

commit;

-- Verificación (tiene que listar los cuatro tipos):
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'reminder_log_kind_check';
