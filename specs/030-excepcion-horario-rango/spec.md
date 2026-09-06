# Specification: Excepción de horario por rango de días

**Branch**: `030-excepcion-horario-rango`
**Created**: 2026-09-06
**Status**: Draft
**Input**: Un barbero quiere hacer horas extras la semana del 14 al 18 de septiembre. Si toca su horario, le cambia también todas las semanas siguientes. Que pueda cambiar el horario solo esos días, sin tocar la regla general. Incluye arreglar que hoy la excepción por día borra la pausa del mediodía.

## User Scenarios & Testing

### Primary User Story

El horario de un barbero se configura **por día de la semana**: si cambia el lunes, cambia todos los lunes, para siempre. Cuando quiere laburar distinto una semana puntual —un feriado largo, una semana de mucha demanda, un viaje— no tiene dónde decirlo. Termina cambiando la regla general y acordándose de volver a cambiarla después, o no la toca y pierde los turnos.

La barbería tiene que poder decir **"del 14 al 18 de septiembre este barbero trabaja de 9 a 22"** y que la regla semanal quede intacta: el 21 de septiembre vuelve a ser un lunes normal, sin que nadie tenga que acordarse de nada.

### Acceptance Scenarios

1. **Given** un barbero con regla semanal de 11:00 a 21:40, **When** se carga una excepción del 14 al 18 de septiembre de 09:00 a 22:00, **Then** esos cinco días ofrecen turnos de 09:00 a 22:00 y el 21 de septiembre vuelve a ofrecer de 11:00 a 21:40.

2. **Given** un barbero con pausa de 13:00 a 16:00 en su regla semanal, **When** se carga una excepción de horario para un día, **Then** la pausa se sigue respetando ese día y no se ofrecen turnos entre las 13:00 y las 16:00.

3. **Given** una excepción cargada del 14 al 18, **When** se la elimina, **Then** esos días vuelven inmediatamente a la regla semanal y ningún otro día se ve afectado.

4. **Given** un rango que incluye un día en el que el barbero **no** trabaja según su regla semanal, **When** la excepción dice que sí trabaja, **Then** ese día pasa a ofrecer turnos con el horario de la excepción.

5. **Given** un rango cargado para marcar días libres (no trabaja), **When** un cliente entra a reservar, **Then** esos días no ofrecen ningún horario.

6. **Given** una excepción ya cargada para el 15 de septiembre, **When** se carga otra excepción que incluye el 15, **Then** la nueva reemplaza a la anterior para ese día, sin duplicar.

7. **Given** una excepción vigente, **When** el dueño mira la agenda de esos días, **Then** ve marcado que ese día tiene un horario distinto al habitual.

### Edge Cases

- **Turnos ya reservados que quedan fuera del nuevo horario.** Si la excepción **acorta** el día y ya hay turnos tomados afuera del rango nuevo, hay que decidir qué pasa antes de guardar (ver Q1). Nunca se cancela un turno en silencio.
- **Rango invertido o de un solo día.** El "desde" posterior al "hasta" se rechaza; un rango de un solo día es válido.
- **Hora de cierre anterior a la de apertura.** Se rechaza al guardar, no al calcular la agenda.
- **Rango que cruza meses o años.** Válido; no hay nada especial en el 31 de diciembre.
- **Un día del rango con bloqueo puntual ya cargado.** El bloqueo sigue valiendo: la excepción define la jornada, el bloqueo tapa un rato adentro de ella.
- **Excepción sobre un día que ya pasó.** No tiene sentido y no se ofrece: el rango arranca hoy o después.
- **Dos barberos, un solo rango.** La excepción es siempre de **un** barbero. Si dos hacen horas extras, son dos excepciones.
- **Turnos que arrancan dentro del horario y terminan afuera.** El último turno del día tiene que **entrar entero** antes del cierre, igual que con la regla semanal.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: La barbería puede crear una excepción de horario para **un barbero** y un **rango de fechas** (desde–hasta), indicando hora de apertura y de cierre.
- **FR-002**: La excepción aplica **solo** a las fechas del rango. La regla semanal del barbero no se modifica de ninguna manera.
- **FR-003**: La excepción puede marcar los días del rango como **no laborables**, sin horario.
- **FR-004**: La excepción **hereda la pausa del mediodía** de la regla semanal de ese día. *(Hoy no lo hace: la excepción reemplaza la jornada entera y la pausa se pierde. Ya pasó dos veces en producción — el 30 y el 31 de julio, un barbero con pausa de 13:00 a 16:00 quedó con el almuerzo abierto a reservas.)*
- **FR-005**: Se puede editar la pausa dentro de la excepción, incluida la opción de no tener pausa esos días.
- **FR-006**: Se puede eliminar una excepción; las fechas vuelven a la regla semanal.
- **FR-007**: Cargar una excepción sobre fechas que ya tienen una **reemplaza** la anterior en esas fechas, sin dejar dos excepciones vivas para el mismo día.
- **FR-008**: La disponibilidad pública que ve el cliente y la que valida el servidor al reservar usan **exactamente la misma** definición de jornada para esas fechas.
- **FR-009**: Antes de guardar, si hay turnos ya reservados que quedarían fuera del nuevo horario, el sistema lo avisa indicando cuáles.
- **FR-010**: La barbería puede ver la lista de excepciones vigentes de cada barbero, con sus fechas y horarios.
- **FR-011**: Guardar una excepción no altera los turnos ya reservados: ni los cancela, ni los mueve, ni les cambia la hora.

