# Research: 031 — Calendario de la agenda

Fecha: 2026-10-02. Base: `main` @ `af93236`. Fuente: inventario del código actual
(`AgendaCalendarGridView.tsx`, `AdminAppointments.tsx`, `ManualAppointmentModal.tsx`,
migraciones de `appointments`).

## Hallazgos del estado actual que cambian el alcance

| # | Hallazgo | Dónde | Consecuencia para 031 |
|---|---|---|---|
| H1 | El ancho de cada bloque sale de sus solapes **directos**: en cadenas, bloques del mismo grupo tienen anchos distintos y se pisan de costado | `packBarberBlocks` `AgendaCalendarGridView.tsx:465-523` | Reescribir el reparto como función pura con grupos transitivos (D1) |
| H2 | El piso de 48 px se aplica **después** de repartir: un turno de 15 min se dibuja más alto que su lugar y tapa al siguiente del mismo carril | `:242` | La altura mínima entra en el cálculo, no después (D2) |
| H3 | El bloque usa solo `service_duration_minutes`; la duración real ajustada no se ve | `:465-523`, `:1238` | Usar la duración efectiva (D3) |
| H4 | **Pausas y bloqueos no se dibujan**; el turnero ni siquiera carga los bloqueos | grid + `AdminAppointments` | Cargar y dibujar ambos (necesario para el hueco del sobreturno) |
| H5 | La regla de horas no se estira para un turno fuera de la jornada (queda cortado) | `:672-689` | Rango = jornada ∪ turnos del día |
| H6 | Tocar un bloque no hace nada: **no existe vista de detalle** en el calendario | `DraggableAppointmentBlock` | Hoja de detalle que reusa la tarjeta de la lista (D5) |
| H7 | El "+ Turno" del hueco es solo visual | `DroppableSlot :447-454` | Pasa a ser la entrada de "Turno" / "Sobreturno" |
| H8 | El calendario **no se dibuja en un día sin turnos** (se muestra el estado vacío) | `AdminAppointments.tsx:1632-1660` | Dibujar la grilla vacía para poder cargar desde un hueco |
| H9 | El alta manual no acepta hora ni duración precargadas, ni duración distinta a la del servicio | `ManualAppointmentModal.tsx:77-91, 140-163` | Props nuevas `defaultTime`, `mode`, duración editable en modo sobreturno |
| H10 | Índice único `(slug, barbero, fecha, hora)` activo: un sobreturno **a la misma hora exacta** de otro turno falla con 23505 | `20260526120000_appointments_unique_active_slot.sql` | El índice excluye sobreturnos (D7) |
| H11 | Framer Motion 12.40 está instalado y **no se usa en ningún lado**; no hay hook de breakpoint ni componente de deslizamiento | `package.json`, `src/components/ui` | Primer uso de Framer Motion; hook propio `useMediaQuery` |
| H12 | Mover un turno: el servidor solo rechaza la misma hora exacta, no solapes por rango. No hay diálogo de conflicto | `api/admin/appointments/move/route.ts:253-277` | Se mantiene así (fuera de alcance); el encimado que resulte se ve marcado |
| H13 | La agenda del empleado **no** usa el grid (solo comparte `AgendaCalendar`, la tira de semana) | `StaffAgenda.tsx` | Cambiar el grid no la afecta |

## Decisiones

### D1 — Reparto de turnos encimados: grupos transitivos + carriles
- **Decision**: función pura `layoutDia()` en `src/lib/agenda-layout.ts`. Ordena por inicio; arma
  **grupos** juntando turnos mientras el inicio del siguiente sea menor que el fin máximo del grupo
  (componente conexo, no solo vecinos directos); dentro del grupo asigna carril al primer libre. Todo
  el grupo comparte `carriles = max(carril)+1` y por lo tanto el mismo ancho.
- **Rationale**: es el algoritmo estándar de Google Calendar/Outlook; elimina H1 por construcción y es
  testeable sin React.
- **Alternatives**: expandir el último carril para ocupar espacio libre (estético pero complica los
  tests y el "+N"; queda como mejora); cascada superpuesta estilo Apple (se tapan por diseño, descartado).

### D2 — Escala fija y altura mínima dentro del cálculo
- **Decision**: escala fija de **2 px por minuto** (120 px por hora), independiente del intervalo de la
  barbería (hoy es 60 px por intervalo, que con intervalo de 15 min achica todo a la mitad). Para el
  reparto, cada turno ocupa visualmente `max(duración, 14 min)` → un turno de 15 min mide 30 px y dos
  seguidos no se encimen visualmente.
- **Rationale**: 30 px alcanzan para una línea de 14 px con aire; arreglar H2 sin inventar solapes.
- **Alternatives**: altura mínima 48 px (genera solapes falsos entre turnos cortos seguidos); escala
  adaptable al intervalo (comportamiento actual, causa del problema).

### D3 — Duración que se dibuja
- **Decision**: el bloque dibuja `actual_duration_minutes ?? service_duration_minutes` (lo que el barbero
  dice que dura). La disponibilidad pública sigue usando `minutosQueOcupa` (la mayor de las dos) — son
  preguntas distintas: "cuánto dura" vs "cuánto le cierro a los clientes".
- **Rationale**: la proyección de demoras de la lista ya usa ese criterio; el calendario lo ignoraba (H3).

