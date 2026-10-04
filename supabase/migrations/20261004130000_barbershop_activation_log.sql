-- barbershop_activation_log: qué mails de activación ya se le mandaron a cada
-- barbería recién registrada (feature 034).
-- La corre Bautista en el SQL Editor de Supabase.
--
-- La serie es: bienvenida (al registrarse) y, mientras la barbería tenga cero
-- turnos, un mail el día 1, otro el día 3 y otro el día 7; más un aviso al
-- fundador el día 3 para que le escriba él.
--
-- El código NO pregunta "¿ya lo mandé?" y después manda: primero inserta el
-- renglón y recién si entra manda el mail. El índice único (barbería, tipo)
-- hace imposible el doble envío aunque dos corridas del cron se pisen. Y sin
-- esta tabla el insert falla y no sale ningún mail — mejor ninguno que uno por
-- hora.
--
-- La serie solo corre para barberías que tienen el renglón 'bienvenida', que
-- escribe únicamente el registro. Por eso NO hace falta cargar nada para las
-- barberías que ya existen: quedan afuera solas.

begin;

create table if not exists public.barbershop_activation_log (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null references public.barbershops(slug) on delete cascade,
  kind text not null check (
    kind in ('bienvenida', 'dia_1', 'dia_3', 'dia_7', 'aviso_fundador')
  ),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text null,
  sent_at timestamptz not null default now()
);

comment on table public.barbershop_activation_log is
  'Mails de activación enviados a barberías recién registradas. Una fila enviada por (barbería, tipo).';

-- Solo cuenta lo enviado: un intento fallido no bloquea el reintento.
create unique index if not exists barbershop_activation_log_unico
  on public.barbershop_activation_log (barbershop_slug, kind)
  where status = 'sent';

alter table public.barbershop_activation_log enable row level security;

-- Sin políticas a propósito: solo la toca el servidor con service_role, que
-- bypassea RLS. Los revoke hacen falta porque las tablas nuevas nacen con
-- permisos por defecto para anon y authenticated.
revoke all on public.barbershop_activation_log from anon, authenticated;

commit;

-- Verificación (tiene que dar 0 filas, sin error):
-- select count(*) from public.barbershop_activation_log;
