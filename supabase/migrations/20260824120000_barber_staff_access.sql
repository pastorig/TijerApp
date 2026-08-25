-- ─────────────────────────────────────────────────────────────────────────────
-- Cuentas para empleados: acceso de un barbero a SU agenda
--
-- ─── EL PROBLEMA ─────────────────────────────────────────────────────────────
-- Hoy cada barbería tiene UNA sola cuenta. Verificado el 24/08/2026: las 7
-- barberías tienen exactamente un admin, incluida la de Santi, que tiene 5
-- barberos cargados. O sea que el empleado que usa la app entra con la
-- contraseña del dueño, y desde ahí ve la facturación, la lista completa de
-- clientes y la configuración de cobros — y puede cambiarlas.
--
-- ─── POR QUÉ ESTO **NO** VA EN `barbershop_admins` ───────────────────────────
-- Es la decisión de seguridad de toda la feature.
--
-- Toda la protección de la base cuelga de la función
-- `current_user_has_barbershop_access()`, que consulta EXACTAMENTE la tabla
-- `barbershop_admins`. Un empleado que no está ahí no pasa ese chequeo, así que
-- no puede leer appointments, clientes ni nada por el cliente de Supabase —
-- sin que escribamos una sola política nueva.
--
-- Su información llega únicamente por las rutas de servidor de `/mi-agenda`,
-- ya filtrada por su barbero. El default es "no ve nada", y cada cosa que ve
-- es una decisión explícita.
--
-- ⚠️ MOVER UNA FILA DE ACÁ A `barbershop_admins` LE DA ACCESO TOTAL A LA
--    BARBERÍA. No es un atajo para "arreglar" un permiso que falta.
--
-- ─── OJO CON LOS TIPOS ───────────────────────────────────────────────────────
-- `barbers.id` es uuid, pero `appointments.barber_id` es TEXT. Al cruzarlos hay
-- que comparar el uuid como texto. Si se olvida, no falla: devuelve cero
-- turnos, que es peor que un error.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.barber_staff_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barbershop_slug text not null references public.barbershops(slug),
  barber_id uuid not null references public.barbers(id),
  -- Qué dueño dio el acceso: si mañana hay que revisar quién habilitó a quién.
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  -- null = activo. Revocar NO borra la fila ni toca los turnos: el empleado se
  -- va y la barbería conserva su historial completo.
  revoked_at timestamptz null
);

comment on table public.barber_staff_access is
  'Acceso de un empleado a la agenda de UN barbero. NO es un admin: a propósito no está en barbershop_admins, que es la tabla que da acceso total vía RLS.';

-- Un barbero, un acceso activo. Dos personas manejando la misma agenda no es un
-- caso que exista en una barbería.
create unique index if not exists barber_staff_access_barbero_activo
  on public.barber_staff_access (barbershop_slug, barber_id)
  where revoked_at is null;

-- Resolver "quién es este usuario" en cada request.
create index if not exists barber_staff_access_lookup
  on public.barber_staff_access (user_id, barbershop_slug)
  where revoked_at is null;

alter table public.barber_staff_access enable row level security;

-- El empleado puede leer SU propia fila y nada más: alcanza para que la app
-- sepa quién es. Escribir es solo del service_role, desde las rutas del dueño.
drop policy if exists barber_staff_access_lee_lo_suyo on public.barber_staff_access;
create policy barber_staff_access_lee_lo_suyo
  on public.barber_staff_access
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.barber_staff_access from anon;

commit;
