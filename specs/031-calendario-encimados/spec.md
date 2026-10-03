# Specification: Calendario de la agenda — turnos encimados, cortos y sobreturnos

**Branch**: `031-calendario-encimados` (worktree aparte en `C:\Users\Pastori\wt\tijerapp-calendario`, para no tocar el checkout de la remasterización)
**Created**: 2026-10-02
**Status**: Draft
**Input**: "me gustaría rehacer el calendario de la agenda, porque se ve muy desordenado cuando se acumulan turnos o se superponen por diversas razones, como que el barbero tiene un tiempo libre y decide cortarle a alguien en 15 min. La idea es hacerlo bien estético y funcional." (Bautista, 2/10/2026, a partir de un reclamo de SV Barber)

## Contexto

La vista **Calendario** del turnero muestra una columna por barbero con los turnos como
bloques sobre una regla de horas. Funciona bien en un día ordenado y se desarma en los
días reales:

- **Turnos encimados ilegibles.** Cuando dos turnos se pisan, la columna del barbero se
  parte en dos y cada bloque queda tan angosto que no se lee el nombre del cliente.
- **Bloques que se tapan.** En cadenas (el turno A pisa al B y el B pisa al C) cada
  bloque calcula su ancho por su cuenta: salen de anchos distintos y uno tapa a otro.
- **Turnos cortos sin texto.** Un turno de 15 minutos mide la mitad que uno de 30 y el
  contenido no entra.
- **El sobreturno parece un error.** Cuando el barbero mete a propósito un corte corto
  en un rato libre, la agenda lo dibuja igual que una doble reserva accidental.
- **En el celular no entra.** Con varios barberos, cada columna queda angosta y hay que
  desplazarse de costado para ver al resto.

El 2/10/2026 un barbero de SV Barber reportó la agenda "bugueada" con un turno encimado
a las 15:30 sobre un "Corte y barba" de las 15:00. La causa de disponibilidad ya se
corrigió aparte (commit `cb0a69a`): esta spec se ocupa de **cómo se ve y se usa** la agenda.

## User Scenarios & Testing

### Primary User Story

El dueño o el barbero abre la agenda durante la jornada, casi siempre desde el celular,
entre corte y corte. Necesita ver en un vistazo qué tiene ahora y qué sigue, darse cuenta
de inmediato si dos turnos se pisan, y poder meter a alguien en un rato libre sin que la
agenda quede desordenada.

### Acceptance Scenarios

1. **Given** un celular de 390 px y una barbería con 3 barberos, **When** el dueño abre la
   vista Calendario, **Then** ve un solo barbero a ancho completo, con su nombre y la
   cantidad de turnos del día, y pasa al siguiente deslizando o tocando su nombre en una
   barra de barberos.
2. **Given** una pantalla de escritorio (1440 px), **When** el dueño abre la vista
   Calendario, **Then** ve a todos los barberos que trabajan ese día lado a lado, sin
   desplazamiento horizontal hasta 5 barberos.
3. **Given** dos turnos del mismo barbero que se pisan (15:00–15:40 y 15:30–16:00),
   **When** se dibuja la agenda, **Then** los dos se ven completos lado a lado, del mismo
   ancho, sin taparse, con nombre del cliente y hora legibles, y marcados como
   "encimados" con algo más que el color.
4. **Given** una cadena de tres turnos encimados (A pisa B, B pisa C), **When** se dibuja
   la agenda, **Then** los tres tienen el mismo ancho y ningún bloque tapa a otro.
5. **Given** tres o más turnos que coinciden en el mismo momento, **When** se dibuja la
   agenda, **Then** se ven dos bloques y una marca "+N" con los restantes. Al tocarla se
   abre la lista completa de ese momento y cada turno se puede abrir desde ahí.
6. **Given** un turno de 15 minutos, **When** se dibuja la agenda, **Then** se ve en una
   sola línea "15:20 · Juan" legible, y al tocarlo se abre el mismo detalle que el resto.
7. **Given** un rato libre de 20 minutos en la agenda de un barbero, **When** el dueño
   elige "Sobreturno" desde ese hueco o desde el botón de agregar, **Then** carga cliente,
   servicio y duración (15 min por defecto) en el menor número de pasos, y el turno queda
   en la agenda dibujado como sobreturno: franja angosta al costado con su marca, sin
   confundirse con una doble reserva.
