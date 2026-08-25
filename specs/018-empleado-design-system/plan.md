# Plan: La pantalla del empleado, con el sistema de diseño del panel

**Branch**: `018-empleado-design-system`

## La decisión de fondo

El calendario que pide el dueño **ya existe y es genérico**: `AgendaCalendar`
sólo importa `cn` y `date-utils`, nada de admin. Escribir un segundo calendario
para el empleado sería tener dos versiones del mismo gesto (swipe) que se van a
ir separando con el tiempo.

Entonces: **se mueve a `src/components/calendar/`** y lo usan los dos. El
`date-utils` se mueve con él, porque es su dependencia y hoy vive en la carpeta
del admin sólo por historia. Los imports viejos se dejan re-exportando, así el
resto del panel no se toca en esta feature.

## Una prop nueva y una sola

`AgendaCalendar` calcula "hoy" con la hora **del dispositivo**. La agenda del
empleado calcula todo en **hora argentina**, a propósito. Para que no haya dos
"hoy" distintos en la misma pantalla, el calendario acepta `todayYmd` opcional;
si no se lo pasan se comporta exactamente como hoy. El panel del dueño no se
toca.

## Los conteos por día

Para que el mes sirva de algo hay que ver qué días tienen turnos. Se agrega
`GET /api/staff/agenda-counts?bs=&from=&to=`, que devuelve
`{ "2026-08-25": 3, ... }`.

Reglas, heredadas de la agenda:

- El barbero sale del token (`resolveStaffAccess`), nunca del request.
- Los cancelados y los borrados no cuentan: el punto dice "tenés laburo".
- Se pide el rango del **mes visible ± una semana**, así el strip semanal de
  los bordes también tiene puntos.

## Orden de trabajo

1. Mover el calendario y sus helpers a `src/components/calendar/` (sin cambios
   de conducta) y verificar que el panel sigue verde.
2. La prop `todayYmd`.
3. El endpoint de conteos + su test unitario del agrupador.
4. `StaffShell` con el lenguaje de la barra del admin.
5. `StaffAgenda`: calendario + `MetricCard` + `Button` + `Badge`.
6. `StaffEarnings` y `StaffPassword` con `Button`, `MetricCard`, `Field`,
   `Input`.
7. Barrido final: que no quede ningún botón a mano en `src/components/staff/`.

## Riesgos

- **Mover archivos rompe imports en silencio.** Se corre `tsc` inmediatamente
  después del movimiento, antes de tocar nada más.
- **El swipe del calendario en el turnero del dueño.** No se toca su lógica;
  el único cambio es de ruta y una prop opcional.
- **`touch-action` en mobile**: el calendario ya funciona en el panel con los
  mismos gestos, así que no se inventa nada nuevo acá.
