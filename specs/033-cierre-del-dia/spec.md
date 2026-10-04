# Specification: Cierre automático del día y pedido de reseña

**Branch**: `033-cierre-del-dia`
**Created**: 2026-10-04
**Status**: Draft
**Input**: "que se marquen atendido solos, arrancá con el 1 y 2" (Bautista, 4/10/2026), a partir de los números de uso de los últimos 30 días.

## Contexto

Un turno nace **pendiente** y pasa a **confirmado** cuando el barbero toca "Confirmar".
Recién ahí cuenta: como visita del cliente, como sello de fidelización, en los reportes y
en el cierre de caja. La app le pide al barbero ese toque turno por turno.

El barbero que más usa TijerApp no lo hace. Números del 4/10/2026, sobre la base real:

- **233 turnos ya pasados siguen "pendientes"** en todo el historial; 216 son de una sola
  barbería, la que más turnos tiene (198 en los últimos 30 días, 78 confirmados).
- Para esa barbería, la mitad de lo que trabajó no figura como trabajado: sus clientes
  frecuentes aparecen con menos visitas de las reales y sus reportes muestran menos de lo
  que facturó.
- **Cero reseñas en toda la plataforma.** La reseña existe —formulario público, se muestra
  en la página de la barbería—, pero hay que pedirla a mano: un botón de WhatsApp, turno
  por turno. Nadie lo toca.

Los dos problemas son el mismo: la app depende de un toque manual que en un día de trabajo
no ocurre. Esta spec saca esos dos toques.

## User Scenarios & Testing

### Primary User Story

El barbero trabaja todo el día sin tocar "Confirmar" en ningún turno. A la mañana siguiente
abre el panel y los turnos de ayer figuran como atendidos: sus visitas, sus reportes y su
cierre de caja están completos. Si alguno no vino, lo marca como "no vino" y listo. Los
clientes que dejaron su mail reciben, esa misma mañana, un mensaje corto que les pregunta
cómo les fue, con un toque para dejar la reseña.

### Acceptance Scenarios

1. **Given** un turno pendiente del 3/10 que nadie confirmó, **When** empieza el 4/10
   (hora argentina), **Then** el turno pasa a confirmado solo, y queda registrado que lo
   cerró el sistema y no una persona.
2. **Given** ese turno cerrado por el sistema, **When** el dueño abre Clientes, Reportes o
   Cierre de caja del 3/10, **Then** el turno cuenta igual que uno confirmado a mano.
3. **Given** un turno pendiente del 3/10 marcado "Cliente no vino" antes del cierre,
   **When** corre el cierre, **Then** ese turno no se toca.
4. **Given** un turno cerrado por el sistema, **When** el barbero se da cuenta al otro día
   de que el cliente no vino, **Then** puede cancelarlo con el motivo "Cliente no vino"
   igual que hoy, y deja de contar.
5. **Given** un turno con seña pedida y sin pagar, **When** corre el cierre, **Then** el
   cierre no lo confirma: ese turno lo resuelve el vencimiento de la seña, como hoy.
6. **Given** un turno cerrado por el sistema, **When** el cliente mira su casilla o su
   celular, **Then** NO recibió ningún aviso de "tu turno fue confirmado".
7. **Given** un turno atendido ayer cuyo cliente dejó mail, **When** son entre las 10 y
   las 13 del día siguiente, **Then** el cliente recibe un mail con el nombre de la
   barbería y un botón que abre el formulario de reseña.
8. **Given** ese mismo cliente, que vuelve a la semana, **When** se atiende de nuevo,
   **Then** no recibe otro pedido de reseña (uno cada 90 días por barbería, como mucho).
9. **Given** un turno de ayer cancelado o marcado "no vino" antes de las 10, **When**
   llega la ventana de envío, **Then** no se le pide reseña.
10. **Given** el envío del mail falla, **When** corre la siguiente pasada dentro de la
    ventana, **Then** se reintenta; fuera de la ventana no se manda tarde.
11. **Given** la primera vez que corre el cierre, **When** encuentra los 233 pendientes
    viejos, **Then** los cierra a todos y a ninguno de esos se le pide reseña.

### Edge Cases

- **Turno del día de hoy:** no se cierra hasta que el día termina, aunque ya haya pasado
  su hora. El barbero tiene el día entero para marcar un "no vino".
- **Barbería con el plan vencido (modo lectura):** el cierre igual corre —es el sistema
  ordenando datos, no el barbero escribiendo—, pero no se mandan pedidos de reseña.
- **Cliente sin mail:** el turno se cierra igual; no hay pedido de reseña.
- **Cliente que ya dejó reseña de ese turno** (se la pidieron a mano por WhatsApp): no
  se le manda el mail.
- **Dos pasadas a la vez o una pasada repetida:** ningún turno se cierra dos veces y
  ningún cliente recibe dos mails por el mismo turno.
- **La migración todavía no se corrió:** el cierre funciona; los pedidos de reseña no
  salen (y no salen de a decenas por hora: sin poder anotar el envío, no se envía).
