# Tasks: La pantalla del empleado, con el sistema de diseño del panel

**Branch**: `018-empleado-design-system`
Orden por dependencia. `[P]` = paralelizable con la anterior.

## Fase 1 — Compartir el calendario

- [x] **T001** Mover `AgendaCalendar.tsx` y `date-utils.ts` de
      `src/components/admin/` a `src/components/calendar/`.
- [x] **T002** Dejar `src/components/admin/date-utils.ts` re-exportando, para
      no tocar los ~15 archivos del panel que lo importan.
- [x] **T003** `tsc --noEmit` verde antes de seguir. Si el movimiento rompió
      algo, se ve acá y no tres pasos después.
- [x] **T004** Prop opcional `todayYmd` en `AgendaCalendar` (default: el de
      hoy del dispositivo, o sea el comportamiento actual).

## Fase 2 — Los puntos de los días

- [x] **T005** `GET /api/staff/agenda-counts?bs=&from=&to=`: conteo por día de
      los turnos del empleado. Barbero desde el token. Sin cancelados.
- [x] **T006** [P] Helper puro `contarPorDia` + test unitario (cancelados
      fuera, días sin turnos ausentes, rango vacío).

## Fase 3 — El marco

- [x] **T007** `StaffShell`: barra sticky h-14 con ícono dorado + nombre de la
      sección (igual que `AdminTopBar`) y pestañas con borde inferior (igual
      que `AdminSubtabs`). Ancho y padding del contenido como el panel.
- [x] **T008** La pantalla de "no tenés acceso", con `Card` + `Button`.

## Fase 4 — Las pantallas

- [x] **T009** `StaffAgenda`: el calendario compartido reemplaza la tira de 7
      días fijos; carga los conteos del rango visible.
- [x] **T010** `StaffAgenda`: resumen del día con `MetricCard`; chips con
      `Badge`; acciones del turno con `Button`.
- [x] **T011** `StaffEarnings`: navegación de meses y tarjetas con `Button` y
      `MetricCard`.
- [x] **T012** `StaffPassword`: `Field` + `Input` + `Button`.

## Fase 5 — Cierre

- [x] **T013** Barrido: `grep` de `min-h-9|min-h-10|min-h-11` y de
      `bg-gold-grad` dentro de `src/components/staff/` — no debe quedar
      ninguno escrito a mano.
- [x] **T014** `tsc` + `lint` + `test:unit` + `build` verdes.
- [x] **T015** QA headless a 390 / 768 / 1440 px (a 320 no: el headless de
      Windows recorta por debajo de 500 px).
- [ ] **T016** Merge a `main` + push (deploy autónomo) y verificar en prod.
