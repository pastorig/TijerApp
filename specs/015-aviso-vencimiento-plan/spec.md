# Feature Specification: Aviso de vencimiento del plan

**Feature Branch**: `015-aviso-vencimiento-plan`
**Created**: 2026-08-19
**Status**: Draft

## Resumen

Hoy el barbero que paga se entera de que su plan venció **cuando ya se le
cortó**: abre el panel, lo encuentra en modo lectura y sus clientes ya no
pueden reservar online. No hay ningún aviso previo.

Esta feature le avisa **antes**: durante los últimos 3 días del período pago ve
un cartel en el panel con los datos para transferir, y le llegan dos
notificaciones al celular — una al entrar en esa ventana y otra el día que
vence.

## User Scenarios & Testing

### Escenario principal

1. A una barbería con el plan al día le quedan 3 días de período pago.
2. Recibe una notificación en el celular: le quedan 3 días y hay que renovar.
3. Toca la notificación y cae en el panel.
4. Arriba ve un cartel con los días que le quedan y un botón para pagar.
5. Toca el botón y ve monto, alias, CBU/CVU y titular para transferir.
6. Transfiere, avisa por WhatsApp, y el owner le registra el pago.
7. El cartel desaparece y no le llega ninguna notificación más por ese período.

### Escenario del día del vencimiento

1. La barbería no pagó y llega el día en que vence.
2. Recibe una segunda notificación avisando que hoy se le corta.
3. Si no paga, al día siguiente entra en gracia y después en modo lectura —
   el comportamiento que ya existe, sin cambios.

### Casos borde

- **Paga y vuelve a vencer el mes siguiente**: tiene que recibir los avisos de
  nuevo. El aviso se recuerda por vencimiento, no por barbería.
- **La barbería entra a la ventana con menos de 3 días** (por ejemplo, el
  aviso se activa cuando ya le quedan 2): recibe igual el primer aviso. La
  ventana es "3 días o menos", no "exactamente 3 días".
- **Nunca pagó (está en prueba)**: no recibe estos avisos. Ese caso ya lo cubre
  el cartel de prueba que existe hoy.
- **Ya vencida**: no recibe estos avisos. Ese caso ya lo cubre el cartel de
  modo lectura.
- **La barbería tiene barberos empleados**: el aviso le llega solo a quien
  administra la barbería, no a los empleados.
- **Un admin con varios dispositivos**: recibe el aviso en todos.
- **Un admin sin notificaciones activadas**: no recibe nada por el celular,
  pero ve el cartel igual al entrar al panel.
- **El cron corre cada hora**: el cartel está siempre; la notificación sale una
  sola vez por hito.

## Requirements

### Functional Requirements

- **FR-001**: Durante los últimos 3 días del período pago, el panel muestra un
  cartel que dice cuántos días quedan.
- **FR-002**: El cartel ofrece ver los datos de transferencia: monto del plan,
  alias, CBU/CVU y titular.
- **FR-003**: Se envía una notificación al celular al entrar en la ventana de
  3 días o menos.
- **FR-004**: Se envía una segunda notificación el día del vencimiento.
- **FR-005**: Cada una de esas notificaciones se envía **una sola vez por
  vencimiento**. Si el plan se renueva y vuelve a vencer, se envían de nuevo.
- **FR-006**: Las notificaciones se envían solo a quienes administran la
  barbería, en todos sus dispositivos con notificaciones activas.
- **FR-007**: Al tocar la notificación se abre el panel de esa barbería.
- **FR-008**: Las notificaciones salen únicamente entre las 10 y las 13
  (hora argentina).
- **FR-009**: Las barberías que nunca pagaron (en prueba) quedan excluidas.
- **FR-010**: Las barberías ya vencidas, en gracia o canceladas quedan
  excluidas.
- **FR-011**: Que falle el envío de una notificación no puede afectar al resto
  del proceso automático que ya corre cada hora.

### Key Entities

- **Registro de avisos**: recuerda que a una barbería ya se le envió un aviso
  determinado para un vencimiento determinado. La combinación barbería + tipo
  de aviso + fecha de vencimiento es única.

## Success Criteria

- **SC-001**: Una barbería con el plan por vencer recibe el primer aviso dentro
  del día en que entra en la ventana de 3 días.
- **SC-002**: Ninguna barbería recibe el mismo aviso dos veces para el mismo
  vencimiento, por más que el proceso automático corra 24 veces al día.
- **SC-003**: Desde la notificación, quien administra llega a los datos para
  transferir en dos toques.
- **SC-004**: Una barbería que renueva deja de ver el cartel apenas se le
  registra el pago.
- **SC-005**: Ningún barbero empleado recibe avisos de cobro.

## Assumptions

- El barbero tiene la aplicación instalada en el celular y las notificaciones
  activadas. Hoy es cierto para las barberías activas.
- El período pago vence en una fecha conocida y visible para el sistema.
- 3 días alcanzan para transferir: es el plazo que ya se usa para avisar el fin
  de la prueba.
- El aviso apunta al panel y no incluye los datos bancarios en su cuerpo: una
  notificación no se puede copiar.

## Out of Scope

- Avisos por email o WhatsApp.
- Cobro automático (débito, suscripción de MercadoPago).
- Cambiar qué pasa cuando el plan efectivamente vence.
- Avisos de fin de prueba gratis: ya existen.
