# Implementation Plan: Calendario de la agenda — encimados, cortos y sobreturnos

**Branch**: `031-calendario-encimados` (worktree `C:\Users\Pastori\wt\tijerapp-calendario`)
**Spec**: [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/](contracts/)
**Created**: 2026-10-02
**Status**: Draft

## Architecture Overview

El cálculo de **dónde va cada bloque** sale del componente y pasa a un módulo puro,
`src/lib/agenda-layout.ts`, con tests unitarios: grupos transitivos de encimados, carriles, ancho
compartido por grupo, "+N" desde el tercer carril, altura mínima dentro del cálculo, rango del día,
huecos libres y franjas no disponibles (pausa, bloqueos, fuera de horario). El componente
`AgendaCalendarGridView` queda como pura presentación de ese resultado más el arrastre que ya tiene.

Sobre esa base se suman tres piezas de interfaz: la **hoja de detalle** al tocar un turno (que reusa
la tarjeta de la vista Lista, así las acciones y permisos no se duplican), el **selector de barbero**
para celular (una columna a ancho completo, chips + deslizamiento) y el **sobreturno** (columna
`is_sobreturno`, alta manual con hora y duración precargadas desde el hueco, dibujo distinto).

La disponibilidad pública, los endpoints y las RPCs no cambian. El único cambio de base es la columna
nueva y el índice único que la excluye.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| 1. Multi-tenant | ✅ | Nada por barbería; la marca vive en `appointments` con RLS por fila existente |
| 2. Mobile-first, 44 px | ⚠️ Excepción | Bloques compactos de 30–55 px de alto (ancho completo en celular). Ver research D4: agrandar el área táctil taparía al turno siguiente; alternativa accesible = detalle y "+N" |
| 3. Estética premium | ✅ | Paleta negro/dorado; se **quitan** el brillo radial y la línea de vidrio del bloque actual (contradicen "sin glows") |
| 4. Rioplatense | ✅ | Textos nuevos: "Encimado", "Sobreturno", "Pausa", "Cargar sobreturno" |
| 5. Stack | ✅ | Framer Motion ya instalado (primer uso, sin paquetes nuevos). Sin CSS modules |
| 6. End-to-end | ✅ | Migración → tipos → UI → tests → lint + build |
| 7. Branch workflow | ✅ | Rama 031 en worktree aparte; merge `--no-ff` a `main` |
| 8. Spec-driven | ✅ | Este flujo |

Re-evaluación post diseño: sin violaciones nuevas.

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Geometría | Módulo puro `agenda-layout.ts` | Testeable con `npm run test:unit`; arregla el bug de cadenas por construcción |
| Escala | 2 px/min fijo | Independiente del intervalo; 15 min = 30 px legible |
| Celular | `useMediaQuery("(max-width: 767px)")` + swipe propio con umbral | No hay hook; Framer `drag` compite con dnd-kit |
| Animación | Framer Motion `AnimatePresence` + `useReducedMotion` | Ya instalado; reglas de la remasterización |
| Detalle | Hoja que envuelve la tarjeta de la Lista | Cero duplicación de acciones |
| Sobreturno | Columna boolean + índice parcial | Única forma de distinguir intencional de error |
| Bloqueos | Consulta por barbería y fecha en el turnero | Hoy no se cargan (research H4) |

## File-Level Changes

### New Files
- `src/lib/agenda-layout.ts` — layout puro (D1, D2, D8, D9), huecos libres, `pisaAOtro`.
- `scripts/test-agenda-layout.ts` — tests (cadenas, "+N", cortos seguidos, sobreturno, rango, huecos).
- `src/hooks/useMediaQuery.ts` — hook de breakpoint.
- `src/components/admin/agenda/AgendaBarberSwitcher.tsx` — chips de barbero (celular).
- `src/components/admin/agenda/AppointmentDetailSheet.tsx` — hoja/panel de detalle.
- `src/components/admin/agenda/OverlapGroupList.tsx` — lista del "+N".
- `src/components/admin/agenda/UnavailableBand.tsx` — franja de pausa/bloqueo/fuera de horario.
- `supabase/migrations/<ts>_appointments_sobreturno.sql` — ver `contracts/migracion-sobreturno.sql`.

### Modified Files
- `src/components/admin/AgendaCalendarGridView.tsx` — usa `layoutDia`; bloque compacto/encimado/
  sobreturno; "+N"; franjas; regla estirada; columna única en celular; `onOpenAppointment`;
  `onCreateAt` desde el hueco; scroll a "ahora". Se quitan `packBarberBlocks`, brillo y vidrio.
- `src/components/AdminAppointments.tsx` — dibuja el grid aun sin turnos (H8); carga bloqueos del día;
  abre la hoja de detalle con la tarjeta existente; abre el alta manual con hora/modo.
- `src/components/admin/ManualAppointmentModal.tsx` — `defaultTime`, `mode`, duración editable,
  servicio opcional en sobreturno, confirmación si pisa.
- `src/lib/appointments.ts` — `is_sobreturno` en `APPOINTMENT_SELECT` y en el select de duración real.
- `src/lib/barber-availability.ts` — consulta de bloqueos por barbería y fecha.
- `src/lib/supabase.ts` — tipo `is_sobreturno`.
- `package.json` — sumar `test-agenda-layout.ts` a `test:unit`.

