# Cupones admin: entrega visual

Fecha: 2026-10-02. Zona 16. Cambios locales sin commit ni deploy.

## Cambios
- Formulario y listado en secciones abiertas, con jerarquia compacta.
- Campos con labels asociados, unidades %/ARS y tipografia mobile de 16px.
- Selector porcentual/fijo con aria-pressed y controles tactiles de 44px.
- Cada cupon agrupa codigo, descuento, vencimiento y usos.
- Estados textuales: vigente, pausado, vencido, agotado o proximamente.
- Copiar codigo con feedback solo tras escritura exitosa al portapapeles.
- Icono de eliminar con nombre accesible y confirmacion existente preservada.
- Codigos largos ajustan linea; cupones pausados ya no pierden legibilidad.
- Error de carga recuperable sin falso estado vacio; reintento conserva formulario.

## Archivos
- src/components/admin/AdminCouponsManager.tsx.
- scripts/capture-admin-shell.mjs.
- scripts/fixtures/admin-shell/coupons.tsx.

## Verificacion
- Navegador con fixtures: 360, 390, 768, 1024, 1440px sin desborde.
- Capturas mobile/desktop, vacio, error y codigo largo.
- Cambio de tipo/unidad, limite porcentual HTML y copia de codigo comprobados.
- Eliminacion abierta y cancelada; no hubo operaciones reales.
- Reintento recupera listado y conserva codigo ingresado.
- Pruebas unitarias existentes y build con TypeScript/223 paginas correctos.

## Limites
Sin cambios en endpoints, RPC de descuentos, SQL, planes o dependencias.
Los estados visuales usan las fechas y usos existentes; la validacion definitiva
continua en el servidor. No se altero el precio final de una reserva.
No se probaron creacion, pausa ni eliminacion contra datos reales.
La eliminacion permanente es el comportamiento previo y no se cambio.
La concurrencia del contador de usos y errores de red en mutaciones quedan
para una revision funcional separada, no acreditada por esta entrega visual.
