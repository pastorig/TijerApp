# Tasks: Calendario de la agenda — encimados, cortos y sobreturnos

**Feature dir**: `C:\Users\Pastori\wt\tijerapp-calendario\specs\031-calendario-encimados`
**Plan**: [plan.md](plan.md) · **Spec**: [spec.md](spec.md)

Historias (orden de prioridad):
- **US1 (P1)** — Turnos encimados y cortos legibles, sin taparse; pausas/bloqueos dibujados; hora actual. (Escenarios 2–6, 10; FR-002..007, 012..015)
- **US2 (P1)** — Tocar un turno abre su detalle con las acciones de siempre; "+N" abre la lista del grupo. (Escenarios 5–6; FR-004, 006, 007)
- **US3 (P2)** — En el celular, un barbero por pantalla con chips y deslizamiento. (Escenario 1; FR-001)
- **US4 (P2)** — Sobreturno: cargar desde un hueco, dibujarlo distinto, que ocupe el horario, confirmar si pisa. (Escenarios 7–8; FR-008..011)

Tests: sí (unitarios del layout, pedidos en el plan).

## Phase 1: Setup

- [x] T001 Agregar `scripts/test-agenda-layout.ts` (esqueleto con `check()`) y sumarlo a la cadena `test:unit` en `package.json`
- [x] T002 [P] Crear `src/hooks/useMediaQuery.ts` (useSyncExternalStore, `false` en SSR)

## Phase 2: Foundational (bloquea todas las historias)

- [x] T003 Escribir los tests de layout en `scripts/test-agenda-layout.ts`: cadena A10:00-11:00/B10:30-11:30/C10:45-11:15/D11:20-12:00 con mismo ancho por grupo y sin solape lateral; 3 simultáneos → 2 visibles + 1 oculto; ocho turnos de 15 min seguidos sin encimarse ni marcarse encimados; duración real alargada que pisa al siguiente → encimado; sobreturno solo y dentro de grupo; rango estirado por turno fuera de jornada; huecos descontando pausa y bloqueo; `pisaAOtro`
- [x] T004 Implementar `src/lib/agenda-layout.ts` (`layoutDia`, `rangoDelDia`, `huecosLibres`, `franjasNoDisponibles`, `pisaAOtro`, constantes `PX_POR_MIN=2`, `MIN_VISUAL_MIN=14`, `ALTO_COMPACTO_PX=56`, `MAX_CARRILES_VISIBLES=2`) hasta que T003 pase con `node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-agenda-layout.ts`
- [x] T005 [P] Agregar `listTimeBlocksByBarbershopDate({barbershopSlug, blockDate})` en `src/lib/barber-availability.ts` (activos, sin borrar)

## Phase 3: US1 — Encimados y cortos legibles (P1) 🎯 MVP

**Prueba independiente**: con `primebarber`, un día con doble encimado, cadena de 3, ocho cortos y un bloqueo se ve sin solapes ni textos cortados a 1440 px y a 390 px (todavía con scroll horizontal en celular).

- [x] T006 [US1] En `src/components/admin/AgendaCalendarGridView.tsx`: reemplazar `packBarberBlocks` por `layoutDia` con escala fija 2 px/min (regla, `gridHeight`, `top/height` de bloques, slots droppables, línea de "ahora") y usar `actual_duration_minutes ?? service_duration_minutes`
- [x] T007 [US1] En el mismo archivo: rango de la regla con `rangoDelDia` (jornadas ∪ turnos del día)
- [x] T008 [US1] Rediseñar `DraggableAppointmentBlock`: variante completa (barra de estado 3 px, nombre 14 px, servicio y horario 12 px) y compacta (`HH:MM · Nombre`), estado encimado (borde de aviso + ícono `TriangleAlert` con `aria-label`), sin brillo radial ni línea de vidrio; radio 6 px
- [x] T009 [US1] Ficha "+N" en el carril visible 2 cuando el grupo tiene más de 2 carriles (botón 44 px, `aria-label="N turnos más"`); por ahora sin acción (la cablea US2)
- [x] T010 [P] [US1] Crear `src/components/admin/agenda/UnavailableBand.tsx` (rayado sutil + etiqueta 12 px; tipos pausa/bloqueo/fuera-de-horario) y dibujarlo por columna desde `franjasNoDisponibles` con z debajo de los bloques
- [x] T011 [US1] En `src/components/AdminAppointments.tsx`: cargar bloqueos del día con T005 (recargar al cambiar fecha y al crear un bloqueo rápido) y pasar `timeBlocksByBarber`; pasar `weeklySchedules` con pausa a la grilla
- [x] T012 [US1] En `src/components/AdminAppointments.tsx`: mostrar la grilla en modo calendario aunque el día tenga cero turnos (el toggle Lista/Calendario aparece igual en el filtro "día")
- [x] T013 [US1] Scroll inicial a la línea de "ahora" cuando el día es hoy (una vez por fecha) en `AgendaCalendarGridView.tsx`
- [x] T014 [US1] Verificar arrastre de escritorio y celular (delay 200 ms) con la nueva escala: el drop cae en el slot correcto y `onMoveComplete` sigue igual

## Phase 4: US2 — Detalle al tocar y lista "+N" (P1)

**Prueba independiente**: tocar un turno abre su tarjeta con confirmar/WhatsApp/cancelar/duración real funcionando; tocar "+N" lista el grupo y abre cada uno.

