# Tasks: Excepción de horario por rango de días

**Branch**: `030-excepcion-horario-rango`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Created**: 2026-09-06
**Status**: Ready

## Conventions

- Cada tarea es **atómica** (1 archivo o 1 unidad lógica de cambio).
- **[BLOCKING]** tiene que terminar antes de que arranque cualquier tarea que dependa.
- **[P]** puede ir en paralelo con sus pares del mismo nivel.
- Cada tarea tiene **criterios de aceptación** explícitos.

## Dependency Graph

```
T001 [BLOCKING]                          migración
  ↓
T002 [BLOCKING]  →  T003                 resolverJornadaDelDia + su test
  ↓
T004 [BLOCKING]                          enchufarla en el motor  ← acá se arregla la pausa
  ↓
T005 [P]  T006 [P]                       selects del servidor · tipos
  ↓
T007  →  T008                            upsert en lote + expansión del rango, y su test
  ↓
T009 [BLOCKING]                          la pantalla
  ↓
T010 [P]  T011 [P]                       marca en la agenda · "extender cierre" explícito
  ↓
T012  →  T013                            lint+build · smoke contra la demo
```

**El orden de T001→T004 no es negociable.** La pantalla multiplica el uso de las excepciones; soltarla antes del arreglo de la pausa convierte un bug raro en uno cotidiano.

## Tasks

### Phase 1: Base de datos [BLOCKING]

#### T001 [BLOCKING]: Migración — pausa y nota en las excepciones

- **Files**: `supabase/migrations/20260906120000_excepcion_horario_pausa_y_nota.sql`
- **Description**: Agrega `hereda_pausa boolean not null default true`, `break_start time`, `break_end time` y `nota text` a `barber_day_overrides`, más los dos checks: la pausa va completa o no va, y cae adentro de la jornada. El `default true` es lo que arregla las 16 filas que ya están cargadas, sin backfill.
- **Acceptance criteria**:
  - [ ] Las cuatro columnas existen y la migración es re-ejecutable (`if not exists`)
  - [ ] Check `barber_day_overrides_pausa_completa`: rechaza media pausa
  - [ ] Check `barber_day_overrides_pausa_dentro_de_jornada`: rechaza pausa fuera del horario
  - [ ] Las filas existentes quedan con `hereda_pausa = true`
  - [ ] Sin cambios de RLS ni de índices
- **Dependencies**: Ninguna

### Phase 2: La jornada del día [BLOCKING]

#### T002 [BLOCKING]: `resolverJornadaDelDia()` y `turnosFueraDeJornada()`

- **Files**: `src/lib/jornada-del-dia.ts`
- **Description**: Las dos funciones puras del contrato — sin Supabase, sin React, sin `new Date()`. Devuelven `{ trabaja, inicio, fin, pausa, origen }` aplicando la precedencia: excepción → regla semanal → horario de la barbería, con la pausa heredada salvo que la excepción defina la suya.
- **Acceptance criteria**:
  - [ ] Firma igual a [contracts/jornada-del-dia.md](./contracts/jornada-del-dia.md)
  - [ ] No importa nada de Supabase, React ni el reloj
  - [ ] `origen` dice quién decidió
  - [ ] `turnosFueraDeJornada` cuenta un turno que empieza adentro y termina afuera como afuera, igual que la grilla
- **Dependencies**: Ninguna (es pura; se puede escribir junto con T001)

#### T003: Test de la precedencia

- **Files**: `scripts/test-jornada-del-dia.ts`, `package.json`
- **Description**: Caso por caso de las cinco reglas del contrato. El que más importa: **con `hereda_pausa = true` la pausa de la regla semanal sobrevive** — es el bug que ya pegó dos veces en producción.
- **Acceptance criteria**:
  - [ ] Excepción pisa la regla semanal; sin excepción rige la regla; sin regla rige el horario de la barbería
  - [ ] `hereda_pausa = true` → la pausa semanal se mantiene
  - [ ] `hereda_pausa = false` con horas → pausa propia
  - [ ] `hereda_pausa = false` con nulls → ese día no hay pausa
  - [ ] `is_working = false` cierra el día aunque haya horario cargado
  - [ ] El test corre dentro de `npm run test:unit`
