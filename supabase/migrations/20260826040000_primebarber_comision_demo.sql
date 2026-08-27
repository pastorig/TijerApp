-- ─────────────────────────────────────────────────────────────────────────────
-- Datos de la demo: comisión al barbero que tiene el login de empleado
--
-- Sin comisión configurada, la pantalla de Ganancias dice "tu comisión todavía
-- no está configurada" en vez de un número — que está bien, pero no deja
-- probar la pantalla. Se le carga 50%, el reparto clásico de una barbería
-- argentina.
--
-- Solo toca al barbero de `primebarber` que NO es dueño y que tiene un acceso
-- activo, y **solo si todavía no tiene comisión**: no le pisa el porcentaje a
-- nadie que ya lo tenga cargado. Correrla de nuevo no hace nada.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

update barbers b
   set commission_percent = 50
 where b.barbershop_slug = 'primebarber'
   and b.is_owner = false
   and b.deleted_at is null
   and b.commission_percent is null
   and exists (
     select 1
       from barber_staff_access sa
      where sa.barber_id = b.id
        and sa.revoked_at is null
   );

commit;