## Data Model Changes
Ver [data-model.md](data-model.md): columna `is_sobreturno boolean not null default false` e índice
único parcial `... and not is_sobreturno`. Sin cambios de RLS (políticas por fila). Sin índices nuevos.

## API Surface
Sin endpoints nuevos ni modificados.

## UI / UX

### Component Hierarchy
```
AdminAppointments
├── AgendaCalendar (tira de semana, sin cambios)
├── AgendaCalendarGridView (modificado)
│   ├── AgendaBarberSwitcher (solo < 768 px)
│   ├── Regla de horas + línea de "ahora"
│   ├── Columna(s) por barbero
│   │   ├── UnavailableBand (pausa / bloqueo / fuera de horario)
│   │   ├── DroppableSlot (hueco → "Turno" / "Sobreturno")
│   │   ├── Bloque (completo | compacto | encimado | sobreturno)
│   │   └── Ficha "+N"
│   └── DragOverlay (sin cambios)
├── AppointmentDetailSheet → tarjeta existente de la Lista
├── OverlapGroupList
└── ManualAppointmentModal (mode turno | sobreturno)
```

### Key Interactions
- Tocar turno → hoja de detalle con sus acciones de siempre.
- Tocar hueco libre → mini menú "Turno" / "Sobreturno" → alta manual con hora (y barbero) cargados.
- Tocar "+N" → lista del grupo → tocar uno → detalle.
- Celular: tocar chip o deslizar → cambia de barbero; mantener apretado un turno → arrastrar de hora.
- Escritorio: igual que hoy, más detalle al click y hueco clickeable.

### Lenguaje visual
- Bloque común: superficie `--surface-2`, barra de estado de 3 px a la izquierda (confirmado verde,
  pendiente dorado), nombre 14 px semibold, metadata 12 px. Radio 6 px.
- Compacto: una línea `15:20 · Juan`, 13–14 px, sin avatar.
- Encimado: borde 1 px `--danger` al 50 % + ícono de alerta; texto "Encimado" en el detalle.
- Sobreturno: borde punteado dorado + ícono de rayo; franja angosta a la derecha cuando convive con
  otro turno.
- Pausa/bloqueo: rayado diagonal sutil `--surface-1` con etiqueta 12 px.
- "Ahora": línea dorada de 1 px + punto, como hoy.

## Testing Strategy
- **Unit** (`scripts/test-agenda-layout.ts`): cadena A–B–C–D sin solapes laterales y mismo ancho por
  grupo; 3+ simultáneos → 2 visibles + "+N"; ocho turnos de 15 min seguidos sin encimarse; sobreturno
  en hueco y dentro de grupo; duración real alargada que pisa al siguiente → encimado; rango estirado
  por turno fuera de jornada; huecos descontando pausa y bloqueos; `pisaAOtro`.
- **Build**: `npm run lint`, `npm run build`, `npm run test:unit`.
- **Manual con `primebarber`** (nunca datos reales; verificar en `barbershop_admins` que la sesión solo
  llega a la demo): 360/390/768/1024/1440 px; día vacío; doble encimado; cadena de 3; ocho cortos;
  sobreturno en hueco y encima (confirmación); arrastre en celular y escritorio; plan vencido; reducir
  movimiento; teclado en chips y hoja.
- **Capturas** antes/después en celular y escritorio para Bautista.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Swipe de barbero vs arrastre de dnd-kit vs scroll vertical | Swipe solo si |dx| > 60 y |dx| > 1,5·|dy| y sin arrastre activo; dnd-kit sigue con delay 200 ms |
| Conflicto con la remasterización (misma zona del turnero) | Worktree aparte; su entrega dejó el grid intacto. Antes del merge: rebase sobre `main` con lo suyo ya mergeado y resolver `AdminAppointments.tsx` |
| Columna nueva no pedida en un select → marca apagada en silencio | Test de humo: el turno de prueba vuelve con `is_sobreturno: true` en el turnero |
| Índice parcial: migración con turnos duplicados existentes | El índice nuevo es más permisivo que el actual: no puede fallar sobre datos que ya cumplen el viejo |
| `AdminAppointments.tsx` (2116 líneas) crece | Las piezas nuevas van en `components/admin/agenda/`; el padre solo cablea |
| Rendimiento con días de 40+ turnos | Layout O(n log n) memoizado por día; sin animar bloques |

## Rollback Plan
- Revert del merge commit de 031 en `main` (Vercel redeploya).
- La columna `is_sobreturno` puede quedar (default false, nadie la lee tras el revert). Si hiciera
  falta volver el índice:
  ```sql
  drop index if exists public.appointments_unique_active_slot;
  create unique index appointments_unique_active_slot
    on public.appointments (barbershop_slug, barber_id, appointment_date, appointment_time)
    where status in ('pending', 'confirmed');
  ```
  (Antes, cancelar o mover los sobreturnos que compartan hora exacta con otro turno.)

## Next Steps
- Run **speckit-tasks** to decompose this plan into a dependency-ordered task list
