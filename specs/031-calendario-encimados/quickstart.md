# Quickstart: 031 — Calendario de la agenda

## Entorno
- Worktree: `C:\Users\Pastori\wt\tijerapp-calendario` (rama `031-calendario-encimados`).
  `node_modules` es un junction al checkout principal: **no correr `npm install` acá** (escribiría en
  el del checkout de la remasterización).
- Nunca trabajar en `C:\Users\Pastori\OneDrive\Desktop\ProyectG\TijerApp` (cambios sin commitear de
  otra sesión).

## Migración
Correr en el SQL Editor (lo hace Bautista) el archivo `supabase/migrations/<ts>_appointments_sobreturno.sql`
(contenido = `contracts/migracion-sobreturno.sql`). Verificación:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'appointments' and column_name = 'is_sobreturno';

select indexdef from pg_indexes where indexname = 'appointments_unique_active_slot';
-- debe terminar en: ... AND (NOT is_sobreturno)
```

## Tests
```bash
node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-agenda-layout.ts
npm run test:unit
npm run lint
npm run build
```

## Prueba manual (solo `primebarber`)
1. Confirmar en `barbershop_admins` que la cuenta de prueba solo accede a `primebarber`.
2. Cargar en la demo, para un día futuro: un turno 15:00–15:40 y otro 15:30 (encimado); una cadena
   10:00/10:30/10:45/11:20; ocho turnos de 15 min seguidos; un bloqueo 13:00–14:00.
3. Recorrer 360, 390, 768, 1024 y 1440 px: nombres legibles, nada tapado, "+N" con 3 simultáneos.
4. Celular: cambiar de barbero con chip y deslizando; mantener apretado y arrastrar un turno.
5. Tocar un hueco → Sobreturno 15 min → se dibuja con su marca; abrir `/primebarber/reservar` y
   verificar que ese horario no se ofrece.
6. Sobreturno encima de un turno → pide confirmación.
7. Plan vencido (simulado en la demo) → se ve todo, sin crear ni mover.
8. Con "reducir movimiento" activado → sin animaciones.
9. Borrar los turnos de prueba de la demo al terminar.
