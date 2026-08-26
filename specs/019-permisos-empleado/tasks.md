# Tasks: El dueño elige qué ve y qué toca cada empleado

**Branch**: `019-permisos-empleado`
Orden por dependencia. `[P]` = paralelizable con la anterior.

## Fase 1 — Una sola fuente de verdad

- [x] **T001** `src/lib/staff-permissions.ts` (puro): los cuatro permisos, sus
      etiquetas en castellano, el default (todo en `true`) y
      `normalizarPermisos()` para una fila que viene de la base. Es lo que
      evita escribir la lista dos veces.
- [x] **T002** [P] Tests del normalizador: fila vieja sin columnas → todo
      permitido; `false` explícito se respeta; `null` se trata como permitido.

## Fase 2 — La base

- [x] **T003** Migración aditiva en `barber_staff_access`: `can_see_earnings`,
      `can_confirm`, `can_cancel`, `can_contact_client`, todas
      `boolean not null default true`.
- [x] **T004** Aplicarla (Claude, por MCP de Supabase) y verificar que las
      filas que ya existen quedaron en `true`.

## Fase 3 — El servidor manda

- [x] **T005** `resolveStaffAccess` devuelve los permisos junto con el barbero.
- [x] **T006** `/api/staff/agenda`: sin "ver lo que gana" no viaja
      `service_price` ni `comisionDelDia`; sin "contactar" no viaja
      `customer_phone`. **Se borran del payload**, no se ocultan en la UI.
      Además devuelve los permisos, para que la pantalla sepa qué dibujar.
- [x] **T007** `/api/staff/earnings`: 403 sin el permiso.
- [x] **T008** `/api/staff/appointment-status`: 403 si la acción pedida no está
      permitida. El chequeo va **antes** del update.
- [x] **T009** [P] Tests de la decisión de qué se recorta del payload.

## Fase 4 — Lo que ve el empleado

- [x] **T010** `StaffAgenda`: los botones y los precios salen de los permisos
      que devuelve el endpoint.
- [x] **T011** `StaffShell`: la pestaña Ganancias solo si corresponde.
- [x] **T012** `/mi-agenda/ganancias` sin permiso: cartel de "no habilitado",
      no una pantalla vacía ni un error.

## Fase 5 — Lo que toca el dueño

- [x] **T013** `PATCH /api/admin/staff-access`: cambiar permisos de un empleado.
      Solo admin de esa barbería.
- [x] **T014** `StaffAccessSection`: los cuatro tildes en la fila del empleado,
      con el sistema de diseño del panel.
- [x] **T014b** El barbero marcado como dueño (`barbers.is_owner`) no se puede
      invitar como empleado: no se ofrece en Equipo y el POST lo rechaza.
      Salió de una observación de Bautista — en `primebarber`, Matias Rojas
      es `is_owner` y era el único barbero del sistema con login de empleado.

## Fase 6 — Cierre

- [x] **T015** `tsc` + `lint` + `test:unit` + `build` verdes.
- [x] **T016** QA headless de las combinaciones que importan: todo prendido,
      todo apagado, y solo sin ganancias.
- [ ] **T017** Merge a `main` + push y verificar en prod.