8. **Given** un sobreturno guardado, **When** un cliente entra a la página de reservas,
   **Then** ese horario no se le ofrece.
9. **Given** la barbería con el plan vencido (modo lectura), **When** abre el calendario,
   **Then** ve la agenda nueva completa pero sin acciones de crear, mover ni sobreturno.
10. **Given** un turno en la agenda, **When** el dueño lo arrastra a otro horario o
    barbero, **Then** la reprogramación funciona como hoy, incluido el aviso de conflicto
    y la confirmación.

### Edge Cases

- **Barbería de un solo barbero:** en el celular no aparece la barra de barberos.
- **Barbero que hoy no trabaja pero tiene turnos** (por ejemplo, se le movió uno a su
  franco): sigue teniendo columna o pantalla, marcada como "fuera de horario".
- **Turno fuera de la jornada** (antes de abrir o después de cerrar): se ve, marcado,
  y la regla de horas se extiende para mostrarlo.
- **Encimado con la pausa del mediodía o con un bloqueo:** el turno se ve por encima de
  la franja de pausa o bloqueo, no queda escondido debajo.
- **Duración real ajustada (−5/+5):** el bloque refleja la duración ajustada, y un
  alargue que pisa al turno siguiente se ve como encimado.
- **Sobreturno sobre un turno existente** (no en un hueco): se permite, con confirmación
  explícita de que se va a encimar.
- **Nombres largos:** se cortan con "…" sin romper el bloque; el nombre completo está
  en el detalle.
- **Muchos turnos cortos seguidos** (ocho de 15 minutos en dos horas): todos legibles
  en formato compacto, sin solaparse visualmente.
- **Día vacío y día con error de carga:** estados propios, distintos entre sí, con
  reintento que conserva el día y el barbero elegidos.
- **Volver a la agenda:** se conserva el barbero que se estaba mirando en el celular y
  la posición del día.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: En pantallas angostas (celular), el calendario MUST mostrar un barbero por
  vez a ancho completo, con una barra para elegir barbero (nombre y cantidad de turnos
  del día) y pase al siguiente o anterior deslizando de costado.
- **FR-002**: En pantallas anchas, el calendario MUST mostrar todos los barberos del día
  lado a lado, como hoy.
- **FR-003**: Los turnos que se pisan MUST repartirse por grupo: todos los turnos de un
  mismo grupo de encimados comparten el mismo ancho y ninguno tapa a otro.
- **FR-004**: Con 3 o más turnos que coinciden en un mismo momento, el calendario MUST
  mostrar como máximo 2 bloques más una marca "+N" que abre la lista completa.
- **FR-005**: Los turnos encimados MUST tener una marca visible que no dependa solo del
  color (ícono o texto "Encimado").
- **FR-006**: Los turnos de 20 minutos o menos MUST verse en formato compacto de una
  línea (hora · cliente). El detalle completo se abre al tocarlos.
- **FR-007**: Todo bloque, sin importar su duración, MUST tener un área táctil de al
  menos 44 px de alto o abrirse desde un elemento que la tenga.
- **FR-008**: El dueño MUST poder crear un **sobreturno** desde un hueco de la agenda o
  desde el botón de agregar, con duración corta por defecto (15 min) editable.
- **FR-009**: Un sobreturno MUST quedar guardado como tal y dibujarse distinto de un
  turno común y de un encimado accidental (franja angosta al costado con marca de
  sobreturno).
- **FR-010**: Un sobreturno MUST ocupar su horario para la reserva pública, igual que
  cualquier turno activo.
- **FR-011**: Crear un sobreturno encima de un turno existente MUST pedir una
  confirmación explícita.
- **FR-012**: Se MUST mantener todo lo que ya hace el calendario: arrastrar para
  reprogramar (y su alternativa sin arrastre), avisos de conflicto, duración real,
  pausas, excepciones de jornada, bloqueos, varios barberos, permisos del empleado y
  modo lectura con el plan vencido.
- **FR-013**: El calendario MUST seguir el sistema visual de la remasterización: oscuro
  premium, dorado solo como acento de selección o acción, texto operativo de 14 a 16 px,
  metadata de 12 px o más, radios de 8 px o menos y contraste AA.
- **FR-014**: Las transiciones (cambiar de barbero, abrir "+N", abrir detalle) MUST ser
  breves y respetar "reducir movimiento" mostrando directamente el estado final.
