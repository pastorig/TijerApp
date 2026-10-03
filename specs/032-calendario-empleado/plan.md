# Plan: El calendario de la 031 en la agenda del empleado

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-10-03 · **Sin migraciones.**

## Idea central

No se escribe un segundo calendario. `AgendaCalendarGridView` (031) se vuelve
parametrizable con tres props opcionales cuyo valor por defecto es exactamente lo
que el dueño tiene hoy; el empleado lo monta con UN barbero (el suyo) y con las
acciones recortadas a sus permisos. Así FR-004 y SC-004 se cumplen por
construcción: el mismo código dibuja las dos agendas.

## Cambios

### 1. `src/components/admin/AgendaCalendarGridView.tsx` (compartido)

- `AgendaCreateMode` suma `"bloquear"`.
- Props nuevas, todas opcionales:
  - `createOptions?: AgendaCreateMode[]` — default `["turno", "sobreturno"]`.
    Vacío = los huecos se ven pero no son botones y los slots no se pueden tocar.
  - `allowDrag?: boolean` — default `true`. En `false` los turnos no se arrastran
    y el texto de ayuda no habla de arrastrar.
  - `readOnly?: boolean` — si viene, manda sobre `useIsReadOnly()` (el empleado
    no está dentro del `PlanContext` del admin).
- Los tipos de `appointments` y `barbers` pasan a ser el mínimo que el componente
  lee (`AgendaTurno`, `AgendaBarbero`). `AppointmentRow` y `BarberRow` siguen
  siendo asignables: `AdminAppointments` no cambia.

### 2. `GET /api/staff/agenda`

Suma al payload, siempre del barbero del token:

- en cada turno: `actual_duration_minutes`, `is_sobreturno`;
- `barberId`;
- `horario`: `{ semanal: filas de barber_weekly_schedules, excepcion: fila de
  barber_day_overrides de esa fecha | null, barberia: { start, end,
  intervalMinutes } }` — las MISMAS consultas que `slot-availability.ts`, para que
  la pantalla resuelva la jornada con `getBarberDaySchedule`, igual que el dueño;
- `soloLectura`: `getBarbershopPlan(slug).isReadOnly`.

El precio sigue pasando por `recortarTurno` (FR-008): no se toca.

### 3. `POST /api/staff/appointment`

Acepta `sobreturno: true` + `duracion` (10, 15, 20 o 30; default 15). En ese caso
`serviceId` es opcional (sin servicio: "Sobreturno", precio 0), se guarda
`is_sobreturno: true` y la duración elegida. La validación vive en una función
pura (`src/lib/staff-sobreturno.ts`) con tests. El permiso es el mismo
`cargarTurno`; `barber_id`, precio y nombre del servicio siguen saliendo del
servidor.

### 4. Modales del empleado

- `StaffNewAppointmentModal`: props `horaInicial?`, `modo?: "turno" |
  "sobreturno"`, `turnosDelDia?` (para avisar "se va a encimar con el turno de las
  HH:MM" y pedir confirmación, FR-007).
- `StaffBlockTimeModal`: prop `desdeInicial?`.

### 5. `StaffAgenda.tsx`

- Selector Lista / Calendario, recordado en `localStorage`
  (`tijerapp:mi-agenda:vista`), default Lista.
- En Calendario: el grid con un barbero, `allowDrag={false}`,
  `createOptions` según `opcionesDeHueco(permisos)`, `readOnly={soloLectura}`.
- Tocar un turno abre `AgendaSheet` con el MISMO `renderTurno` de la Lista
  (FR-005): mismas acciones, mismos permisos.
- `opcionesDeHueco` vive en `src/lib/staff-permissions.ts`, con tests.

## Riesgos

- **Regresión en la agenda del dueño.** Mitigación: defaults idénticos + la
  única edición del componente compartido es aditiva; tsc + tests de layout +
  build; revisión del diff del grid línea por línea.
- **Reloj.** El grid usa la hora del navegador; `StaffAgenda` usa hora argentina
  para "hoy". Un empleado con el celular en otra zona vería la línea de "ahora"
  corrida: es el mismo comportamiento que ya tiene el dueño; no se cambia acá.

## Verificación

- `tsc`, `lint`, `test:unit` (con los tests nuevos), `build`.
- Página local con datos fijos para el empleado (el fixture de Codex
  `scripts/fixtures/admin-shell/staff.tsx`) a 390 y 1440 px.
- QA logueada (Esteban en `primebarber`): la hace Bautista en la preview.