### Should Have

- **FR-101**: En la agenda del día se distingue visualmente que ese día tiene un horario distinto al habitual, con el motivo si se cargó uno.
- **FR-102**: La excepción admite una nota corta ("horas extra", "vacaciones", "feriado") visible solo para la barbería.
- **FR-103**: Se pueden elegir qué días de la semana del rango aplican, para no cargar el sábado si el rango es de lunes a viernes.

### Won't Have (out of scope)

- Excepciones para **toda la barbería** de una (por ahora se cargan barbero por barbero).
- Excepciones **recurrentes** ("todos los primeros lunes del mes").
- Que el **empleado** cargue su propia excepción desde su pantalla. La regla de horarios sigue siendo del dueño; se puede evaluar después como un permiso más del equipo.
- Cambiar la **duración de los servicios** o el intervalo de la grilla dentro de la excepción.
- Avisar automáticamente a los clientes que ya tenían turno en esos días.

## Key Entities

- **Excepción de horario**: qué barbero, qué fecha, si trabaja o no, hora de apertura, hora de cierre, pausa (opcional) y nota (opcional). Una fila por fecha: el "rango" es la forma de cargarlas, no de guardarlas. Guardar por fecha mantiene el modelo simple y hace que borrar un día del medio sea trivial.
- **Regla semanal del barbero**: lo que rige cuando esa fecha no tiene excepción. No se toca nunca al cargar una excepción.
- **Bloqueo puntual**: sigue existiendo aparte y se aplica *adentro* de la jornada, la defina la regla semanal o una excepción.

### Precedencia — qué manda sobre qué

Este es el corazón de la feature y donde nacen los bugs de horario. El orden, de más fuerte a más débil:

1. **Excepción de la fecha** — si existe, define si se trabaja, desde cuándo y hasta cuándo.
2. **Regla semanal del barbero** — rige cuando no hay excepción, y **siempre aporta la pausa** salvo que la excepción defina una propia.
3. **Horario general de la barbería** — el respaldo cuando el barbero no tiene regla propia para ese día.

Y por encima de la jornada, sin importar de dónde salga:

4. **Bloqueos puntuales** y **turnos ya tomados** tapan ratos adentro de la jornada.
5. **Lo que ya pasó** y la **anticipación mínima** sacan horarios del presente.

Cada capa hace **una** cosa. La excepción define la jornada; no cancela turnos, no mueve bloqueos, no toca la regla semanal.

## Success Criteria

- **SC-001**: Cambiar el horario de una semana puntual no modifica ninguna otra fecha — verificable comparando la agenda de la semana siguiente antes y después.
- **SC-002**: Un barbero con pausa mantiene su pausa los días con excepción — 0 turnos ofrecidos dentro de la pausa.
- **SC-003**: Cargar la excepción de una semana lleva menos de 1 minuto y no requiere volver a tocar nada cuando la semana termina.
- **SC-004**: 0 turnos ya reservados cancelados o movidos como efecto de guardar una excepción.
- **SC-005**: Lo que ve el cliente al reservar y lo que acepta el servidor coinciden en el 100% de las fechas con excepción — ningún horario que se muestre libre puede rebotar al reservar.
- **SC-006**: Eliminar la excepción devuelve la agenda exactamente al estado anterior.

