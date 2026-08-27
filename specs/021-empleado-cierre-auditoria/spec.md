# Feature Specification: Los tres hallazgos chicos que cierran la sección del empleado

**Feature Branch**: `021-empleado-cierre-auditoria`
**Created**: 2026-08-25
**Status**: Draft

## Resumen

Hallazgos 03, 04 y 05 de la auditoría del 25/08. Los tres son chicos y ninguno
cambia cómo se usa la app; los tres tapan un agujero que hoy no se ve.

### 03 · Se guarda quién canceló y nadie lo muestra

`status_changed_by` y `status_changed_at` se escriben desde la feature 016 con
un motivo declarado: *"con empleados, el dueño va a querer saber quién canceló
qué"*. **Ninguna pantalla los lee.** El dato entra a la base y muere ahí.

### 04 · El barbero no ve si el cliente pagó la seña

El dueño tiene el chip *Seña pendiente / pagada / vencida* en su turnero. El
empleado no — y es el que recibe al cliente en la puerta. Lo llamativo: el
endpoint **ya trae `deposit_status`** y la pantalla lo descarta.

### 05 · Un barbero pausado conserva el acceso

`resolveStaffAccess` chequea que el barbero exista, pero no mira `is_active` ni
`deleted_at`. Un barbero que el dueño pausó —licencia, se fue— sigue entrando a
su agenda hasta que alguien se acuerde de revocarle el acceso a mano.

### 🔴 Y uno que apareció implementando: el motivo nunca llegaba a la pantalla

Al conectar el hallazgo 03 salió algo que la auditoría no vio.
`APPOINTMENT_SELECT` —las columnas que el panel pide de cada turno— **no
incluía `cancellation_reason`**. O sea:

- El bloque "Motivo" que el turnero tiene escrito **no se dibujaba nunca**.
- La detección de clientes ghost, que sale de ese campo, **daba siempre falso**.

Y no es teórico: en la base, **Leo Cuts marcó 2 turnos como "Cliente no vino"**
y nunca los vio marcados. Es el único hallazgo de toda la auditoría que ya
estaba afectando a un cliente que paga.

Una columna que falta en un select no rompe nada visible: llega `undefined` y
cada pantalla se comporta como si el dato no existiera. Por eso pasó dos meses
sin que nadie lo notara.

## La corrección a la auditoría

La auditoría decía que el hallazgo 03 salía **sin migración** porque "el dato ya
está". Es verdad a medias: está el `user_id`, pero no el nombre, y el dueño **no
puede leer `barber_staff_access` desde el navegador** — su RLS deja ver solo la
propia fila. Resolver el nombre pediría o un pedido extra a la API en la
pantalla más caliente del panel, o adivinarlo del barbero del turno.

Se elige lo tercero: **guardar el nombre en el momento del cambio**. Es lo que
hace cualquier registro de auditoría, no necesita join, y sigue diciendo la
verdad si mañana ese empleado se borra.

## User Scenarios & Testing

### El dueño ve quién canceló

1. Un empleado cancela un turno con motivo "Cliente no vino".
2. El dueño abre su turnero y ve el turno cancelado, el motivo, y debajo
   **"Cancelado por Matías Rojas"** con la fecha y la hora.
3. En los turnos que canceló él mismo no aparece esa línea: no hay nada que
   aclarar.

### El barbero ve la seña

1. La barbería cobra seña y un cliente reservó sin pagarla todavía.
2. El barbero abre su agenda y ve el chip **Seña pendiente** en ese turno.
3. Cuando el cliente paga, pasa a **Seña pagada** — el mismo chip que ve el
   dueño, con los mismos colores.

### El dueño pausa a un barbero

1. Lo pone en pausa desde Barberos.
2. El barbero **deja de entrar en el momento**, con el mismo mensaje que si le
   hubieran revocado el acceso.
3. Cuando lo reactiva, vuelve a entrar. **El acceso nunca se borró.**

### Casos borde

- **Barbería sin seña**: no aparece ningún chip, igual que hoy.
- **Turno cancelado por el dueño**: sin autor, no se muestra la línea.
- **Empleado borrado después de cancelar**: el nombre guardado sigue ahí.

## Requisitos

### Funcionales

- **FR-001** Migración aditiva: `status_changed_by_name` en `appointments`.
- **FR-002** El endpoint del empleado guarda el nombre del barbero junto al
  `user_id` y la fecha.
- **FR-003** El turnero del dueño muestra autor y fecha en los turnos que los
  tengan, y nada en los que no.
- **FR-004** La agenda del empleado muestra el chip de seña, **el mismo
  componente** que usa el dueño.
- **FR-005** `resolveStaffAccess` exige que el barbero esté activo y no
  borrado. El acceso no se revoca: es un corte, no una baja.
- **FR-006** `APPOINTMENT_SELECT` trae `cancellation_reason`,
  `status_changed_by_name` y `status_changed_at`, con un comentario que
  explique por qué una columna faltante ahí no se nota.

### No funcionales

- **NFR-001** El chip de seña se comparte, no se copia.
- **NFR-002** Un turno sin autor se ve exactamente como hoy.
- **NFR-003** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Registrar autor en las acciones del dueño. Hoy no lo escribe, y agregarlo es
  otra decisión: cuando hay una sola cuenta, "quién" no informa nada.
- Que el empleado pueda hacer algo con la seña. Solo la ve.