- **Dependencies**: T002

### Phase 3: Enchufarla en el motor [BLOCKING]

#### T004 [BLOCKING]: `buildAvailabilitySlots` usa la función nueva

- **Files**: `src/lib/availability.ts`
- **Description**: Reemplaza el bloque que hoy resuelve el día inline por una llamada a `resolverJornadaDelDia()`. **Acá se arregla la pausa**: hoy fuerza `breakStart/breakEnd = null` cuando hay excepción, con un comentario que lo llama "caso edge raro" — no lo es, 5 barberos en producción tienen pausa. Es extracción pura: mismas entradas, mismas salidas para todo lo que no sea el caso de la pausa.
- **Acceptance criteria**:
  - [ ] `buildAvailabilitySlots` ya no decide horarios de jornada por su cuenta
  - [ ] **Toda la suite queda en verde antes de seguir** (incluido `test-hora-argentina.ts`)
  - [ ] Un barbero con pausa y excepción ya no ofrece turnos en su pausa
  - [ ] El comentario viejo del "caso edge raro" se va, con la explicación de por qué era falso
- **Dependencies**: T002, T003

#### T005 [P]: Pedir las columnas nuevas donde se leen las excepciones

- **Files**: `src/lib/server/slot-availability.ts`, `src/lib/barber-availability.ts`
- **Description**: Los `select` de `barber_day_overrides` tienen que traer `hereda_pausa`, `break_start` y `break_end`. Son **tres** los lugares que leen overrides; hay que revisarlos todos.
- **Acceptance criteria**:
  - [ ] Los tres lugares piden las columnas nuevas
  - [ ] La disponibilidad del servidor y la del navegador dan lo mismo para una fecha con excepción y pausa
- **Dependencies**: T004
- **Ojo**: una columna que no se pide llega `undefined` y **apaga la feature en silencio**, sin error ni log. Es un modo de falla que ya nos pasó.

#### T006 [P]: Tipos de la fila

- **Files**: `src/lib/supabase.ts`
- **Description**: `BarberDayOverrideRow`, `...Insert` y `...Update` con las columnas nuevas.
- **Acceptance criteria**:
  - [ ] `npx tsc --noEmit` limpio
  - [ ] `nota` y las de pausa son opcionales en el insert
- **Dependencies**: T001

### Phase 4: Cargar un rango

#### T007: Expansión del rango a fechas

- **Files**: `src/lib/excepcion-rango.ts`
- **Description**: Función pura que recibe desde, hasta, la regla semanal del barbero y el tilde "incluir mis días libres", y devuelve las fechas a escribir. Valida: rango invertido, tope de 90 días, y que no arranque antes de hoy — **usando `ahoraEnArgentina()`**, no `new Date()`.
- **Acceptance criteria**:
  - [ ] Por defecto saltea los días que el barbero no trabaja (FR-012)
  - [ ] Con el tilde, los incluye (FR-013)
  - [ ] Rango invertido y rango de más de 90 días se rechazan con un mensaje en criollo
  - [ ] Un rango que arranca ayer se rechaza
  - [ ] Rango de un solo día es válido
- **Dependencies**: T002

#### T008: Test de la expansión + escritura en lote

- **Files**: `scripts/test-excepcion-rango.ts`, `src/lib/barber-availability.ts`, `package.json`
- **Description**: El test de T007, y `upsertDayOverridesEnLote()` — un solo upsert con array y `onConflict: "barber_id,override_date"`, que reactiva fechas borradas poniendo `deleted_at = null`. Más `listDayOverridesDesde(fecha)` para la lista de la pantalla.
- **Acceptance criteria**:
  - [ ] Test cubre los cinco criterios de T007 y corre en `npm run test:unit`
  - [ ] El lote va en una sola ida a la base
  - [ ] Reescribir una fecha ya cargada la reemplaza, no duplica (FR-007)
  - [ ] Reactivar una fecha borrada funciona (borrado blando + unique sin filtrar por `deleted_at`)
- **Dependencies**: T007

### Phase 5: La pantalla [BLOCKING]

