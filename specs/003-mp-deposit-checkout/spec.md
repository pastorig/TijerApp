# Specification: Cobro de seña con MercadoPago al reservar

**Branch**: `003-mp-deposit-checkout`
**Created**: 2026-06-21
**Status**: Draft
**Input**: Flujo de cobro de seña con MercadoPago al reservar un turno (TijerApp). La base de datos y la configuración ya existen; falta todo el flujo que efectivamente cobra: crear el link de pago al reservar, recibir la confirmación del pago, confirmar el turno, y cancelar automáticamente los turnos cuya seña no se pagó a tiempo.

## Clarifications

### Session 2026-06-21

- Q: ¿Cómo llevamos al cliente a pagar tras reservar? → A: Pantalla en TijerApp con resumen del turno + monto de seña + botón "Pagar seña" que abre el checkout de MercadoPago (no redirección automática), permitiendo reintentar.
- Q: Con seña activa, ¿qué pasa con el paso de WhatsApp que hoy se abre al reservar? → A: El paso de WhatsApp se reemplaza por el de pago; el turno se confirma al pagar y el WhatsApp queda como acción posterior, no como cierre de la reserva.
- Q: ¿Retenemos el horario mientras la seña está pendiente de pago? → A: Sí, el horario queda ocupado desde que se reserva y se libera solo si la seña no se paga dentro del plazo (auto-cancelación).
- Q: ¿Avisamos al cliente que tiene la seña pendiente antes de que venza? → A: Sí, se le envía un recordatorio antes de la expiración para recuperar la reserva.

## User Scenarios & Testing

### Primary User Story

Un cliente reserva un turno en una barbería que tiene activado el cobro de seña. Al confirmar la reserva, ve cuánto debe pagar de seña y un botón para pagarla por MercadoPago. Hasta que no paga, el turno queda **reservado pero sin confirmar** y el horario queda retenido por un plazo limitado. Cuando paga, el turno se confirma automáticamente. Si no paga dentro del plazo, el turno se cancela solo y el horario se libera. El dinero va directo a la cuenta de MercadoPago de la barbería.

### Acceptance Scenarios

1. **Given** una barbería con cobro de seña activo y un servicio de $8.500 con seña del 30%, **When** un cliente reserva ese servicio, **Then** el sistema calcula una seña de $2.550, crea la reserva en estado "pendiente de pago" y le muestra al cliente el monto y un botón para pagar por MercadoPago.

2. **Given** una reserva pendiente de pago, **When** el cliente completa el pago en MercadoPago y este lo aprueba, **Then** el turno pasa a confirmado, queda registrado el pago, y tanto el cliente como el barbero ven el turno como "seña pagada".

3. **Given** una reserva pendiente de pago con plazo de 24 horas, **When** pasan 24 horas sin que el cliente pague, **Then** el turno se cancela automáticamente, el horario vuelve a estar disponible y el estado queda como "seña expirada".

4. **Given** una barbería **sin** cobro de seña activo, **When** un cliente reserva, **Then** el flujo es exactamente el actual (reserva + WhatsApp), sin pedir ningún pago.

5. **Given** una barbería con cobro de seña activo donde la seña calculada por porcentaje ($2.550) queda por debajo del mínimo configurado ($3.000), **When** el cliente reserva, **Then** se cobra el mínimo ($3.000).

6. **Given** un pago rechazado por MercadoPago, **When** el cliente vuelve a la app, **Then** el turno sigue pendiente de pago y el cliente puede reintentar el pago con el mismo link mientras no haya vencido el plazo.

### Edge Cases