- [x] T015 [P] [US2] Crear `src/components/admin/agenda/AppointmentDetailSheet.tsx` (Framer Motion: hoja inferior < 768 px, panel lateral ≥ 768 px; foco atrapado, Escape, restaura foco; `useReducedMotion`)
- [x] T016 [P] [US2] Crear `src/components/admin/agenda/OverlapGroupList.tsx` (lista del grupo, cada ítem 44 px abre detalle)
- [x] T017 [US2] En `AgendaCalendarGridView.tsx`: `onOpenAppointment` al tocar/click en un bloque (sin disparar en fin de arrastre) y cablear la ficha "+N" a `OverlapGroupList`
- [x] T018 [US2] En `src/components/AdminAppointments.tsx`: estado del turno abierto y render de la tarjeta existente de la Lista (mismas props y handlers que en la lista) dentro de `AppointmentDetailSheet`; badges "Encimado"/"Sobreturno"

## Phase 5: US3 — Un barbero por pantalla en el celular (P2)

**Prueba independiente**: a 390 px con 3 barberos se ve uno a ancho completo; chips y deslizamiento cambian de barbero; arrastrar un turno sigue funcionando; el barbero elegido se recuerda al volver.

- [x] T019 [P] [US3] Crear `src/components/admin/agenda/AgendaBarberSwitcher.tsx` (`role=tablist`, chips 44 px con nombre + cantidad + marca de franco, flechas de teclado, scroll horizontal propio)
- [x] T020 [US3] En `AgendaCalendarGridView.tsx`: con `useMediaQuery("(max-width: 767px)")` mostrar una sola columna a ancho completo, el switcher arriba (oculto con 1 barbero) y transición de cambio con Framer Motion (180 ms, sin animación con reducir movimiento)
- [x] T021 [US3] Deslizamiento horizontal para cambiar de barbero: `|dx| > 60`, `|dx| > 1.5·|dy|`, ignorado mientras hay arrastre activo de dnd-kit
- [x] T022 [US3] Recordar el barbero visible en `sessionStorage` (`tijerapp:agenda:barbero:<slug>`, try/catch) y elegir por defecto el que tenga el próximo turno

## Phase 6: US4 — Sobreturno (P2)

**Prueba independiente**: desde un hueco se carga un sobreturno de 15 min en ≤ 4 toques; se dibuja con su marca; `/primebarber/reservar` no ofrece ese horario; encima de otro turno pide confirmación; a la misma hora exacta de otro turno se guarda.

- [x] T023 [US4] Crear `supabase/migrations/20261003120000_appointments_sobreturno.sql` desde `contracts/migracion-sobreturno.sql` (la corre Bautista)
- [x] T024 [P] [US4] `is_sobreturno?: boolean` en `AppointmentInsert` de `src/lib/supabase.ts`; sumarlo a `APPOINTMENT_SELECT` y al select de `updateAppointmentActualDuration` en `src/lib/appointments.ts`
- [x] T025 [US4] En `src/components/admin/ManualAppointmentModal.tsx`: props `defaultTime`, `mode`, `existingAppointments`; en modo sobreturno: título "Sobreturno", duración 10/15/20/30 (default 15), servicio opcional ("Sobreturno", precio editable), guarda `is_sobreturno: true` y `service_duration_minutes` elegido; confirmación con `ConfirmDialog` si `pisaAOtro`
- [x] T026 [US4] En `AgendaCalendarGridView.tsx`: tocar un hueco libre abre mini menú "Turno" / "Sobreturno" → `onCreateAt({barberId, time, mode})`; oculto en solo lectura y días pasados
- [x] T027 [US4] En `src/components/AdminAppointments.tsx`: abrir `ManualAppointmentModal` con barbero, fecha, hora y modo desde `onCreateAt`
- [x] T028 [US4] Dibujo del sobreturno en el bloque (borde punteado dorado + ícono `Zap`; franja angosta a la derecha cuando está en un grupo, según `layoutDia`)

## Phase 7: Polish & cross-cutting

- [x] T029 Revisar contraste AA de los estados nuevos, foco visible, textos ≥ 12 px y radios ≤ 8 px
- [x] T030 `npm run lint`, `npm run build`, `npm run test:unit` en el worktree
- [~] T031 QA con `primebarber` según `quickstart.md` (360/390/768/1024/1440, solo lectura, reducir movimiento) y capturas antes/después para Bautista; borrar los turnos de prueba
- [ ] T032 Rebase sobre `main`, merge `--no-ff` a `main` y push (tras migración corrida y QA verde)

## Dependencies

```
Setup (T001-T002) → Foundational (T003-T005) → US1 (T006-T014)
US1 → US2 (necesita los bloques nuevos)
US1 → US3 (necesita la grilla nueva)
US1 → US4 (T026/T028 tocan la grilla); T023-T025 pueden ir en paralelo con US2/US3
US2, US3, US4 → Polish
```

## Parallel execution
- Setup: T001 ‖ T002.
- Foundational: T005 ‖ (T003 → T004).
- US1: T010 ‖ T006-T009 (archivo distinto).
- US2: T015 ‖ T016, luego T017 → T018.
- US3: T019 ‖ T021 lógica, luego T020.
- US4: T023 ‖ T024 ‖ T025 mientras se hace US2/US3.

## Implementation strategy
- **MVP = US1 + US2**: resuelve el reclamo (encimados legibles, nada tapado, detalle al tocar). Se puede mergear solo si Bautista lo quiere antes.
- Después US3 (celular) y US4 (sobreturno + migración).
- Cada fase termina con lint + tests y un commit en la rama.
