# Feature Specification: La pantalla del empleado, con el sistema de diseño del panel

**Feature Branch**: `018-empleado-design-system`
**Created**: 2026-08-25
**Status**: Draft

## Resumen

Las tres pantallas del empleado (`/[slug]/mi-agenda`, `/ganancias`, `/cuenta`)
se escribieron rápido, en las features 016 y 017, con clases sueltas escritas a
mano. Funcionan, pero **no son el mismo producto que el panel del dueño**: los
botones tienen otra altura, otro tracking y otros colores; las tarjetas son un
`card-premium` a mano en vez de las del sistema; los inputs no pasan por
`Input`/`Field`; y el encabezado no se parece a la barra del admin.

Dos consecuencias concretas:

1. **Se ve como otra app.** El empleado y el dueño usan el mismo producto en la
   misma barbería, y uno de los dos parece una versión sin terminar.
2. **Cada arreglo hay que hacerlo dos veces.** Un `min-h-9` escrito a mano no
   se entera cuando cambia el botón del sistema.

Además hay un pedido puntual del dueño: en `/mi-agenda`, **en escritorio**, el
selector de días es una tira de 7 días fijos. Se quiere que se alargue, que
tenga cómo abrir el mes completo y que se pueda deslizar para cambiar de
semana.

Ese pedido **ya está resuelto en el panel**: `AgendaCalendar` hace exactamente
eso (semana, expandir a mes, swipe, botón "Hoy"). No hay que diseñar nada
nuevo: hay que **compartirlo**. Por eso las dos cosas son una sola feature.

## User Scenarios & Testing

### El barbero mira otro día

1. Abre `/mi-agenda` en la computadora de la barbería.
2. Ve la semana entera, con el día de hoy marcado y un puntito en los días que
   tienen turnos.
3. Desliza para pasar a la semana que viene, o toca el tirador y se abre el
   mes completo.
4. Toca un día: el mes se cierra y abajo aparecen los turnos de ese día.
5. Toca "Hoy" y vuelve.

### El barbero pasa del panel a su agenda

1. Un barbero que además es dueño entra al panel y después a su agenda.
2. **No siente que cambió de aplicación**: la barra de arriba, las pestañas,
   los botones, las tarjetas y los chips de estado son los mismos.

### Casos borde

- **Sin turnos en el día**: el calendario sigue igual, el vacío es abajo.
- **Comisión sin configurar**: sigue mostrando el texto explicativo, nunca $0.
- **Barbería sin acceso**: la pantalla de "no tenés acceso" también se rehace
  con los componentes del sistema.
- **Celular**: sigue siendo lo primero. El calendario ya nació mobile; el
  ancho grande es solo de `lg` para arriba.

## Requisitos

### Funcionales

- **FR-001** `/mi-agenda` usa el mismo calendario que el panel del dueño:
  strip semanal, expandir a mes, deslizar para cambiar semana/mes, botón "Hoy".
- **FR-002** El calendario muestra un punto en los días con turnos del propio
  empleado, con la misma escala de color que el del dueño (1-3 verde, 4-6
  ámbar, 7+ rojo).
- **FR-003** Los conteos por día los resuelve el servidor a partir del token,
  igual que la agenda: **el cliente nunca manda un `barber_id`**.
- **FR-004** Todos los botones de las pantallas del empleado son el `Button`
  del sistema. No queda ningún `<button>` con clases de botón escritas a mano.
- **FR-005** Los chips de estado del turno son el `Badge` del sistema.
- **FR-006** El formulario de contraseña usa `Field` + `Input`.
- **FR-007** Las tarjetas de números (turnos del día, comisión, producción)
  usan `MetricCard`, igual que el dashboard del dueño.
- **FR-008** El encabezado del empleado usa el mismo lenguaje que la barra del
  admin: barra sticky de 56px con el nombre de la sección y su ícono dorado, y
  las pestañas como subpestañas con borde inferior.
- **FR-009** El contenido usa el mismo ancho y los mismos márgenes que el
  panel, en vez de quedar en una columna de celular en una pantalla de 27".

### No funcionales

- **NFR-001** Sin migraciones de base.
- **NFR-002** Sin dependencias nuevas.
- **NFR-003** El calendario compartido **no cambia de comportamiento para el
  dueño**: se mueve de carpeta y gana una prop opcional, nada más.
- **NFR-004** Verde en `tsc --noEmit`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Tocar el turnero del dueño (`AgendaCalendarGridView`), que es otra vista.
- Cambiar qué datos ve el empleado. Esta feature es de forma, no de permisos.