- **Slot tomado mientras se paga**: el horario queda retenido para la reserva pendiente desde el momento en que se crea, así que ningún otro cliente puede tomar ese mismo horario durante el plazo de pago.
- **Webhook duplicado o demorado**: si MercadoPago notifica el mismo pago más de una vez, el turno se confirma una sola vez (operación idempotente); si la confirmación tarda, el cliente ve "estamos confirmando tu pago".
- **Cliente paga justo cuando expira**: si el pago se aprueba después de que el turno ya fue auto-cancelado, el sistema no lo confirma como si nada — registra el caso para que el barbero lo resuelva (y eventualmente devuelva la seña), evitando confirmar un turno sobre un horario ya liberado y posiblemente reocupado.
- **Barbería con MP activado pero token inválido/vencido**: si no se puede crear el link de pago, la reserva no debe perderse silenciosamente; el cliente recibe un mensaje claro y el barbero queda al tanto.
- **Turno creado por el barbero desde el panel** (manual / fuera de horario): no se cobra seña; entra confirmado como hoy.
- **Reembolsos**: la devolución de la seña se hace manualmente desde MercadoPago por el barbero (fuera del alcance automático de esta feature).

## Functional Requirements

### Must Have (MVP)

- **FR-001**: Cuando una barbería tiene el cobro de seña activo, al crear una reserva pública el sistema DEBE calcular el monto de la seña como el porcentaje configurado sobre el precio del servicio, aplicando el monto mínimo configurado si el porcentaje queda por debajo.
- **FR-002**: El sistema DEBE generar un link de pago de MercadoPago asociado a la reserva, usando las credenciales de la **propia barbería** (el dinero va a su cuenta, no a una cuenta central de TijerApp).
- **FR-003**: Una reserva con seña pendiente DEBE quedar en estado "pendiente de pago", reteniendo el horario, con un plazo de vencimiento igual a las horas configuradas por la barbería.
- **FR-004**: Tras reservar, el cliente DEBE ver una pantalla en TijerApp con el resumen del turno, el monto de la seña y un botón "Pagar seña" que abre el checkout de MercadoPago (sin redirección automática). El mismo acceso al pago DEBE estar disponible más tarde desde la pantalla de detalle de su turno mientras la seña siga pendiente y no haya vencido, permitiendo reintentar el pago.
- **FR-004b**: Cuando la barbería tiene seña activa, el paso de WhatsApp que hoy cierra la reserva DEBE quedar reemplazado por el paso de pago: la reserva se "cierra" al pagar la seña (que confirma el turno), y el contacto por WhatsApp pasa a ser una acción posterior y opcional, no el cierre del flujo.
- **FR-005**: El sistema DEBE recibir y procesar las notificaciones de pago de MercadoPago y, ante un pago aprobado, marcar la seña como pagada, registrar el pago y confirmar el turno automáticamente.
- **FR-006**: El procesamiento de notificaciones de pago DEBE ser idempotente: notificaciones repetidas del mismo pago no deben confirmar el turno ni registrar el pago más de una vez.
- **FR-007**: El sistema DEBE validar cada notificación consultando el estado real del pago contra MercadoPago antes de confirmar el turno (no confiar ciegamente en el contenido de la notificación).
- **FR-008**: El sistema DEBE cancelar automáticamente las reservas cuya seña siga pendiente una vez vencido el plazo, liberando el horario y dejando el estado como "expirada".
- **FR-009**: El estado de la seña (pendiente / pagada / expirada) DEBE ser visible para el barbero en el turnero/panel de cada turno.
- **FR-010**: Cuando una barbería NO tiene el cobro de seña activo, el flujo de reserva DEBE comportarse exactamente como hoy (sin cálculo de seña, sin link de pago, sin retención condicionada a pago).
- **FR-011**: Cada evento relevante del ciclo de pago (link creado, notificación recibida, pago aprobado/rechazado, expiración automática) DEBE quedar registrado para auditoría y soporte.
- **FR-012**: Si no se puede generar el link de pago de una barbería con seña activa (p. ej. credenciales inválidas), el sistema DEBE informar el problema de forma clara al cliente y no dejar el turno en un estado ambiguo.
- **FR-013**: Mientras la seña siga pendiente, el sistema DEBE enviar al cliente un recordatorio de pago antes de que venza el plazo, con el acceso al pago, para reducir las reservas perdidas por falta de pago.

### Should Have

