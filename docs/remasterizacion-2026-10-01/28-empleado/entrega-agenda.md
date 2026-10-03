# Empleado: agenda y navegacion

Fecha: 2026-10-02. Zona 17. Entrega parcial de la experiencia del empleado.
Ganancias y cuenta quedan para la siguiente zona. Cambios locales sin deploy.

## Cambios
- Proximo turno priorizado arriba del calendario, con hora y cliente visibles.
- Resumen de turnos y comision compacto, sin efectos decorativos.
- Valores pendientes de carga o error muestran guion, no cifras falsas.
- Acciones en dos columnas mobile y fila flexible desktop, con objetivos de 44px.
- Nombres, servicios y notas ajustan linea en lugar de truncarse.
- Cancelados conservan estado explicito sin reducir opacidad de toda la tarjeta.
- Carga y errores separados de agenda vacia; reintento mantiene fecha elegida.
- Navegacion semantica, pestaña actual accesible y salida de sesion de 44px.
- Contenido desktop mantiene calendario/resumen a izquierda y agenda a derecha.

## Archivos
- src/components/staff/StaffAgenda.tsx.
- src/components/staff/StaffShell.tsx.
- scripts/capture-admin-shell.mjs.
- scripts/fixtures/admin-shell/staff.tsx.

## Evidencia
- QA con fixtures sin lecturas/mutaciones productivas.
- 360, 390, 768, 1024 y 1440px sin desborde horizontal.
- Comprobacion explicita de etiquetas no truncadas y acciones tactiles.
- Capturas mobile, desktop, nombres largos, vacio, error, sin permisos y revocado.
- Permisos restringidos ocultan ganancias, confirmar, agregar y WhatsApp.
- Acceso revocado conserva pantalla sin acceso.
- Reintento de agenda recupera carga.
- Pruebas unitarias existentes correctas.
- Lint sin errores; warning previo en scripts/test-crm-export.ts.

## Compatibilidad y limites
No se cambiaron endpoints, permisos, RLS, consultas, calculos, comisiones,
duraciones o reglas de WhatsApp. Sin SQL ni dependencias nuevas.
El servidor sigue resolviendo el barbero a partir de la sesion.
La revision visual no acredita cambios reales de turno, logout ni aislamiento
productivo: las acciones de mutacion no se ejecutaron.
Modales de carga/mover/bloquear, ganancias y cuenta no fueron rediseñados aun.