#### T009 [BLOCKING]: `BarberScheduleExceptions`

- **Files**: `src/components/admin/BarberScheduleExceptions.tsx`, `src/components/BarberAvailabilityManager.tsx`
- **Description**: Lista de excepciones vigentes (agrupadas por tramo, con borrar) y formulario de rango: desde/hasta, trabaja sí/no, horario, pausa (heredar / propia / ninguna), nota, y el tilde de días libres apagado. Antes de guardar muestra qué días va a tocar y lista los turnos que quedarían afuera, **sin bloquear**. Componente propio: `BarberAvailabilityManager` ya tiene 975 líneas.
- **Acceptance criteria**:
  - [ ] Mobile-first, botones de 44px, negro + gold, español rioplatense
  - [ ] Muestra los días que va a tocar antes de guardar
  - [ ] Lista los turnos que quedan afuera con cliente y hora, y **deja guardar igual** (FR-009)
  - [ ] Guardar no cancela, mueve ni altera ningún turno (FR-011)
  - [ ] Borrar un tramo devuelve esos días a la regla semanal
  - [ ] Sin dependencias nuevas
- **Dependencies**: T005, T006, T008

### Phase 6: Que se vea

#### T010 [P]: Marcar el día distinto en la agenda

- **Files**: `src/components/admin/AgendaCalendarGridView.tsx`, `src/components/AdminAppointments.tsx`
- **Description**: Un día con excepción se distingue en la agenda, con la nota si se cargó (FR-101, FR-102).
- **Acceptance criteria**:
  - [ ] Se nota a simple vista que ese día tiene otro horario
  - [ ] La nota aparece si existe
- **Dependencies**: T009

#### T011 [P]: "Extender cierre" manda `hereda_pausa` explícito

- **Files**: `src/components/AdminAppointments.tsx`
- **Description**: El atajo del turnero hoy depende del default de la columna. Que lo mande explícito, para que se lea qué hace y no cambie de sentido si el default cambia.
- **Acceptance criteria**:
  - [ ] El upsert manda `hereda_pausa: true`
  - [ ] El atajo sigue funcionando igual que antes
- **Dependencies**: T005

### Phase 7: Verificación

#### T012: Lint + build + suite

- **Description**: `npm run test:unit && npm run lint && npm run build`, los tres limpios.
- **Acceptance criteria**:
  - [ ] Suite entera en verde
  - [ ] Lint: 0 errores, 0 warnings
  - [ ] Build: success
- **Dependencies**: T009, T010, T011

#### T013: Smoke contra la demo

- **Description**: Todo contra **`primebarber`**, nunca contra una barbería real. Los turnos de prueba se borran al terminar.
- **Acceptance criteria**:
  - [ ] Cargar 14–18 con horario extendido cambia la grilla pública de esos cinco días
  - [ ] El lunes 21 queda exactamente como antes (SC-001)
  - [ ] Con un barbero **con pausa**, la pausa sigue los días con excepción (SC-002)
  - [ ] Borrar la excepción devuelve la agenda al estado anterior (SC-006)
  - [ ] Acortar un día con turnos: avisa cuáles quedan afuera y los turnos siguen ahí (SC-004)
  - [ ] Lo que ofrece la página y lo que acepta el servidor coinciden en las fechas con excepción (SC-005)
- **Dependencies**: T012

## Completion Criteria

- Todas las tareas ✅
- Lint + build + suite limpios
- Los seis Success Criteria de la spec verificados contra la demo
- Los nueve escenarios de aceptación de la spec cubiertos

## Notas de riesgo

- **T004 es el commit peligroso**: toca el cálculo de disponibilidad de las 7 barberías. Va solo, en su propio commit, para poder revertirlo sin arrastrar la feature.
- **La hora es la de la barbería.** En T007 hay que usar `ahoraEnArgentina()`. `new Date().getHours()` en Vercel devuelve UTC y ya rompió la reserva el 04/09.
- **El bug de la pausa está verificado en producción**: el 30 y el 31 de julio, un barbero con pausa de 13:00 a 16:00 quedó con esas tres horas abiertas a reservas.

## Next Steps

- Correr **speckit-implement** para ejecutar estas tareas.