- **FR-101**: El cliente DEBE recibir confirmación visual clara al volver del pago (éxito / pendiente / rechazo).
- **FR-102**: El barbero DEBERÍA poder distinguir en el panel los turnos retenidos por seña pendiente de los confirmados, para entender por qué un horario está ocupado.
- **FR-103**: El sistema DEBERÍA contemplar el caso de un pago aprobado tardío sobre un turno ya expirado, marcándolo para resolución manual en lugar de confirmarlo automáticamente.

### Won't Have (out of scope)

- Devolución/reembolso automático de la seña (se hace manual desde MercadoPago).
- Cobro del total del servicio (solo se cobra la seña parcial).
- Cobro de seña en turnos creados manualmente por el barbero desde el panel.
- Otros medios de pago distintos de MercadoPago.
- Split de comisión hacia TijerApp (el 100% del pago va a la barbería).

## Key Entities

- **Reserva (turno)**: además de sus datos actuales, lleva el estado y monto de la seña, el plazo de vencimiento del pago, la fecha de pago y los identificadores de pago/preferencia de MercadoPago. (Columnas ya existentes en la base.)
- **Configuración de cobro de la barbería**: activación del cobro, credenciales de MercadoPago de la barbería, porcentaje de seña, monto mínimo y horas hasta auto-cancelación. (Ya existente.)
- **Evento de pago**: registro de auditoría de cada paso del ciclo (creación de link, notificación, aprobación, rechazo, expiración) asociado a una reserva. (Tabla ya existente.)

## Success Criteria

- **SC-001**: En una barbería con seña activa, el 100% de las reservas públicas generan un monto de seña correcto (porcentaje o mínimo, el mayor) y un link de pago funcional.
- **SC-002**: Un pago de prueba aprobado confirma el turno automáticamente en menos de 1 minuto desde que MercadoPago lo aprueba.
- **SC-003**: El 100% de las reservas con seña impaga quedan canceladas y con el horario liberado una vez vencido el plazo configurado.
- **SC-004**: Notificaciones de pago repetidas no producen turnos confirmados duplicados ni registros de pago duplicados (0 duplicados).
- **SC-005**: En una barbería sin seña activa, el flujo de reserva no muestra ningún paso de pago y se comporta igual que antes de esta feature.
- **SC-006**: El barbero puede ver, para cualquier turno, si la seña está pendiente, pagada o expirada.

## Assumptions

- **Retención del horario durante el pago**: el horario se retiene desde que se crea la reserva pendiente (estándar en reservas con seña), evitando doble reserva; el riesgo de "retenciones impagas" se acota con el plazo de auto-cancelación configurable.
- **La seña aplica a todos los servicios** de la barbería cuando el cobro está activo (no hay exención por servicio en esta versión).
- **El cobro de seña reemplaza al auto-confirmar**: si una barbería tiene seña activa, el turno se confirma al pagar (no por la opción de auto-confirmación).
- **Turnos creados por el barbero** (panel, manual, fuera de horario) no cobran seña y entran confirmados.
- **La URL pública para recibir notificaciones** es el deploy de la app (no requiere dominio propio).
- **Pruebas con credenciales de TEST/sandbox** de MercadoPago y tarjetas de prueba antes de usar credenciales reales.
- **El cliente paga desde el checkout de MercadoPago** (no se ingresan datos de tarjeta dentro de TijerApp).

## Dependencies

- Cuenta de MercadoPago por barbería con credenciales válidas (Access Token / Public Key), ya configurables en el panel de cobros.
- Esquema de base de datos de seña ya aplicado (migración `20260607210000_mercadopago_deposits.sql`): columnas de seña en turnos, configuración MP en barbería, tabla `payment_events`, índices y RLS.
- Plataforma de tareas programadas para la auto-cancelación (mecanismo de cron ya usado por los recordatorios).
- Disponibilidad pública del endpoint de notificaciones (deploy en producción).

## Next Steps

- Run **speckit-clarify** para resolver los puntos finos (retención de horario, mensajes al cliente, manejo de pago tardío).
- Run **speckit-plan** para diseñar la implementación.