- **FR-015**: Se MUST marcar la hora actual en el día de hoy, y al abrir el calendario
  hoy la vista MUST arrancar cerca de esa hora.

### Should Have

- **FR-101**: Densidad ajustable (cómoda / compacta) recordada por dispositivo, para
  barberías con días muy cargados.
- **FR-102**: Un resumen por barbero en la barra (próximo turno, huecos libres del día).
- **FR-103**: Desde el detalle de un turno encimado, acción rápida para correrlo al
  siguiente hueco libre.

### Won't Have (out of scope)

- Cambios en la agenda del empleado (`mi-agenda`): se evalúan después de validar esta.
- Vistas de semana o de mes nuevas.
- Cambios en la página de reservas pública o en las reglas de disponibilidad, más allá
  de que el sobreturno ocupe su horario (FR-010).
- Sincronización con calendarios externos.
- Rediseño de la vista Lista del turnero (ya la cubre la remasterización, entrega 14).

## Key Entities

- **Turno**: el que ya existe (barbero, fecha, hora, servicio, duración, duración real,
  estado). Se le suma un atributo que indica si es **sobreturno**.
- **Grupo de encimados**: conjunto de turnos de un mismo barbero que se pisan entre sí,
  directa o encadenadamente. No se guarda: se calcula al dibujar.
- **Hueco libre**: rato sin turnos dentro de la jornada efectiva del barbero (descontando
  pausa y bloqueos). No se guarda: es el punto de partida del sobreturno.

## Success Criteria

- **SC-001**: En un celular de 360 px, el nombre del cliente se lee en el 100 % de los
  turnos de un día de prueba con encimados dobles, una cadena de tres y ocho turnos de
  15 minutos.
- **SC-002**: Ningún bloque tapa a otro en ninguno de los escenarios de prueba de
  encimados (cero superposiciones visuales medidas).
- **SC-003**: Desde el celular, el dueño carga un sobreturno de 15 min en un hueco en
  20 segundos o menos y en 4 toques o menos, sin contar el tipeo del nombre.
- **SC-004**: Un barbero que mira la agenda distingue un sobreturno de una doble reserva
  accidental sin abrirlos (verificado con capturas y con Bautista).
- **SC-005**: Cero regresiones en reprogramar, conflictos, duración real, pausas,
  excepciones, permisos y modo lectura: tests unitarios en verde y pruebas funcionales
  con la barbería demo.
- **SC-006**: Sin desbordes horizontales de página a 360, 390, 768, 1024 y 1440 px.

## Assumptions

- **El sobreturno se guarda como marca en el turno.** Bautista pidió que "se vea distinto
  y no se confunda con un error", y eso solo es posible si la agenda sabe que fue a
  propósito. Inferirlo (por ejemplo, "todo encimado cargado a mano es sobreturno")
  confundiría las dobles reservas reales. Requiere una migración chica, que corre
  Bautista en el SQL Editor.
- **El umbral de "turno corto" es 20 minutos o menos.** Los servicios cortos reales
  (barba, perfilado, sobreturno) rondan 15–20 min; los cortes, 30–45.
- **"Pantalla angosta" es menos de 768 px**, el mismo corte que ya usa el sistema
  visual de la remasterización.
- **Solo el dueño y quienes hoy pueden cargar turnos a mano** pueden crear sobreturnos;
  los permisos del empleado no cambian.
- **El arrastre en el celular se mantiene** con el mismo gesto de hoy (mantener apretado
  y mover), para no capturar el desplazamiento vertical de la página.
- Toda prueba visual y funcional se hace con la barbería demo `primebarber`, nunca con
  datos de clientes reales.

## Dependencies

- **Remasterización en curso** (`docs/remasterizacion-2026-10-01`, rama
  `design/admin-shell-remaster`, con cambios sin commitear en el mismo checkout). Su
  entrega 14 dejó intacto el motor y la geometría del calendario: esta spec lo toma.
  **Antes de implementar**, esa sesión tiene que commitear su trabajo, para crear la
  rama `031-calendario-encimados` sin mover sus cambios ni pisar `AgendaCalendar.tsx`.
- Corrección de disponibilidad `cb0a69a` + migración `20261002120000` (acortar un turno
  no libera horarios), ya en `main`.
- Migración nueva para la marca de sobreturno (la corre Bautista).
- Barbería demo `primebarber` para las pruebas.

## Next Steps

- Run **speckit-plan** to design the implementation
