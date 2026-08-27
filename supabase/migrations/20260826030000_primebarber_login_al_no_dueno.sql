-- ─────────────────────────────────────────────────────────────────────────────
-- Corrección de datos: el login de empleado estaba sobre el barbero dueño
--
-- En `primebarber` (la demo), Matias Rojas está marcado como `is_owner` y tenía
-- login de empleado. Era el único caso así en todo el sistema. Desde la feature
-- 019 eso ya no se puede crear —Equipo no lo ofrece y el POST lo rechaza— pero
-- el acceso que ya existía seguía vivo.
--
-- Se mueve al barbero que NO es dueño, conservando la misma cuenta: es la que
-- se usa para probar el push, y perderla habría costado rehacer la prueba.
--
-- ─── DOS DETALLES DE CÓMO ESTÁ ESCRITA ──────────────────────────────────────
--   1. **Revoca, no borra.** Es lo que hace la app, y así queda registrado que
--      ese acceso existió entre el 25 y el 26/08.
--   2. **Sin uuids a mano y con guardas.** Busca por barbería y por quién es
--      dueño, y no inserta si ya hay un acceso activo. Correrla de nuevo, o
--      correrla en un entorno donde nada de esto exista, no hace nada.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

with revocado as (
  update barber_staff_access sa
     set revoked_at = now()
    from barbers b
   where b.id = sa.barber_id
     and sa.barbershop_slug = 'primebarber'
     and sa.revoked_at is null
     and b.is_owner
  returning sa.user_id, sa.granted_by
)
insert into barber_staff_access (user_id, barbershop_slug, barber_id, granted_by)
select r.user_id, 'primebarber', b.id, r.granted_by
  from revocado r
  join barbers b
    on b.barbershop_slug = 'primebarber'
   and b.is_owner = false
   and b.is_active
   and b.deleted_at is null
 where not exists (
   select 1
     from barber_staff_access x
    where x.barbershop_slug = 'primebarber'
      and x.barber_id = b.id
      and x.revoked_at is null
 );

commit;