- **Turno eliminado:** no se toca.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: El sistema MUST pasar a confirmado, sin intervención de nadie, todo turno
  pendiente cuya fecha ya terminó en hora argentina.
- **FR-002**: El cierre MUST excluir los turnos con seña pedida y no pagada, los
  cancelados y los eliminados.
- **FR-003**: Un turno cerrado por el sistema MUST quedar identificado como tal (quién lo
  confirmó: "Cierre automático"; cuándo), distinguible de uno confirmado por una persona.
- **FR-004**: El cierre MUST NOT mandarle ningún aviso al cliente ni al barbero.
- **FR-005**: Un turno cerrado por el sistema MUST contar igual que uno confirmado a mano
  en visitas, fidelización, reportes y cierre de caja, sin cambios en esas pantallas.
- **FR-006**: El barbero MUST poder cancelar después un turno cerrado por el sistema con
  el motivo "Cliente no vino", con el flujo de hoy.
- **FR-007**: El sistema MUST mandar un pedido de reseña por mail a cada cliente con mail
  cuyo turno de AYER quedó confirmado, entre las 10 y las 13 (hora argentina).
- **FR-008**: El pedido de reseña MUST mandarse una sola vez por turno, y como mucho una
  vez cada 90 días por cliente y barbería.
- **FR-009**: El pedido de reseña MUST NOT mandarse si el turno ya tiene reseña, si la
  barbería está en modo lectura, o si no se puede registrar el envío.
- **FR-010**: El mail MUST nombrar la barbería, llevar un único botón al formulario de
  reseña que ya existe, y no verse colapsado en Gmail cuando llega más de uno.
- **FR-011**: El cierre y los pedidos de reseña MUST poder correrse en modo de prueba que
  informa qué haría sin cambiar nada ni mandar nada.

### Should Have

- **FR-101**: En el panel, donde hoy se muestra quién confirmó un turno, los cerrados por
  el sistema dicen "Cierre automático".

### Won't Have (out of scope)

- Un botón "Cerrar el día" manual (se eligió el cierre automático).
- Marcar "no vino" automáticamente: eso lo sabe solo el barbero.
- Pedir la reseña por WhatsApp o por push; el botón manual de WhatsApp queda como está.
- Un interruptor por barbería para apagar el cierre o los pedidos de reseña.
- Cambiar el estado "confirmado" por uno nuevo "atendido": se reusa el que ya hay.

## Key Entities

- **Turno** (existente): estado, fecha, quién lo confirmó y cuándo, mail del cliente,
  seña.
- **Registro de avisos enviados** (existente): un renglón por turno, tipo de aviso y
  canal. Se le suma el tipo "pedido de reseña".
- **Reseña** (existente): una por turno.

## Success Criteria

- **SC-001**: Al día siguiente de salir a producción, no queda ningún turno pendiente con
  fecha pasada (salvo los de seña impaga).
- **SC-002**: En la barbería con más turnos, las visitas contadas de los últimos 30 días
  pasan de 78 a las ~195 reales.
- **SC-003**: Ningún cliente recibe un aviso por el cierre, y ningún cliente recibe dos
  pedidos de reseña por el mismo turno (verificable en el registro de envíos).
- **SC-004**: A los 30 días hay reseñas en la plataforma (hoy: cero). Con ~3 clientes con
  mail por día en la barbería más activa, se espera una primera tanda de pedidos en la
  primera semana.
- **SC-005**: Cero regresiones: tests unitarios en verde, y el cierre de caja y los
  reportes de un día ya cerrado dan lo mismo antes y después.

## Assumptions

- **"Cuando el día termina" es la medianoche de Argentina.** Cerrar a la hora del último
  turno más un rato sería más fino, pero le sacaría al barbero la tarde para marcar un
  "no vino". El cierre corre en la primera pasada después de las 00:00.
- **Se reusa "confirmado"** en vez de crear el estado "atendido": todo el producto ya
  trata un confirmado con fecha pasada como visita. Un estado nuevo tocaría cada pantalla
  y cada reporte para no cambiar ningún número.
- **Los 233 pendientes viejos se cierran todos.** Son trabajo hecho que no figura. No hay
  ningún programa de fidelización activo hoy, así que no se otorgan sellos de golpe.
- **El pedido de reseña sale a la mañana siguiente (10 a 13)** y no la misma noche: le
  deja al barbero tiempo para marcar un "no vino" y llega a una hora en que se lee.
- **90 días entre pedidos al mismo cliente**: un cliente que viene cada dos semanas no
  tiene que recibir un mail después de cada corte.
- **Se asume el riesgo** de pedirle reseña a alguien que no vino y que el barbero no
  marcó. El mail está redactado para no afirmar que estuvo.

## Dependencies

- Una migración chica (la corre Bautista): suma el tipo "pedido de reseña" al registro de
  avisos. El cierre no depende de ella.
- El cron por GitHub Actions que ya dispara recordatorios y señas (mismos secretos).
- El envío propio por Resend con cabecera única por mail (ya usado en recuperar
  contraseña).
