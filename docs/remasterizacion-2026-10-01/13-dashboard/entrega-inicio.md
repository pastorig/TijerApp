# Entrega 02: Inicio del admin

Estado: implementado localmente. Sin commit, push ni deploy.
Rama: design/admin-shell-remaster. Fecha: 2026-10-01.

## Diseno aplicado

- Nombre de barberia a escala operativa, sin titular gigante ni tracking.
- Proximo turno primero en mobile; al lado del resumen en desktop.
- Tarjeta del turno compacta con hora, cliente, servicio, estado y contactos.
- Resumen 2x2: turnos de hoy, pendientes, ingresos estimados y ocupacion.
- Superficies neutras; acento dorado reservado al proximo turno y acciones.
- Agenda con estados de al menos 12px, controles tactiles y filas contenidas.
- Accesos rapidos horizontales, sin mosaicos cuadrados altos.
- Carga accesible con estructura del nuevo resumen.
- Ajuste de nombres largos y valores monetarios extensos sin cortar datos
  en la tarjeta principal. La lista compacta mantiene truncado existente.

## Compatibilidad

No se modificaron consultas, calculos, estados, precios, permisos ni links.
Los totales conservan su significado: turnos totales incluyen cancelados;
ingresos estimados solo suman activos. No se presentan como dinero cobrado.
Onboarding, alertas y acceso a WhatsApp conservan funcionamiento.
No se modifico MetricCard compartido con empleados.

## Archivos

Modificado src/components/admin/AdminDashboard.tsx.
Nuevo src/components/admin/DashboardSummary.tsx, presentacion tipada sin queries.
Ampliado scripts/capture-admin-shell.mjs con --dashboard.

## Evidencia y limites

Capturas locales en tijerapp-remaster:
02-inicio-mobile.png y 02-inicio-desktop.png, mas variantes empty, error,
loading y long. Todas usan fixtures; no se accedio a datos reales ni se
crearon reservas para probar. No equivalen a una prueba autenticada productiva.

La prueba verifica prioridad mobile, cuatro metricas, fila compartida desktop,
ancho del documento y limite real de cada fila, asi como carga/vacio/error.
Tambien repite Escape, foco, backdrop y navegacion activa del shell.
Las rutas temporales se retiran al terminar la prueba.

## Verificacion final

- Build y TypeScript correctos, sin rutas temporales incluidas.
- Suite test:unit completa correcta.
- Lint global correcto excluyendo .gstack/** por su EPERM previo;
  conserva un warning existente en test-crm-export.ts.
- Prueba visual completa correcta, incluidas carga/vacio/error/textos largos,
  cuatro metricas y primer turno dentro del primer viewport mobile normal.
- Comparacion con HEAD confirma intacta la logica de carga y calculos
  del componente AdminDashboard.

## Continuacion de implementacion

Siguiente zona: turnero/agenda, conservando duracion real, conflictos,
horario efectivo, filtros y acciones de estado.
