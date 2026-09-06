# Implementation Plan: Excepción de horario por rango de días

**Branch**: `030-excepcion-horario-rango`
**Spec**: spec.md
**Created**: 2026-09-06
**Status**: Draft

## Architecture Overview

El modelo y el motor ya soportan excepciones por fecha: la tabla `barber_day_overrides` existe, tiene RLS, y tanto el cálculo del navegador como el del servidor le dan prioridad sobre la regla semanal. En producción hay 16 excepciones cargadas. Lo que falta no es capacidad, es **una puerta**: hoy la única forma de crear una es un aviso reactivo del turnero ("extender cierre") que aparece solo si ese día ya se desbordó con turnos.

El trabajo entonces son tres cosas separadas, en este orden: **arreglar la pausa**, **aislar la resolución del día**, y **construir la pantalla**. El orden importa: la pantalla multiplica el uso de las excepciones, así que soltarla antes del arreglo convertiría un bug raro en uno cotidiano.

La pieza que sostiene todo es `resolverJornadaDelDia()`: una función pura que contesta "¿cómo es el día de este barbero en esta fecha?" y devuelve `{ trabaja, inicio, fin, pausa, origen }`. Hoy esa lógica está escrita adentro de `buildAvailabilitySlots`, mezclada con el armado de la grilla y el filtrado de ocupados. Sacarla afuera es lo que hace que la precedencia de la spec viva en un solo lugar y se pueda testear sin construir una agenda entera — y es la respuesta concreta al pedido de "separalo bien para que no haya bugs de horario".

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Guardado del rango | Una fila por fecha, upsert en lote con `onConflict` | Resolver solapamientos entre rangos al calcular es de donde salen los bugs difíciles. Con una fila por día, "¿qué rige el 17?" tiene una sola respuesta |
| Pausa en la excepción | `hereda_pausa` + `break_start`/`break_end` | Son tres estados (heredar, propia, ninguna) y dos columnas solo cubren dos. El `default true` arregla las filas viejas sin backfill |
| Resolución del día | Función pura nueva, compartida navegador/servidor | Una sola definición de la jornada. Si cliente y servidor pueden discrepar, discrepan |
| Escritura | Cliente de Supabase con RLS, sin endpoint nuevo | Mismo patrón que bloqueos y regla semanal. El servidor recalcula al reservar, así que una excepción falsa no abre nada |
| "Hoy" | `ahoraEnArgentina()` | `new Date()` en Vercel es UTC. Ese fue el bug del 04/09 |
| Aviso de conflictos | Función pura `turnosFueraDeJornada()` | El aviso tiene que contar lo mismo que el motor, o miente |

## File-Level Changes

### New Files

- `supabase/migrations/20260906_excepcion_horario_pausa_y_nota.sql` — agrega `hereda_pausa`, `break_start`, `break_end`, `nota` y sus checks.
- `src/lib/jornada-del-dia.ts` — `resolverJornadaDelDia()` y `turnosFueraDeJornada()`. Puras, sin Supabase, sin React.
- `src/components/admin/BarberScheduleExceptions.tsx` — la pantalla: lista de excepciones vigentes + formulario de rango.
- `scripts/test-jornada-del-dia.ts` — la precedencia completa, caso por caso.
- `scripts/test-excepcion-rango.ts` — la expansión del rango a fechas (días libres, tope, rango invertido).

### Modified Files

- `src/lib/availability.ts` — `buildAvailabilitySlots` deja de resolver el día inline y llama a `resolverJornadaDelDia()`. **Acá se arregla la pausa**: hoy fuerza `breakStart/breakEnd = null` cuando hay excepción.
- `src/lib/server/slot-availability.ts` — pide `hereda_pausa`, `break_start`, `break_end` en el select de overrides. *(Una columna que no se pide llega `undefined` y la feature se apaga sola, sin error.)*
- `src/lib/barber-availability.ts` — `upsertDayOverrideForBarber` acepta los campos nuevos; se suma `upsertDayOverridesEnLote()` y `listDayOverridesDesde(fecha)` para la lista.
- `src/lib/supabase.ts` — tipos de la fila con las columnas nuevas.
- `src/components/BarberAvailabilityManager.tsx` — monta la sección nueva debajo de la regla semanal y los bloqueos. Ya tiene 975 líneas: la pantalla nueva va en su propio componente, no adentro.
- `src/components/AdminAppointments.tsx` — el "extender cierre" pasa a mandar `hereda_pausa: true` explícito (hoy depende del default).
- `package.json` — los dos tests nuevos en `test:unit`.

## Data Model Changes

Ver [data-model.md](./data-model.md). Resumen: cuatro columnas nuevas en `barber_day_overrides`, dos checks (la pausa va completa o no va; y cae adentro de la jornada). Sin tablas nuevas, sin cambios de RLS, sin índices nuevos.

## API Surface

Ninguna ruta nueva. La pantalla escribe con el cliente de Supabase, igual que la regla semanal y los bloqueos.

