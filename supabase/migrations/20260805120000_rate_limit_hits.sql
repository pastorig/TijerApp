-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting para los endpoints públicos que escriben
--
-- ─── EL PROBLEMA ─────────────────────────────────────────────────────────────
-- `POST /api/registro` es abierto y su única defensa es un honeypot. Un bot que
-- no caiga en el honeypot puede crear barberías en masa, y cada registro
-- provisiona ~30 filas (barbería, admin, barbero, servicios, horarios,
-- suscripción) más un usuario en Auth. Ensucia la base, el panel del owner y
-- las métricas. Lo mismo, en menor escala, con contacto y lista de espera.
--
-- ─── POR QUÉ EN LA BASE Y NO EN MEMORIA ──────────────────────────────────────
-- Un contador en memoria del proceso no sirve acá: en Vercel cada request puede
-- caer en una instancia distinta y las instancias se reciclan. Contaría mal y
-- daría una sensación falsa de protección. La base es el único lugar compartido
-- que ya tenemos.
--
-- ─── PRIVACIDAD ──────────────────────────────────────────────────────────────
-- No se guarda la IP: se guarda un hash con sal del lado del server
-- (`RATE_LIMIT_SALT`). Alcanza para contar cuántas veces vino el mismo origen y
-- no permite reconstruir la IP.
--
-- RLS prendida y sin políticas: solo `service_role` (los endpoints) la toca.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.rate_limit_hits (
  id bigserial primary key,
  -- Qué se está limitando: 'registro', 'contacto', 'waitlist'…
  bucket text not null,
  -- Hash con sal del origen (IP). Nunca la IP en claro.
  identifier text not null,
  created_at timestamptz not null default now()
);

-- El índice que usa la consulta de conteo: por bucket + origen, más recientes
-- primero.
create index if not exists rate_limit_hits_lookup_idx
  on public.rate_limit_hits (bucket, identifier, created_at desc);

-- Para el borrado de registros viejos.
create index if not exists rate_limit_hits_created_at_idx
  on public.rate_limit_hits (created_at);

alter table public.rate_limit_hits enable row level security;

-- Sin políticas a propósito: nadie con anon/authenticated puede leer ni
-- escribir. `service_role` bypassea RLS.
revoke all on public.rate_limit_hits from anon, authenticated;
revoke all on sequence public.rate_limit_hits_id_seq from anon, authenticated;

commit;
