# Specification: El calendario de la 031 en la agenda del empleado

**Branch**: `032-calendario-empleado` (worktree `C:\Users\Pastori\worktrees\tj-remaster`, sobre `remaster/integracion`: la remasterización de Codex + la 031 ya integradas)
**Created**: 2026-10-02
**Status**: Draft
**Input**: "vamos con el punto 9" — llevar el calendario de la 031 a la agenda del empleado (`mi-agenda`), que la spec 031 dejó afuera a propósito (Bautista, 2/10/2026).

## Contexto

La 031 le dio al dueño una agenda que se lee en un día real: turnos encimados que no se
tapan, turnos cortos legibles, sobreturnos que no parecen errores, huecos libres a la
vista, la pausa y los bloqueos dibujados, y el turno en curso marcado.

El empleado no tiene nada de eso. En `mi-agenda` ve un calendario mensual para elegir el
día y una **lista** de sus turnos agrupada por franja (mañana / tarde / noche). La lista
sirve para leer de corrido, pero no le muestra **cuánto lugar le queda**: dónde tiene un
rato libre para meter a alguien, si dos turnos se le pisan, o cuánto falta para que
termine el que está cortando. Son justamente las preguntas que se hace entre corte y
corte, con el celular en la mano.

Esta spec le da al empleado la misma línea de tiempo que al dueño, **recortada a lo que
él puede ver y hacer**: solo su columna, y solo las acciones que sus permisos le dejan.

## User Scenarios & Testing

### Primary User Story

El barbero empleado abre su agenda desde el celular entre corte y corte. En un vistazo
quiere ver qué tiene ahora, cuánto le falta al turno en curso, qué sigue y dónde le queda
un rato libre. Si un cliente entra sin turno, quiere tocar ese rato libre y cargarlo ahí
mismo, sin pasar por el dueño.

### Acceptance Scenarios

1. **Given** un empleado en un celular de 390 px, **When** abre `mi-agenda`, **Then** ve
   un selector **Lista / Calendario** y, en Calendario, la línea de tiempo de su día con
   sus turnos, su pausa y sus bloqueos, a ancho completo y sin barra de barberos.
2. **Given** el empleado eligió Calendario, **When** cierra la app y vuelve a entrar,
   **Then** la agenda se abre en Calendario (la elección se recuerda en ese dispositivo).
3. **Given** dos turnos suyos que se pisan, **When** se dibuja el calendario, **Then** se
   ven los dos completos, del mismo ancho, marcados como encimados con algo más que el
   color — igual que en la agenda del dueño.
4. **Given** hoy, a las 15:12, con un turno de 15:00 a 15:40, **When** abre el
   calendario, **Then** la vista arranca cerca de la hora actual, la línea de "ahora"
   está a las 15:12 y el turno en curso muestra su progreso.
5. **Given** un rato libre de 20 minutos y el permiso **cargar turnos**, **When** el
   empleado toca el hueco, **Then** puede elegir **Turno** o **Sobreturno** y se abre la
   carga con ese horario ya puesto, para él.
6. **Given** un rato libre y el permiso **bloquear horarios** (sin el de cargar turnos),
   **When** toca el hueco, **Then** solo se le ofrece **Bloquear** ese rato.
7. **Given** un empleado sin permiso de cargar turnos ni de bloquear, **When** toca un
   hueco, **Then** no pasa nada: el hueco se ve, pero no es un botón.
8. **Given** un empleado sin permiso **ver lo que gana**, **When** abre el detalle de un
   turno desde el calendario, **Then** no ve el precio en ningún lado, y el precio
   tampoco llega a su dispositivo.
9. **Given** un turno suyo, **When** lo toca en el calendario, **Then** se abre el mismo
   detalle que en la Lista, con exactamente las mismas acciones que hoy (confirmar,
   cancelar, escribirle, mover), cada una solo si tiene el permiso.
