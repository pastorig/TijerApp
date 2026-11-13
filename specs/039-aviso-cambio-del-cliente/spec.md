# Specification: Aviso al barbero cuando el cliente cancela o cambia el horario

**Branch**: main (cambio chico, sin migración)
**Created**: 2026-11-12
**Status**: En producción.
**Input**: audio de un barbero a Bautista (12/11/2026): "muchos me lo reagendan y no me llegan
notificaciones ni de que me lo cancelaron ni de que me lo reagendaron… si es un mensaje de
WhatsApp mejor, así me llega como cuando reservan".

## Antes

| El cliente, desde el link de su turno… | Aviso al barbero |
|---|---|
| reserva | WhatsApp con los datos (lo manda el cliente) + push |
| cancela | solo push, y solo si el barbero tiene las notificaciones activadas |
| cambia el horario | **nada** |

Las suscripciones push se vencen solas, así que en la práctica el barbero se enteraba al mirar
la agenda.

## Qué cambia

1. **Al cancelar** desde el link, se abre WhatsApp en el celular del cliente con el mensaje listo:
   quién es, que canceló, qué día y hora era, servicio y barbero.
2. **Al cambiar el horario**, lo mismo, con el horario de antes y el de ahora.
3. Si el navegador no deja abrir WhatsApp solo, queda un botón dorado "Avisale a {barbería} por
   WhatsApp" con el mismo mensaje.
4. **Reagendar ahora también manda el aviso al celular** del barbero del turno y de quien
   administra ("Turno reagendado · Juan lo pasó a jue 19/11 10:00"), como ya hacía cancelar.

El WhatsApp va al barbero del turno si tiene número propio, si no al de la barbería: la misma
regla que la reserva. Sin ningún número válido no se abre nada.

## Fuera de alcance

- Mandar el WhatsApp sin que el cliente lo envíe (no hay API de WhatsApp).
- Avisos cuando el que cambia el turno es el dueño o el empleado: ahí ya se le avisa al cliente.

## Dónde está

- `src/lib/aviso-cambio-cliente.ts` (a quién, el mensaje y el link) + `scripts/test-aviso-cambio.ts`.
- `src/app/r/[token]/AppointmentActionPanel.tsx` y `AppointmentRescheduleDrawer.tsx`: la
  pestaña se pide en el click, antes de esperar al servidor (`pending-tab.ts`).
- `src/app/api/appointments/reschedule/route.ts`: el push con `enqueue_admin_push`.
