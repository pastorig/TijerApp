# Feature Specification: El empleado bloquea un horario suyo

**Feature Branch**: `023-empleado-bloquear-horario`
**Created**: 2026-08-26
**Status**: Draft

## Resumen

Se va antes, tiene el médico, se toma el franco. Hoy el empleado **no tiene
cómo decirlo**: su horario sigue figurando libre y le siguen entrando reservas
online para un rato en el que no va a estar.

El resultado no es un hueco de comodidad, es un cliente que llega a una
barbería donde no lo espera nadie. Y la única salida actual es pedirle al dueño
que lo bloquee por él.

Es la última capacidad de la lista de la auditoría que quedaba sin hacer.

## Lo que ya existe y lo que falta

`barber_time_blocks` existe desde antes y la disponibilidad ya lo respeta: un
horario bloqueado desaparece de la reserva pública. El dueño los crea desde su
turnero y los ve en Horarios.

Lo que falta es que el empleado **pueda crear el suyo**. Y como todo lo suyo,
tiene que pasar por el servidor: RLS lo frena si intenta escribir directo.

## La sexta casilla, y por qué ésta se pensó distinto

Se suma **"Bloquear horarios"**.

Las anteriores fueron fáciles de justificar en `true`. Ésta merece más cuidado,
porque es la primera que **saca disponibilidad** en vez de agregarla: un barbero
podría tapar su semana y la barbería dejaría de recibir reservas para él.

Arranca prendida igual, por dos razones:

1. **Mejora lo que pasa hoy.** Hoy el barbero que se va antes no bloquea nada:
   simplemente no está cuando el cliente llega. Que la app lo sepa es mejor que
   la app creyendo que está.
2. **No es invisible.** El bloqueo se ve en su propia agenda y el dueño lo ve
   en Horarios, con nombre y motivo.

Y si un dueño prefiere decidirlo él, destilda la casilla.

## User Scenarios & Testing

### Se va antes

1. El barbero abre su agenda y toca **Bloquear horario**.
2. Pone de 17:00 a 20:00 y el motivo "Me voy antes".
3. En su agenda aparece la franja bloqueada.
4. La reserva online deja de ofrecer esos horarios con él.

### Se equivocó

1. Toca el bloqueo que cargó y lo saca.
2. Los horarios vuelven a estar disponibles.
3. **Solo puede sacar los suyos.** Un bloqueo de otro barbero no se le ofrece
   ni lo acepta el servidor.

### Ya tenía turnos en ese rango

1. Bloquea de 17 a 20 y tenía un turno a las 18.
2. Se crea igual, **pero se le avisa**: "tenés 1 turno en ese rango y sigue en
   pie".
3. Bloquear no cancela turnos. Si quiere sacarlo, lo cancela él.

### Casos borde

- **Fin antes que inicio**: se rechaza.
- **Rango de duración cero**: se rechaza.
- **Plan vencido**: no puede, como cualquier escritura.
- **Sin el permiso**: no aparece el botón y el endpoint rechaza.

## Requisitos

### Funcionales

- **FR-001** Sexto permiso `bloquearHorario`, default `true`, editable en Equipo.
- **FR-002** `POST /api/staff/time-block`: crea un bloqueo para **su** barbero.
  El `barber_id` sale del token.
- **FR-003** `DELETE /api/staff/time-block`: baja lógica, y **solo de un bloqueo
  propio**. Un id de otro barbero devuelve 404, sin decir si existe.
- **FR-004** `/api/staff/agenda` devuelve los bloqueos del día, para que los vea
  donde los creó.
- **FR-005** Se valida que el rango tenga sentido: formato, y fin después de
  inicio.
- **FR-006** Al crear se informa **cuántos turnos activos quedan dentro del
  rango**. Bloquear no los cancela.
- **FR-007** Respeta el modo lectura y el permiso.

### No funcionales

- **NFR-001** Migración aditiva.
- **NFR-002** La validación del rango es una función pura, con tests: es una
  comparación de horarios y ahí es donde se cuelan los errores de borde.
- **NFR-003** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Bloqueos que se repiten (todos los martes). Hoy tampoco los tiene el dueño.
- Que bloquear cancele o reprograme los turnos de adentro. Se avisa y listo:
  cancelar un turno de un cliente es una decisión, no un efecto secundario.
- Cambiar el horario semanal del barbero. Eso es Horarios, del dueño.