## Assumptions

- **La excepción se guarda por fecha, no como rango.** El rango es la forma de cargarla. Guardar filas por día evita tener que resolver solapamientos entre rangos al calcular la agenda, que es de donde salen los bugs difíciles.
- **La pausa se hereda por defecto.** Quien carga una excepción está pensando en el horario de entrada y salida; que se le borre el almuerzo sin avisar es una sorpresa desagradable, y ya pegó en producción.
- **El rango arranca hoy o más adelante.** Cambiar el horario de un día que ya pasó no cambia nada real y sí ensucia los reportes.
- **La configura el dueño desde el panel.** El barbero que pidió las horas extra se lo pide a la barbería, que es quien maneja los horarios hoy.
- **Tope de 90 días de rango.** Suficiente para una temporada; evita cargar mil filas de un saque por un error de tipeo.
- **Todo en la hora de la barbería.** Las fechas y horas se interpretan en horario argentino, no en el del servidor ni en el del celular de quien la carga.
- **Ya existe el mecanismo por día.** Hoy se usa desde el turnero con el aviso de "extender cierre" cuando un día se desborda. Esta feature le da una puerta propia y arregla lo de la pausa; no reemplaza ese atajo.

## Dependencies

- Motor de disponibilidad — es quien aplica la precedencia; hay que enseñarle que la excepción hereda la pausa.
- Validación de reserva del servidor — tiene que ver lo mismo que el cliente para esas fechas.
- Editor de horarios del barbero — de ahí cuelga la puerta a esta pantalla.
- Agenda/turnero — muestra el día distinto y ya usa el mecanismo por día para extender el cierre.

## Clarifications

### Q1: Turnos que quedan fuera del horario nuevo

**Context**: FR-009 y FR-011. Si la excepción **acorta** la jornada (por ejemplo, "el jueves cierro a las 18" cuando había turnos a las 20), esos turnos quedan afuera del horario.

**What we need to know**: ¿Qué hace el sistema al guardar?

| Option | Answer | Implications |
| ------ | ------ | ------------ |
| A | Avisa cuáles quedan afuera y deja guardar igual. Los turnos siguen en pie y la agenda los muestra marcados como fuera de horario. | Nadie pierde un turno por error. La barbería resuelve con el cliente por WhatsApp, como hace hoy. Es lo que ya pasa cuando un turno se pasa del cierre. |
| B | Bloquea el guardado hasta que se reprogramen o cancelen esos turnos. | Imposible dejar la agenda inconsistente, pero traba a quien solo quería marcarse un día libre y tiene que ir a mover turnos primero. |
| C | Avisa y ofrece reprogramarlos ahí mismo. | Lo más completo y lo más caro: mete el flujo de reprogramación adentro de esta pantalla. |

**Suggested**: A — es coherente con cómo se comporta hoy el resto del sistema y no traba al que tiene apuro.

**Your choice**: _[pendiente]_

### Q2: Días sueltos dentro del rango

**Context**: FR-103. Un rango del lunes 14 al viernes 18 no tiene problema, pero uno del 14 al 28 se come dos domingos.

**What we need to know**: ¿La excepción aplica a **todos** los días del rango, o se eligen los días de la semana?

| Option | Answer | Implications |
| ------ | ------ | ------------ |
| A | A todos los días del rango. Los días que el barbero no trabaja según su regla semanal quedan como no laborables salvo que la excepción diga otra cosa. | Lo más simple de entender y de explicar. Para saltear un domingo hay que cargar dos rangos. |
| B | Con tildes de días de la semana (L M M J V S D) dentro del rango. | Cubre "las próximas tres semanas, solo los sábados" en una sola carga. Una pantalla más cargada. |

**Suggested**: A para el MVP, B como FR-103 si aparece la necesidad.

**Your choice**: _[pendiente]_

## Next Steps

- Responder Q1 y Q2 (o correr **speckit-clarify**).
- Correr **speckit-plan** para el diseño de implementación.
