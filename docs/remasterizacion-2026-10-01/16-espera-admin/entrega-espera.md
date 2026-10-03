# Lista de espera - entrega local

Fecha: 2026-10-02.

## Cambios

- Encabezado compacto y cards operativas sin degradados ni elevacion al hover.
- Filtros con contador propio y aria-pressed; controles de 44 px.
- Preferencia, fecha, cliente y estado agrupados; nombres largos sin desbordar.
- Contraste conservado para entradas no pendientes, sin opacidad sobre toda la fila.
- Reintento de consulta y estado de carga accesible. Error inicial no se muestra como lista vacia.

## Archivos

- src/components/admin/AdminWaitlistManager.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/waitlist.tsx
- Este documento e indice.

## Verificacion

- Playwright: 360/390/768/1024/1440, filtros y contadores 1/2/3, nombres largos, vacio, error/reintento y confirmacion de eliminar cancelada.
- Datos simulados, sin mensajes ni cambios de solicitudes reales.
- Build y test:unit correctos; lint sin errores excluyendo .gstack, con warning previo toUsageRecords en scripts/test-crm-export.ts.
- Capturas 13-espera-mobile.png, 13-espera-desktop.png, 13-espera-empty.png, 13-espera-long.png y 13-espera-error.png.

## Limites

Polling, filtros existentes, endpoints, estados y enlaces de confirmacion intactos. Atendidos conserva la regla actual: cualquier estado distinto de pending, incluyendo cancelled. No se implementaron estados de ofertas inexistentes en esta pantalla. No se probaron mutaciones reales, confirmacion por token ni envio real en este lote visual. Sin SQL, dependencias, commit o deploy.