### D4 — Turnos cortos
- **Decision**: con altura dibujada < 56 px el bloque pasa a formato compacto de una línea:
  `15:20 · Nombre` (+ ícono de sobreturno/encimado si corresponde). Umbral de "turno corto" de la spec
  (≤ 20 min) = 40 px a esta escala, siempre compacto.
- **Touch target**: el bloque compacto mide 30–55 px de alto y en celular ocupa el ancho completo de la
  pantalla (≥ 300 px). Cumple WCAG 2.5.8 (mínimo 24 px). **Excepción documentada a FR-007 (44 px)**:
  agrandar el área táctil vertical taparía al turno siguiente; la alternativa accesible es la hoja de
  detalle y la lista "+N".

### D5 — Detalle del turno: hoja que reusa la tarjeta de la lista
- **Decision**: tocar un bloque abre `AppointmentDetailSheet` (hoja inferior en celular, panel lateral en
  escritorio) que renderiza el **mismo** componente de tarjeta de la vista Lista con sus acciones
  (confirmar, WhatsApp, cancelar, duración real, repetir).
- **Rationale**: cero duplicación de acciones y de reglas de permisos; lo que ya funciona en la lista
  funciona igual acá.
- **Alternatives**: detalle propio del calendario (duplica handlers y se desincroniza).

### D6 — Un barbero por pantalla en el celular
- **Decision**: con ancho < 768 px el grid muestra **una sola columna** a ancho completo. Arriba, barra
  de barberos (chips de 44 px con nombre + cantidad de turnos, scroll horizontal propio). Cambio de
  barbero: tocar el chip o deslizar horizontalmente sobre el grid (umbral 60 px, solo si el gesto es
  más horizontal que vertical y no hay un arrastre de dnd-kit en curso). Transición con Framer Motion
  (desplazamiento + opacidad, 180 ms; con reducir movimiento, cambio directo). El barbero elegido se
  recuerda en `sessionStorage` por barbería.
- **Rationale**: el arrastre de dnd-kit arranca con mantener 200 ms; un deslizamiento rápido no lo
  dispara, así que conviven. Hook propio `useMediaQuery` con `useSyncExternalStore` (no hay ninguno).
- **Consecuencia**: en el celular el arrastre solo cambia la **hora**; cambiar de barbero se hace desde
  escritorio o con "Reprogramar" en el detalle. Documentado como límite.
- **Alternatives**: `drag="x"` de Framer Motion sobre el grid (compite con dnd-kit y con el scroll
  vertical de la página); columnas angostas con scroll horizontal (el problema actual).

### D7 — Sobreturno como marca en el turno
- **Decision**: columna `appointments.is_sobreturno boolean not null default false`. El índice único de
  horario activo pasa a excluir sobreturnos. El sobreturno **ocupa** su horario para la reserva pública
  (no se toca la disponibilidad: ya cuenta todos los turnos activos).
- **Carga**: `ManualAppointmentModal` con `mode="sobreturno"`: hora precargada desde el hueco tocado,
  duración editable (15 min por defecto, opciones 10/15/20/30), servicio opcional (si no se elige, se
  guarda "Sobreturno" con precio 0 editable). Se guarda `service_duration_minutes` = duración elegida.
- **Confirmación**: si la franja elegida pisa a otro turno activo del barbero, pedir confirmación
  explícita antes de guardar (chequeo en el cliente con los turnos ya cargados; el servidor no lo exige).
- **Rationale**: es la única forma de distinguir "lo metí a propósito" de "se pisaron por error" (spec).

### D8 — Cómo se dibuja cada caso de solape
- Grupo sin sobreturnos y con 2+ turnos → **Encimado**: todos con ícono de alerta + texto "Encimado" en
  el detalle, borde de aviso. No depende solo del color.
- Sobreturno dentro de un grupo → franja angosta (28 % del ancho, mínimo 64 px) pegada a la derecha, con
  ícono de rayo y "Sobre" en compacto; los turnos comunes del grupo se reparten el resto. Un sobreturno
  en un hueco libre se dibuja con el mismo estilo (borde punteado dorado) a ancho completo.
- Más de 2 carriles visibles → se muestran 2 y una ficha "+N" (44 px) en el carril 2; abre una lista
  con todos los turnos del grupo, cada uno abre su detalle.

### D9 — Pausas, bloqueos y rango del día
- Pausa (semanal o de la excepción del día, vía `resolverJornadaDelDia`) y bloqueos del día se dibujan
  como franjas rayadas con etiqueta ("Pausa", motivo del bloqueo), debajo de los turnos (z menor).
- Rango de la regla = mín(inicio de jornadas, primer turno) → máx(fin de jornadas, último fin), redondeado
  a la hora.
- Los bloqueos se cargan en el turnero con una consulta por barbería y fecha.

### D10 — Abrir en la hora actual
- Si el día es hoy, al montar el grid se hace `scrollIntoView({block:"center"})` sobre la línea de "ahora"
  (la página es la que scrollea vertical). Solo la primera vez por día, no en cada re-render.

### D11 — Movimiento
- Primer uso de Framer Motion en el repo (permitido por la remasterización). Solo para: cambio de
  barbero, hoja de detalle, lista "+N". `useReducedMotion()` → sin animación. Las animaciones existentes
  de arrastre (`drop-land`, `drop-target-pulse`) se mantienen.

## Fuera de alcance confirmado
- Diálogo de conflicto al arrastrar (no existe hoy; H12).
- Agenda del empleado (H13).
- Vista de semana/mes nuevas.
