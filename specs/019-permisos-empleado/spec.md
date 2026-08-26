# Feature Specification: El dueño elige qué ve y qué toca cada empleado

**Feature Branch**: `019-permisos-empleado`
**Created**: 2026-08-25
**Status**: Draft

## Resumen

Con las cuentas de empleados (016) el barbero pasó de compartir la contraseña
del dueño a tener la suya. Pero el acceso sigue siendo **todo o nada**: el que
tiene cuenta ve su agenda con los precios, ve su comisión, confirma, cancela y
tiene el teléfono de cada cliente. No hay forma de darle menos.

Eso no le sirve a cualquier barbería. Hay dueños que no quieren que el barbero
sepa cuánto factura, y hay dueños que no quieren que el barbero pueda cancelar
un turno. Hoy la única alternativa a "que vea todo" es "que no tenga cuenta",
y entonces vuelve a la contraseña compartida, que es justo lo que 016 vino a
resolver.

Esta feature agrega **cuatro tildes por empleado**, en Equipo, al lado de su
acceso.

## La decisión de diseño que no es obvia

**La plata del empleado no vive solo en la pestaña Ganancias.** También está el
precio de cada servicio en su agenda y el "Te llevás" del resumen del día. Son
el mismo dato entrando por tres puertas.

Por eso **"Ver lo que gana" es un solo tilde que apaga las tres cosas**. Tres
tildes separados serían tres formas de dejar la puerta abierta sin darse cuenta.

## User Scenarios & Testing

### El dueño le saca las ganancias a un barbero

1. Entra a Equipo, al empleado que ya tiene acceso.
2. Destilda **Ver lo que gana**.
3. El barbero, la próxima vez que abre, no tiene la pestaña Ganancias, no ve el
   "Te llevás" y sus turnos no muestran el precio.
4. Si escribe la URL de Ganancias a mano, tampoco la ve.

### El barbero que solo mira su turnero

1. El dueño destilda los cuatro.
2. El barbero abre y ve sus turnos: hora, cliente, servicio y duración.
3. No hay botón de confirmar, ni de cancelar, ni de WhatsApp, ni precios, ni
   pestaña de Ganancias.

### El empleado que intenta pasar por al lado

1. Un empleado sin permiso de cancelar arma la llamada a mano contra
   `/api/staff/appointment-status`.
2. El servidor la rechaza. **Los tildes se aplican en el servidor**: esconder
   un botón no es un permiso.

### Casos borde

- **Los accesos que ya existen** arrancan con los cuatro tildes prendidos: el
  día que se deploya nadie pierde nada de lo que hoy tiene.
- **Sin ningún permiso**, la pantalla de Ganancias no queda en blanco: dice que
  el dueño no la habilitó.
- **Revocar y volver a dar** el acceso: los permisos vuelven al default.
- El dueño **no se limita a sí mismo**: esto es solo para empleados.

## Requisitos

### Funcionales

- **FR-001** Cuatro permisos por empleado, en `barber_staff_access`, todos con
  default "sí": ver lo que gana, confirmar, cancelar y contactar al cliente.
- **FR-002** El dueño los edita desde Equipo, en la fila del empleado.
- **FR-003** **Sin "ver lo que gana"**: `/api/staff/earnings` responde 403,
  `/api/staff/agenda` no devuelve `service_price` ni `comisionDelDia`, la
  pestaña Ganancias no se muestra y su ruta avisa que no está habilitada.
- **FR-004** **Sin "confirmar"** o **sin "cancelar"**:
  `/api/staff/appointment-status` rechaza esa acción con 403 y el botón no
  aparece.
- **FR-005** **Sin "contactar al cliente"**: `/api/staff/agenda` no devuelve
  `customer_phone` y no aparece el botón de WhatsApp.
- **FR-006** Los permisos viajan al cliente por los mismos endpoints que ya se
  llaman; no se agrega un pedido nuevo solo para saberlos.
- **FR-007** Cambiar un permiso queda registrado igual que el resto de Equipo:
  quién y cuándo.

### No funcionales

- **NFR-001** Migración **aditiva**: columnas nuevas con default, ninguna fila
  existente cambia de conducta.
- **NFR-002** Un solo lugar decide qué puede hacer un empleado. La lista de
  permisos no se escribe dos veces (una en el server y otra en la UI).
- **NFR-003** Sin dependencias nuevas.
- **NFR-004** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Permisos para administradores: esto es solo para empleados.
- Que el empleado **cargue un turno a mano** o **bloquee un horario**. Son
  capacidades que hoy no existen; cuando se construyan, cada una suma su tilde.
- Un editor de roles con nombres ("encargado", "junior"). Con cuatro tildes por
  persona alcanza; los roles se justifican cuando haya muchos más permisos.
