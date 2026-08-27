# Feature Specification: Al cliente se le avisa cuando le cancelan el turno

**Feature Branch**: `026-aviso-de-cancelacion`
**Created**: 2026-08-26
**Status**: Draft

## Resumen

Cierra el hallazgo 07 de la auditoría, que quedaba abierto por ser "una
discusión de producto". La discusión se resolvió sola cuando la feature 024
hizo que **mover** un turno avise al cliente: quedó una barbería que avisa
cuando corre un turno y se calla cuando lo elimina, que es al revés de lo que
importa.

## Una corrección a la auditoría

La auditoría decía que al cancelar **no se le avisa a nadie**. Es inexacto:
existe un **push** al cliente desde la feature del turnero. Lo que pasa es que
solo le llega a quien activó notificaciones desde su link de reserva —los
menos—, y **no hay mail**. Además, el push lo disparaba **únicamente el panel
del dueño**: el empleado cancelaba y el cliente no se enteraba por ningún lado.

## Cuándo se avisa y cuándo no

Un mail que dice "cancelamos tu turno" mandado en el momento equivocado es peor
que no mandar nada. Tres silencios, y son a propósito:

1. **El turno ya pasó.** Avisar de un turno de ayer no sirve para nada.
2. **No vino.** Es el peor momento para un automático: el cliente ya quedó mal
   y el mail se lee como el remate.
3. **Avisó el cliente.** Lo pidió él; contárselo es ruido.

Fuera de esos tres, el cliente **tiene que enterarse**: lo canceló la barbería
y si nadie le dice, se presenta.

La regla vive en `debeAvisarCancelacion`, pura y con 14 tests. **Solo gobierna
el mail**: el push se dejó como estaba, porque cambiarle la conducta a algo que
ya venía funcionando no era parte de esto.

## User Scenarios & Testing

### El barbero cancela un turno de mañana

1. Cancela y elige el motivo.
2. Al cliente le llega un mail: qué turno era y cómo reprogramar.
3. En pantalla dice **"Le avisamos por mail al cliente"**.

### El cliente no dejó mail

1. Igual, pero la pantalla avisa: **"El cliente no se enteró: avisale vos, o va
   a venir igual"**.

### El que no vino

1. El barbero cancela con "Cliente no vino".
2. **No se manda nada** y la pantalla no dice nada: acá el silencio es correcto
   y un cartel sería ruido.

### Casos borde

- **Justo la hora del turno**: cuenta como pasado. El cliente ya está en la
  puerta y el mail no llega a tiempo de servir.
- **Sin `RESEND_API_KEY`**: no se manda, y se avisa como si no tuviera mail.
- **Plan vencido**: no se puede cancelar, así que no hay nada que avisar.

## Requisitos

### Funcionales

- **FR-001** Al cancelar, el servidor le manda un mail al cliente, salvo en los
  tres silencios.
- **FR-002** Vale para los dos caminos: el panel del dueño y la agenda del
  empleado.
- **FR-003** El empleado ahora dispara **también el push**, que antes solo
  mandaba el dueño.
- **FR-004** Las dos pantallas dicen si el cliente se enteró, y cuando no, lo
  dicen fuerte.
- **FR-005** Nada de esto puede hacer fallar la cancelación: el turno ya está
  cancelado cuando el aviso corre.

### No funcionales

- **NFR-001** Sin migración: no hay dato nuevo.
- **NFR-002** El mail y el push se **comparten** entre los dos caminos.
- **NFR-003** La regla de cuándo avisar es pura y testeada.
- **NFR-004** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Cambiar cuándo sale el **push**. Hoy sale siempre y así queda.
- Avisarle al cliente que cancela él mismo desde su link: ya lo sabe.