El contrato que sí importa es el de la función compartida, en [contracts/jornada-del-dia.md](./contracts/jornada-del-dia.md).

## UI / UX

### Component Hierarchy

```
AdminBarbersManager
└── BarberAvailabilityManager (modificado)
    ├── Regla semanal            (existe)
    ├── Bloqueos puntuales       (existe)
    └── BarberScheduleExceptions (nuevo)
        ├── ListaDeExcepciones   — vigentes, agrupadas por tramo, con botón de borrar
        └── FormularioDeRango    — desde/hasta, trabaja sí/no, horario, pausa, nota
```

### Key Interactions

- **Cargar un rango**: elige desde/hasta → la pantalla muestra qué días va a tocar (y cuáles saltea por ser libres) → pone horario → si hay turnos que quedarían afuera los lista → guarda.
- **Abrir un día libre**: tilde "incluir también mis días libres", apagado por defecto.
- **Marcarse días libres**: mismo formulario con "no trabajo" — no pide horario.
- **Borrar**: por tramo o por día suelto; vuelve a la regla semanal al instante.
- **Ver el efecto**: la agenda de un día con excepción lo muestra distinto (FR-101).

Mobile-first, botones de 44px, español rioplatense, negro + gold. Sin librería nueva de fechas: se reusan los helpers de `date-utils` y `format`.

## Testing Strategy

- **Unitarios de la jornada** (`test-jornada-del-dia.ts`) — el corazón:
  - excepción pisa la regla semanal; sin excepción rige la regla; sin regla rige el horario de la barbería;
  - **la pausa se hereda** con `hereda_pausa = true`;
  - pausa propia; y `hereda_pausa = false` con nulls = sin pausa;
  - `is_working = false` cierra el día aunque haya horario cargado;
  - el `origen` que devuelve coincide con quién decidió.
- **Unitarios del rango** (`test-excepcion-rango.ts`): expansión a fechas, saltear días libres, incluirlos con el tilde, rango invertido, rango de un día, tope de 90 días, rango que empieza ayer.
- **Regresión**: `test-hora-argentina.ts` y el resto de la suite tienen que seguir en verde — el refactor de `buildAvailabilitySlots` toca el mismo archivo.
- **Smoke manual contra la demo** (`primebarber`, nunca una barbería real):
  1. cargar 14–18 con horario extendido y ver la grilla pública de esos días;
  2. verificar que el 21 quedó igual que antes;
  3. cargar una excepción a un barbero **con pausa** y confirmar que la pausa sigue;
  4. borrar y confirmar que vuelve todo;
  5. acortar un día con turnos cargados y ver el aviso, y que los turnos siguen ahí.
- **Paridad cliente/servidor**: para una fecha con excepción, lo que ofrece la página y lo que acepta el servidor al reservar tienen que coincidir (SC-005).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tocar `buildAvailabilitySlots` rompe la agenda de las 7 barberías | El refactor sale primero y solo, con la suite entera en verde antes de escribir una línea de UI. Es extracción pura: mismas entradas, mismas salidas |
| La columna nueva no se pide en algún `select` y la pausa se apaga sola | Es un modo de falla conocido y silencioso. Hay tres lugares que leen overrides; se revisan los tres y el test de paridad lo agarra |
| La pantalla multiplica el uso antes de que el arreglo esté | El orden de las tareas lo impide: migración y arreglo primero, UI última |
| Cargar 90 días de un saque | Upsert en lote, una sola ida; tope de 90 y aviso de cuántos días toca antes de guardar |
| Que el aviso de conflictos cuente distinto que el motor | Sale de la misma función pura que arma la jornada |

## Rollback Plan

- **UI**: revertir el commit de `BarberScheduleExceptions` deja todo como está hoy — el mecanismo por día sigue funcionando desde el turnero.
- **Migración**: las columnas son aditivas y con default; no rompen nada viejo. Para volver atrás, `alter table ... drop column`, pero no hace falta: sin la UI quedan sin usar.
- **Refactor del motor**: es el riesgo real. Va en su propio commit para poder revertirlo solo, sin arrastrar la feature.

## Constitution Check

| Principio | Estado |
|---|---|
| Multi-tenant first | OK — todo por `barbershop_slug`, RLS ya existente, nada de SV Barber hardcodeado |
| Mobile-first | OK — la pantalla se diseña para celular primero |
| Estética premium minimal | OK — negro + gold, sin ornamentos, sin libs de UI nuevas |
| Spanish rioplatense | OK — textos y errores en criollo |
| Stack discipline | OK — TS, App Router, Tailwind, Supabase. Sin dependencias nuevas |
| No half-finished | OK — DB → motor → UI → tests → lint + build en la misma entrega |
| Branch workflow | OK — todo en `030-excepcion-horario-rango`, merge con `--no-ff` |
| Spec-driven | OK — spec + plan + tasks antes de codear |

Sin excepciones que documentar.

## Next Steps

- Correr **speckit-tasks** para bajar esto a una lista ordenada por dependencias.
