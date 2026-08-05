# Implementation Plan: Comisiones por barbero

**Branch**: `014-comisiones-barberos`
**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)
**Created**: 2026-08-05
**Status**: Draft

## Architecture Overview

La feature se apoya en algo que ya está hecho: **Reportes ya calcula cuánto produjo cada
barbero en el período**. Lo único que falta es el porcentaje de cada uno y una
multiplicación. Esto no es construir un módulo nuevo, es **terminar una cuenta que quedó a
medias**.

Tres piezas:

1. **Un dato nuevo**: `barbers.commission_percent`, que puede ser `NULL` ("sin
   configurar", distinto de 0%).
2. **Una función pura**: `calculateCommissions(...)` en `src/lib/commissions.ts`, única
   fuente de la cuenta para la tabla, el PDF y el WhatsApp. Ahí vive todo el riesgo, así
   que va cubierta por tests.
3. **La UI**: un campo en la ficha del barbero y una sección en Reportes.

La decisión que ordena el resto es la del redondeo (research R3): **se redondea la comisión
y lo de la barbería sale por resta**. Así la identidad "comisiones + barbería = producción"
se cumple por construcción y no por casualidad — que es lo que evita que el dueño vea
diferencias de pesos que no puede explicarle a su empleado.

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Dónde se calcula | Función pura en `lib/commissions.ts` | Tabla, PDF y WhatsApp con un solo número (R1) |
| "Sin configurar" | `commission_percent numeric(5,2) NULL` | NULL ≠ 0%; evita que el dueño pague de menos (R2) |
| Redondeo | Comisión redondeada, barbería por resta | Las cuentas cierran por construcción (R3) |
| Qué es producción | El criterio de Reportes (confirmed + pending) | Dos números que no cierran en la misma pantalla es peor que ninguno (R4) |
| Dónde se carga | Ficha del barbero, `/admin/barbers` | Es un dato del barbero; el formulario ya existe (R5) |
| Gating | `reportes_por_barbero` (Esencial+) | Ya existe; no hace falta flag nueva (R7) |
| Dependencias nuevas | **Ninguna** | Constitución §5 |

## File-Level Changes

### New Files

- `supabase/migrations/20260805130000_barber_commission.sql` — agrega
  `commission_percent numeric(5,2)` a `barbers`, nullable, con `check` de 0 a 100.
  **Aditiva**: no toca datos existentes, todas las filas quedan en `NULL` = sin configurar,
  que es exactamente el estado real.
- `src/lib/commissions.ts` — `calculateCommissions(produccionPorBarbero)`: devuelve las
  filas con producido, porcentaje, comisión y resto, más los totales. Sin React, sin I/O.
- `scripts/test-commissions.ts` — los casos de abajo (Testing Strategy).

### Modified Files

- `src/lib/supabase.ts` — `commission_percent` en Row/Insert/Update de `barbers`.
  **Ojo**: no olvidar `Relationships: []` si se toca la forma del type — omitirlo tira
  todas las tablas a `never` (pasó al agregar `barbershop_payments`).
- `src/lib/barbers.ts` — sumar la columna a los dos `select` de barberos.
- `src/components/AdminBarbersManager.tsx` — campo "Comisión (%)" en el alta y la edición,
  vacío = sin configurar. Validación 0–100.
- `src/components/admin/AdminReportes.tsx` — sección "Comisiones del período" debajo de
  Producción por barbero, detrás de `hasFeature('reportes_por_barbero')`, con el aviso de
  que aplica el porcentaje vigente (FR-103).
- `src/components/admin/ExportReportPdfButton.tsx` — sumar el detalle al PDF (FR-102).

### Deleted Files

Ninguno.

## Data Model Changes

Una columna:

```sql
alter table public.barbers
  add column if not exists commission_percent numeric(5,2)
  check (commission_percent is null or (commission_percent >= 0 and commission_percent <= 100));
```

`NULL` = sin configurar. `numeric(5,2)` admite medios puntos (47,5%), que aparecen en
arreglos reales. **Requiere que Bautista la corra en el SQL Editor.**

## API Surface

**No aplica.** No hay endpoints nuevos. El porcentaje se guarda por el camino que ya usa la
ficha del barbero (`updateBarber` / `createBarber`, RLS de `barbers`).

## UI / UX

### Ficha del barbero (`/admin/barbers`)

Campo "Comisión (%)" junto a WhatsApp y rol. Vacío = sin configurar, y se muestra así en la
lista — nunca como 0%.

### Reportes — sección "Comisiones del período"

Una fila por barbero con comisión configurada:

| Barbero | Produjo | % | Le corresponde | Queda en la barbería |
|---|---:|---:|---:|---:|
| Santi | $180.000 | 50% | $90.000 | $90.000 |
| Nico | $120.000 | 40% | $48.000 | $72.000 |
| **Total** | **$300.000** | | **$138.000** | **$162.000** |

- Los barberos **sin configurar** se listan aparte, en gris, con un acceso a su ficha. No
  suman al total y no se muestran como 0%.
- Aviso: "Se aplica el porcentaje que tiene cargado hoy cada barbero."
- Botón por fila para mandarle el detalle por WhatsApp (FR-101).

## Testing Strategy

- **Unit tests** (`npm run test:unit`), `scripts/test-commissions.ts` — acá está el riesgo:
  1. Barbero sin comisión (`NULL`) → queda fuera del cálculo y **no** cuenta como 0%.
  2. Comisión 0% configurada → sí entra, con comisión $0. Distinto del caso 1.
  3. **Las cuentas cierran**: comisiones + barbería = producción, con 33%, 47,5% y montos
     que no dividen redondo (el caso que motivó R3).
  4. Comisión 100% → toda la producción al barbero, $0 a la barbería.
  5. Producción 0 → comisión 0, sin división por cero.
  6. Turnos con `service_price` nulo → suman 0, no rompen.
  7. Totales = suma de filas ya redondeadas (no recalculados sobre el total).
  8. Barbería sin ningún barbero con comisión → la sección no tiene nada que mostrar.

- **Build**: `tsc`, `lint`, `build` verdes.
- **Contra datos reales**: correr el cálculo sobre `barber` (2 barberos, 184 turnos) con
  porcentajes de prueba y comprobar a mano que cierra.
- **Manual**: cargar un porcentaje, ver que aparece en Reportes, cambiarlo y ver que se
  actualiza; PDF y WhatsApp.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Las cuentas no cierran por redondeo y el dueño desconfía | Barbería por resta (R3) + caso de test explícito con 33% y 47,5% |
| "Sin configurar" se lee como 0% y el dueño paga de menos | `NULL` + caso de test 1 y 2 + UI que lo lista aparte |
| La columna nueva no guarda por RLS | `barbers` se escribe con la sesión del browser; verificar al implementar (R5) |
| El dueño no entiende que aplica el % vigente | Aviso explícito en la sección (FR-103) |
| Romper el type `Database` | Recordar `Relationships: []` — ya pasó una vez |
| Alcance que se estira a "registrar el pago" | El spec lo marca fuera (Won't Have) |

## Rollback Plan

- Revertir el merge y redeployar. La columna puede quedar: es nullable y nadie más la lee.
- Si se quisiera limpiar: `alter table public.barbers drop column commission_percent;`
- Sin riesgo de datos: la feature **solo lee** turnos, no los modifica.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| 1. Multi-tenant first | ✅ | Por barbero de cada barbería; nada atado a un cliente |
| 2. Mobile-first | ✅ | La tabla colapsa a tarjetas en pantalla chica |
| 3. Estética premium minimal | ✅ | Reusa `card-premium` y los tokens; sin nada nuevo |
| 4. Español rioplatense | ✅ | "Le corresponde", "queda en la barbería" |
| 5. Stack discipline | ✅ | Cero dependencias nuevas |
| 6. No half-finished | ✅ | tsc + lint + tests + build antes de cerrar |
| 7. Branch workflow | ✅ | Rama `014-comisiones-barberos`, merge `--no-ff` |
| 8. Spec-driven | ✅ | spec → research → plan → tasks |

**Sin violaciones.**

## Next Steps

- Run **speckit-tasks** to decompose this plan into a dependency-ordered task list
