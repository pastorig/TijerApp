# Feature Specification: El empleado mueve un turno suyo

**Feature Branch**: `024-empleado-reprogramar`
**Created**: 2026-08-26
**Status**: Draft

## Resumen

La última capacidad de la lista de la auditoría. Hasta ahora el empleado solo
podía **cancelar** un turno y pedirle al cliente que reserve de nuevo: una
molestia para el cliente y un turno menos para la barbería, cuando lo único que
hacía falta era correrlo dos horas.

## Por qué ésta se pensó distinto que las otras seis

Las anteriores afectan **su agenda**. Ésta afecta al **cliente**: alguien que
reservó a las 15 y aparece a las 15 porque nadie le avisó que ahora es a las 17.

**Mover un turno en silencio es peor que no moverlo.** Toda la feature está
armada alrededor de eso.

### El aviso no es opcional y no depende del empleado

El mail lo manda **el servidor**, apenas el turno se movió, con la misma
plantilla que usa el panel del dueño.

En particular lo manda **aunque el empleado no tenga permiso de ver el teléfono
del cliente**. Ese permiso decide si *él* puede escribirle, no si al cliente se
le avisa — son dos cosas distintas y confundirlas dejaría clientes sin enterarse
por una configuración que hablaba de otra cosa.

### Y cuando no se puede avisar, se dice

Si el cliente no dejó mail, el modal **no se cierra**: muestra en amarillo que
nadie le avisó y le pone el WhatsApp adelante. Cerrarle la ventana con un
"listo" sería dejarlo creer que está resuelto.

Si tampoco dejó teléfono, se lo dice igual. No hay nada que hacer desde la app,
pero el barbero se entera hoy y no el día del turno.

### El barbero no cambia

A diferencia del drag & drop del dueño, el empleado **no puede pasarle el turno
a un compañero**. Mover dentro de su agenda es lo suyo; decidir sobre la agenda
de otro, no.

## User Scenarios & Testing

### El cliente dejó mail

1. El barbero toca **Mover** en un turno, pone la hora nueva y confirma.
2. El modal le dice que le avisaron por mail.
3. El turno aparece en el horario nuevo.

### El cliente no dejó mail

1. Igual, pero el modal avisa en amarillo que **al cliente no le llegó nada**.
2. Le ofrece **Avisarle por WhatsApp**, con el mensaje ya armado.

### Casos borde

- **Choca con otro turno suyo**: 409 con texto entendible, y no se mueve nada.
- **Al mismo día y hora**: se rechaza, no se manda un mail que dice que cambió
  algo que no cambió.
- **Turno cancelado**: no se puede mover.
- **De otro barbero**: 404, sin decir si existe.
- **Plan vencido** o **sin el permiso**: se rechaza.

## Requisitos

### Funcionales

- **FR-001** Séptimo permiso `reprogramar`, default `true`, editable en Equipo.
- **FR-002** `PATCH /api/staff/appointment-reschedule` mueve día y hora de un
  turno **suyo**. El `barber_id` sale del token y **no se puede cambiar**.
- **FR-003** Al mover, el servidor manda el mail al cliente. El envío no
  depende del permiso de contacto del empleado.
- **FR-004** La respuesta dice si el mail salió y, **solo si tiene el permiso
  de contacto**, devuelve el teléfono para el WhatsApp.
- **FR-005** El modal muestra el resultado del aviso en vez de cerrarse.
- **FR-006** Choque de horario → 409. Mismo día y hora → 400.
- **FR-007** Queda registrado quién lo movió, como en confirmar y cancelar.

### No funcionales

- **NFR-001** Migración aditiva.
- **NFR-002** **El mail se comparte con el panel del dueño**, no se copia: son
  150 líneas de plantilla HTML con la marca de la barbería, y dos copias harían
  que el cliente reciba un mail distinto según quién movió el turno.
- **NFR-003** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Pasarle el turno a otro barbero.
- Elegir el horario nuevo de una lista de libres: se escribe, y el índice único
  frena el choque. Igual que el resto de la app.
