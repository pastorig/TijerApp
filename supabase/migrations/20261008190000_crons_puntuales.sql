-- Crons puntuales: que los avisos y las señas corran de verdad cada hora.
-- La corre Bautista en el SQL Editor de Supabase, EN DOS PASOS (ver abajo).
--
-- ── El problema ─────────────────────────────────────────────────────────────
-- Los cinco crons de TijerApp los dispara GitHub Actions con `cron: "N * * * *"`
-- (cada hora). GitHub no lo cumple: el 05/10/2026 corrieron a las 02:07, 09:13
-- y 18:34 UTC y nada más; el 08/10, a las 00:51, 07:10 y 15:25. Con eso:
--   - una seña sin pagar puede tener bloqueado un horario varias horas de más;
--   - el primer día de los pedidos de reseña no salió ninguno.
--
-- ── La salida ───────────────────────────────────────────────────────────────
-- La base de Supabase tiene su propio reloj (pg_cron) y puede llamar a una URL
-- (pg_net). Se programan acá las mismas cinco llamadas, a los mismos minutos.
--
-- Los workflows de GitHub NO se borran: quedan de respaldo. Las cinco rutas
-- son idempotentes (anotan antes de mandar), así que llamarlas de más no
-- repite ningún mail ni cancela nada dos veces.
--
-- El secreto NO va en este archivo ni en la tabla de crons: se guarda cifrado
-- en Supabase Vault y cada llamada lo lee de ahí.

-- ════════════════════════════════════════════════════════════════════════════
-- PASO 1 — Guardar el secreto (una sola vez)
-- ════════════════════════════════════════════════════════════════════════════
-- Reemplazá PEGAR_ACA_EL_CRON_SECRET por el valor de la variable CRON_SECRET de
-- Vercel (Project → Settings → Environment Variables → CRON_SECRET → Production).
-- Si la corrés dos veces da error de nombre duplicado: no pasa nada, ya está.

select vault.create_secret(
  'PEGAR_ACA_EL_CRON_SECRET',
  'tijerapp_cron_secret',
  'Bearer que usan los crons de TijerApp para llamar a /api/cron/*'
);

-- ════════════════════════════════════════════════════════════════════════════
-- PASO 2 — Programar los cinco crons
-- ════════════════════════════════════════════════════════════════════════════
-- Se puede correr las veces que haga falta: `cron.schedule` con el mismo nombre
-- reemplaza el anterior.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Una función en vez de repetir el mismo bloque cinco veces: arma la llamada
-- leyendo el secreto del Vault. Va a `tijerapp.com` sin "www": pg_net no sigue
-- redirecciones y la versión con "www" contesta 308.
create or replace function public.llamar_cron_de_tijerapp(p_ruta text)
returns bigint
language sql
security definer
set search_path = public, extensions, vault
as $$
  select net.http_get(
    url := 'https://tijerapp.com' || p_ruta,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'tijerapp_cron_secret'
      )
    ),
    timeout_milliseconds := 60000
  );
$$;

-- Lee un secreto: no la puede ejecutar nadie que entre por la API.
revoke all on function public.llamar_cron_de_tijerapp(text) from public, anon, authenticated;

-- Los mismos minutos que en GitHub, para que no se pisen entre sí.
select cron.schedule('tijerapp-recordatorios', '5 * * * *',
  $$ select public.llamar_cron_de_tijerapp('/api/cron/reminders'); $$);
select cron.schedule('tijerapp-senas', '10 * * * *',
  $$ select public.llamar_cron_de_tijerapp('/api/cron/deposits'); $$);
select cron.schedule('tijerapp-push-limpieza', '15 * * * *',
  $$ select public.llamar_cron_de_tijerapp('/api/push/cleanup'); $$);
select cron.schedule('tijerapp-cierre', '20 * * * *',
  $$ select public.llamar_cron_de_tijerapp('/api/cron/cierre'); $$);
select cron.schedule('tijerapp-activacion', '25 * * * *',
  $$ select public.llamar_cron_de_tijerapp('/api/cron/activacion'); $$);

-- ════════════════════════════════════════════════════════════════════════════
-- Verificación
-- ════════════════════════════════════════════════════════════════════════════
-- 1) Los cinco programados:
--      select jobname, schedule, active from cron.job where jobname like 'tijerapp-%';
--
-- 2) Probar uno ya, sin esperar a la hora (tiene que devolver un número):
--      select public.llamar_cron_de_tijerapp('/api/cron/deposits');
--    y a los pocos segundos mirar la respuesta (status_code tiene que ser 200;
--    401 = el secreto está mal pegado):
--      select status_code, left(content, 200), created
--      from net._http_response order by created desc limit 3;
--
-- 3) Después de la primera hora, que hayan corrido:
--      select j.jobname, d.status, d.start_time
--      from cron.job_run_details d join cron.job j using (jobid)
--      where j.jobname like 'tijerapp-%' order by d.start_time desc limit 10;
--
-- Para apagarlos:  select cron.unschedule('tijerapp-senas');   (uno por nombre)
