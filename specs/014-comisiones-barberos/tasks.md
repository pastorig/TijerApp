# Tasks: Comisiones por barbero

**Branch**: `014-comisiones-barberos`
**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) · **Plan**: [plan.md](./plan.md)
**Created**: 2026-08-05

## Overview

Reportes ya calcula la producción por barbero. Falta el porcentaje y la multiplicación.

**Tests**: sí, y son el centro. La cuenta es donde vive el riesgo — sobre todo que
comisiones + barbería cierre exacto, y que "sin configurar" no se lea como 0%.

**Lleva migración**: una columna nullable en `barbers`.

| Historia | Prioridad | Alcance |
|---|---|---|
| US1 — Cargo el porcentaje de cada barbero | P1 (MVP) | Columna + campo en la ficha |
| US2 — Veo cuánto le debo a cada uno | P1 (MVP) | Sección en Reportes |
| US3 — Se lo mando | P2 | WhatsApp + PDF |

---

## Phase 1: Setup

- [x] T001 Confirmar rama `014-comisiones-barberos` y línea base verde (`tsc`, `lint`, `test:unit`, `build`)

---

## Phase 2: Foundational

- [x] T002 Crear `supabase/migrations/20260805130000_barber_commission.sql`: `commission_percent numeric(5,2)` nullable en `barbers`, con `check` 0–100. Aditiva
- [x] T003 Agregar `commission_percent` a Row/Insert/Update de `barbers` en `src/lib/supabase.ts`. **No omitir `Relationships: []`** si se toca la forma del type
- [x] T004 Sumar `commission_percent` a los dos `select` de `src/lib/barbers.ts`
- [x] T005 Crear `src/lib/commissions.ts` con `calculateCommissions()`: filas con producido, porcentaje, comisión y resto + totales. **Comisión redondeada, barbería por resta.** Función pura
- [x] T006 Crear `scripts/test-commissions.ts` con los 8 casos del plan (sin configurar ≠ 0%, cuentas que cierran con 33% y 47,5%, 100%, producción 0, precio nulo, totales por suma de filas)
- [x] T007 Sumar `scripts/test-commissions.ts` a `test:unit` en `package.json` y dejarlo verde

**Checkpoint**: la cuenta está probada. Nada visible todavía.

---

## Phase 3: US1 — Cargo el porcentaje (P1)

- [x] T008 [US1] Campo "Comisión (%)" en el alta y la edición de `src/components/AdminBarbersManager.tsx`. Vacío = sin configurar. Validación 0–100
- [ ] T009 [US1] En la lista de barberos, mostrar el porcentaje o "sin configurar" — nunca 0% cuando es `NULL`
- [ ] T010 [US1] Verificar que el guardado funciona por el camino actual (RLS de `barbers` con la sesión del browser, ver research R5)

---

## Phase 4: US2 — Veo cuánto le debo (P1)

- [x] T011 [US2] Sección "Comisiones del período" en `src/components/admin/AdminReportes.tsx`, debajo de Producción por barbero, detrás de `hasFeature('reportes_por_barbero')`
- [x] T012 [US2] Fila por barbero: produjo, %, le corresponde, queda en la barbería + fila de totales
- [x] T013 [US2] Los barberos sin configurar van aparte, en gris, sin sumar al total, con acceso a su ficha
- [x] T014 [US2] Aviso de que se aplica el porcentaje vigente (FR-103)
- [x] T015 [US2] Verificar el cálculo contra datos reales de `barber` con porcentajes de prueba

---

## Phase 5: US3 — Se lo mando (P2)

- [ ] T016 [US3] Botón por fila para mandar el detalle por WhatsApp, reusando el helper de `src/lib/whatsapp.ts`
- [ ] T017 [US3] Sumar el detalle de comisiones al PDF de `ExportReportPdfButton.tsx`

---

## Phase 6: Polish

- [ ] T018 Verificar en pantalla de celular (la tabla tiene que colapsar)
- [x] T019 `tsc`, `lint`, `test:unit`, `build` verdes
- [x] T020 Commit

## Dependencies

```
T001 → T002..T007 (foundational) → T008..T010 (US1) → T011..T015 (US2) → T016..T017 (US3) → T018..T020
```

T005 bloquea T006 y T011. T003 bloquea T004 y T008.

## Implementation Strategy

**MVP = Phases 1–4.** Con eso el dueño carga porcentajes y ve cuánto le debe a cada uno,
que es el 90% del valor. US3 es el remate.
