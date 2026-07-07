-- ============================================================================
-- reminder_log: permitir kind='deposit_reminder' (US3 — recordatorio de seña)
-- ============================================================================
-- El cron /api/cron/deposits ahora manda un recordatorio de pago de seña por
-- push/email. Se loguea en reminder_log con kind='deposit_reminder' para no
-- duplicarlo. El CHECK original solo permitía 'reminder_24h' y 'confirmation'.
-- ============================================================================

alter table public.reminder_log
  drop constraint if exists reminder_log_kind_check;

alter table public.reminder_log
  add constraint reminder_log_kind_check
    check (kind in ('reminder_24h', 'confirmation', 'deposit_reminder'));
