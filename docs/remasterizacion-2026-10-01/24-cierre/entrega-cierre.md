# Cierre de caja - entrega local

Fecha: 2026-10-02.

## Alcance real encontrado

La pantalla actual es un resumen diario calculado desde appointments. No registra cierres contables, no tiene historial de cierres ni estados abierto/cerrado. Esta entrega no inventa esas funciones ni agrega persistencia. Cobrado real conserva el calculo actual: suma de service_price de turnos confirmed; no es conciliacion de movimientos bancarios.

## Cambios

- Encabezado compacto con barberia y fecha explicita.
- Flechas y controles de 44 px; fecha con label accesible y texto de 16 px en mobile.
- Limpiar la fecha no deja un valor invalido en el estado.
- Grid 2x2 mobile y cuatro columnas desktop para cobrado, potencial, ticket y confirmados.
- Valores estables, sin degradados ni elevacion al hover; nombres e importes largos no desbordan la pagina.
- Detalle mobile con cliente/servicio/barbero y precio/estado agrupados; escritorio mantiene filas horizontales.
- Tabla de produccion con desplazamiento interno si es necesario.
- Carga anunciada y error con reintento. Un error no muestra metricas vacias como resultados validos.
- PDF/CSV deshabilitados mientras carga, ante error o sin turnos.

## Archivos

- src/components/admin/AdminCierreCajaManager.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/closing.tsx
- Documentacion de esta zona e indice general.

## Verificacion

- Playwright con datos simulados: 360, 390, 768, 1024 y 1440 px sin desbordamiento de pagina.
- Dia anterior y regreso a Hoy; fecha y disponibilidad de exportacion correctas.
- Descargas PDF y CSV verificadas con nombre cierre-caja-design-preview-2026-10-01.
- Vacio, nombres/importes largos, error y reintento recuperado.
- No se leyeron ni modificaron datos de produccion durante pruebas visuales.
- Build correcto, TypeScript y 223 paginas; test:unit correcto.
- Lint con exclusion de .gstack sin errores, con warning previo toUsageRecords en scripts/test-crm-export.ts.
- git diff --check correcto. Avisos previos de Sentry no modificados.

## Evidencia y limites

Capturas externas: 08-cierre-mobile.png, 08-cierre-desktop.png, 08-cierre-empty.png, 08-cierre-long.png y 08-cierre-error.png, en tijerapp-remaster.

Se verifico descarga, no inspeccion visual del contenido PDF. Los exportadores, consultas y formulas no fueron modificados. Sin SQL ni dependencias nuevas. Cambios locales, sin commit ni despliegue.