10. **Given** un sobreturno cargado por el empleado, **When** un cliente entra a la
    página de reservas, **Then** ese horario no se le ofrece, igual que con uno cargado
    por el dueño.
11. **Given** la barbería con el plan vencido (modo lectura), **When** el empleado abre
    el calendario, **Then** ve su agenda completa pero sin acciones de cargar, bloquear
    ni sobreturno.

### Edge Cases

- **Día que no trabaja pero tiene turnos** (le movieron uno a su franco): se ven,
  marcados como "fuera de horario".
- **Turno fuera de la jornada:** se ve y la regla de horas se extiende para mostrarlo.
- **Encimado con la pausa o con un bloqueo:** el turno queda por encima, no escondido.
- **Duración real ajustada (−5/+5):** el bloque refleja la duración ajustada, igual
  que en la agenda del dueño; un alargue que pisa al siguiente se ve como encimado.
- **Sobreturno encima de un turno existente** (no en un hueco): se permite, con
  confirmación explícita de que se va a encimar.
- **Tres o más turnos en el mismo momento:** dos bloques y "+N", como en el dueño.
- **Día vacío y día con error de carga:** estados distintos, con reintento que
  conserva el día elegido (lo que ya hace la Lista).
- **Le cambian los permisos mientras tiene la agenda abierta:** al recargar, el
  calendario refleja los nuevos; el servidor manda igual aunque la pantalla esté vieja.
- **Acceso revocado o barbero pausado:** la misma pantalla de "sin acceso" de hoy.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: La agenda del empleado MUST ofrecer dos vistas, **Lista** (la de hoy, sin
  cambios) y **Calendario**, con un selector visible. La elección MUST recordarse por
  dispositivo.
- **FR-002**: El Calendario MUST mostrar **solo los turnos, la pausa y los bloqueos del
  barbero del empleado**. El barbero MUST seguir saliendo de la sesión en el servidor,
  nunca de lo que mande la pantalla.
- **FR-003**: El Calendario MUST verse y comportarse como la columna de un barbero en la
  agenda del dueño (031): mismo reparto de encimados, "+N", formato compacto de turnos
  cortos, marca de sobreturno, pasados atenuados, línea de "ahora", progreso del turno
  en curso, huecos "Libre · N min", leyenda y "% ocupado".
- **FR-004**: El Calendario MUST usar la **misma** lógica de reparto y los mismos
  bloques que la agenda del dueño, no una copia: un arreglo en uno vale para los dos.
- **FR-005**: Tocar un turno MUST abrir el mismo detalle que en la Lista, con las
  mismas acciones y los mismos chequeos de permiso que hoy.
- **FR-006**: Tocar un hueco MUST ofrecer solo lo que el empleado puede hacer:
  **Turno** y **Sobreturno** con el permiso de cargar turnos; **Bloquear** con el de
  bloquear horarios. Sin ninguno de los dos, el hueco no es interactivo.
- **FR-007**: El empleado con permiso de cargar turnos MUST poder cargar un
  **sobreturno** para sí mismo, que quede guardado como sobreturno y ocupe su horario
  para la reserva pública (igual que FR-008/009/010 de la 031). Encima de un turno
  existente MUST pedir confirmación.
- **FR-008**: El precio MUST NOT mostrarse ni llegar al dispositivo del empleado sin el
  permiso "ver lo que gana" — tampoco a través del calendario, la leyenda o el detalle.
- **FR-009**: Con el plan vencido, el Calendario MUST verse completo y sin acciones de
  crear, sobreturno ni bloquear.
- **FR-010**: Para dibujar la jornada (inicio, fin y pausa del día, con las excepciones
  por fecha o rango), el empleado MUST recibir el horario efectivo de **su** barbero para
  el día elegido, y nada del resto de la barbería.
- **FR-011**: El Calendario MUST seguir el sistema visual de la remasterización (oscuro
  premium, dorado solo como acento, 14–16 px operativo, metadata ≥12 px, objetivos
  táctiles ≥44 px, contraste AA) y respetar "reducir movimiento".
