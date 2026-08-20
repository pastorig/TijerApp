-- ─────────────────────────────────────────────────────────────────────────────
-- Aviso de vencimiento del plan: registro de lo ya enviado
--
-- ─── PARA QUÉ ────────────────────────────────────────────────────────────────
-- El cron corre cada hora. Sin un registro de lo enviado, al barbero le
-- llegarían 24 notificaciones por día diciéndole que le vence el plan.
--
-- ─── POR QUÉ NO SE REUSA `reminder_log` ──────────────────────────────────────
-- Esa tabla tiene `appointment_id not null` referenciando `appointments`.
-- Estos avisos son de una barbería, no de un turno: no hay id de turno que
-- poner.
--
-- ─── POR QUÉ EL VENCIMIENTO FORMA PARTE DE LA CLAVE ──────────────────────────
-- Con una clave `(barbershop_slug, kind)` a secas, el aviso se enviaría UNA
-- SOLA VEZ en la vida de la barbería: al renovar y volver a vencer el mes
-- siguiente, la fila ya existiría y el insert fallaría para siempre. Con
-- `period_ends_at` adentro, cada período es un aviso nuevo.
--
-- ─── EL INSERT ES EL CANDADO ─────────────────────────────────────────────────
-- El código NO pregunta "¿ya avisé?" y después inserta: intenta insertar y
-- lee la violación de unicidad (23505) como "ya estaba avisado". Preguntar
-- primero deja una ventana en la que dos corridas superpuestas del cron
-- mandan el push dos veces.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.plan_notice_log (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null references public.barbershops(slug),
  -- 'vence_3d'  = entró en la ventana de 3 días o menos
  -- 'vence_hoy' = hoy se le corta
  kind text not null check (kind in ('vence_3d', 'vence_hoy')),
  -- El vencimiento al que corresponde ESTE aviso.
  period_ends_at date not null,
  sent_at timestamptz not null default now(),
  -- A cuántos dispositivos se encoló. 0 = el admin no tiene notificaciones
  -- activas; el aviso igual queda registrado porque el cartel del panel sí
  -- lo va a ver.
  devices int not null default 0
);

comment on table public.plan_notice_log is
  'Avisos de vencimiento de plan ya enviados. Una fila por (barbería, tipo de aviso, vencimiento).';

create unique index if not exists plan_notice_log_unico
  on public.plan_notice_log (barbershop_slug, kind, period_ends_at);

alter table public.plan_notice_log enable row level security;

-- Sin políticas a propósito: solo la toca el cron con `service_role`, que
-- bypassea RLS. Los revoke son necesarios porque las tablas nuevas nacen con
-- permisos por defecto para anon y authenticated.
revoke all on public.plan_notice_log from anon, authenticated;

commit;
