# Feature Specification: El aviso de reserva le llega a quien corresponde

**Feature Branch**: `017-push-por-barbero`
**Created**: 2026-08-25
**Status**: Draft

## Resumen

El aviso al celular cuando entra una reserva **ya existe** (feature 002). Lo que
no existe es la noción de **a quién le corresponde**: hoy se encola para todas
las notificaciones activas de la barbería, sin mirar de qué barbero es el turno.

Con una sola cuenta por barbería eso estaba bien: el dueño quiere enterarse de
todo. Con las cuentas de empleados (feature 016) deja de estarlo.

**No se nota todavía** porque el permiso de notificaciones solo se ofrece en
Configuración, que el empleado no puede abrir. Pero en cuanto se le dé el
interruptor —que es lo que se quiere hacer— recibiría un aviso por **cada turno
de la barbería**, con el nombre del cliente y el horario, incluidos los de sus
compañeros.

Esta feature hace dos cosas: **que cada aviso llegue a quien le corresponde** y,
recién entonces, **darle el interruptor al empleado**.

## User Scenarios & Testing

### Le reservan al empleado

1. Un cliente reserva un turno con Matías.
2. Le llega el aviso **a Matías**: nombre del cliente, hora y servicio.
3. Lo toca y abre **su agenda**, no el panel del dueño.

### Le reservan a otro barbero

1. Un cliente reserva con Esteban.
2. A Matías **no le llega nada**.
3. Al dueño **sí**: es su barbería.

### El empleado prende las notificaciones

1. Entra a su pantalla y activa el aviso de turnos nuevos.
2. Desde ese momento recibe los suyos.
3. Puede apagarlo cuando quiera.

### Casos borde

- **El dueño también atiende como barbero**: recibe todo, sin repetidos.
- **A alguien le quitaron el acceso**: deja de recibir avisos de inmediato,
  aunque la notificación del navegador siga activada.
- **La reserva entra cancelada o el turno se crea desde el panel**: sigue
  valiendo la regla de siempre — solo avisa lo que está activo.
- **El empleado tiene la app en dos dispositivos**: le llega a los dos.
- **Nadie con notificaciones activas**: no pasa nada, no es un error.

## Requirements

### Functional Requirements

- **FR-001**: Cuando entra una reserva, el aviso llega a quien administra la
  barbería.
- **FR-002**: Y al barbero de ese turno, si tiene acceso y notificaciones
  activas.
- **FR-003**: **A ningún otro barbero de la barbería.**
- **FR-004**: Nadie recibe dos veces el mismo aviso.
- **FR-005**: Al tocar el aviso, cada uno abre la pantalla que le corresponde:
  quien administra, el turnero; el empleado, su agenda.
- **FR-006**: El empleado puede activar y desactivar los avisos desde su propia
  pantalla.
- **FR-007**: Revocado el acceso, deja de recibir avisos aunque el permiso del
  navegador siga dado.

### Key Entities

Ninguna nueva. Se usan las que ya existen: las suscripciones de notificaciones,
quiénes administran la barbería y los accesos de empleados.

## Success Criteria

- **SC-001**: Un empleado no recibe ni un dato de un turno que no es suyo.
- **SC-002**: Quien administra sigue recibiendo todas las reservas, igual que
  hoy.
- **SC-003**: Con el aviso en la mano, el barbero llega a su turno en un toque.
- **SC-004**: Quitarle el acceso a alguien le corta los avisos sin que haga
  falta que desinstale nada.

## Assumptions

- Los avisos siguen saliendo por el mismo camino que hoy; solo cambia a quién.
- El empleado que quiere avisos tiene la app instalada. En iPhone es
  obligatorio; en Android conviene.

## Out of Scope

- Avisos de cancelación o reprogramación (hoy tampoco existen para el dueño).
- Que el empleado elija qué tipo de aviso recibir.
- Avisos al cliente final, que ya funcionan y son otro camino.