- **FR-012**: Sin desbordes horizontales de página a 360, 390, 768, 1024 y 1440 px. En
  pantallas anchas el Calendario MAY ocupar la columna de la agenda junto al resumen,
  como hoy la Lista.

### Should Have

- **FR-101**: En el día de hoy, el resumen de arriba suma "Te queda libre: N min".
- **FR-102**: Desde un turno pasado sin confirmar, acceso rápido a confirmarlo (si
  tiene el permiso), porque es lo que hace que el turno cuente como visita.

### Won't Have (out of scope)

- **Arrastrar para mover** en el calendario del empleado: mover sigue siendo desde el
  detalle del turno, con el flujo de hoy (y su aviso al cliente).
- Ver la agenda de otros barberos.
- Permisos nuevos: alcanzan los siete de hoy.
- Vistas de semana o mes.
- Cambios en la agenda del dueño, salvo los que hagan falta para compartir piezas sin
  cambiar lo que el dueño ve.

## Key Entities

- **Turno** (existente): incluye la marca de **sobreturno** que agregó la 031.
- **Jornada efectiva del barbero para un día** (existente, se calcula): inicio, fin y
  pausa, con las excepciones de jornada aplicadas.
- **Bloqueo de horario** (existente).
- **Permisos del empleado** (existentes, siete).

## Success Criteria

- **SC-001**: En un celular de 360 px, el empleado ve su turno en curso, cuánto le falta
  y su próximo rato libre sin desplazarse, al abrir el calendario de hoy.
- **SC-002**: Desde el celular, el empleado carga un sobreturno de 15 min en un hueco en
  4 toques o menos, sin contar el tipeo del nombre.
- **SC-003**: Con cada combinación de permisos de prueba (todos, ninguno, solo bloquear,
  solo cargar, sin ver lo que gana), las acciones que aparecen coinciden 100 % con las
  permitidas, y el precio no está en la respuesta del servidor cuando no corresponde.
- **SC-004**: El mismo día de prueba dibujado en la agenda del dueño (columna de ese
  barbero) y en la del empleado da los mismos bloques, encimados y huecos.
- **SC-005**: Cero regresiones en la Lista del empleado, en la agenda del dueño y en la
  reserva pública: tests unitarios en verde y prueba funcional con `primebarber`.

## Assumptions

- **La vista por defecto la primera vez es Lista**, la que el empleado ya conoce; el
  Calendario se elige y queda recordado. Cambiar de golpe la pantalla que un barbero
  usa todos los días sin avisarle es la forma más rápida de generar un "se rompió".
- **El empleado puede cargar sobreturnos** si tiene el permiso de cargar turnos: es el
  caso que dio origen a la 031 ("un rato libre y le corta a alguien en 15 min"), y lo
  hace el barbero, no el dueño. No hace falta un permiso nuevo.
- **No hay migraciones**: la marca de sobreturno ya existe desde la 031.
- **Sin arrastre en el empleado**: mover un turno ya avisa al cliente desde el servidor
  (feature 024); sumarle arrastre agrega riesgo de movimientos accidentales con el
  celular en la mano sin agregar algo que hoy no se pueda hacer.
- La prueba visual y funcional se hace con `primebarber` y el login de empleado de
  Esteban Perez (`chinitodou@gmail.com`), nunca con datos de clientes reales. La QA
  logueada la hace Bautista (el navegador de la sesión no puede inyectar la sesión).

## Dependencies

- **Remasterización integrada** (`remaster/integracion`): esta spec parte de la agenda
  del empleado ya remasterizada (entrega 28 de Codex). Se mergea después o junto con
  ella.
- **031 en prod**: la lógica de reparto de la agenda y la marca de sobreturno.
- Endpoints del empleado (`/api/staff/*`): hoy traen sus turnos y bloqueos; habrá que
  sumar su jornada efectiva del día (FR-010) y aceptar la marca de sobreturno al cargar
  (FR-007).
