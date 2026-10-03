# Cobros online - entrega local

Fecha: 2026-10-02.

## Cambios

- Layout integrado en AdminShell, sin main anidado ni padding duplicado.
- Conexion de Mercado Pago separada de la activacion y parametros de seña.
- Secciones abiertas con separadores, sin cards decorativas ni degradados.
- Controles tactiles de 44 px, inputs de 16 px mobile, encabezados contenidos.
- Credenciales manuales plegables con aria-expanded y aria-controls.
- Carga anunciada; error visible y reintento. El formulario no aparece con valores por defecto si falla la consulta.

## Archivos

- src/components/admin/AdminMercadoPagoSettings.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/payments.tsx
- Este documento e indice general.

## Verificacion

- Playwright: 360/390/768/1024/1440 sin desbordamiento, estado conectado y sin conectar, credenciales manuales, error y reintento.
- Sesion ficticia y configuracion interceptada: sin pagos, OAuth real, credenciales reales ni cambios de configuracion.
- Build correcto: TypeScript y 223 paginas.
- test:unit correcto.
- Lint con exclusion .gstack sin errores; warning previo de toUsageRecords en scripts/test-crm-export.ts.
- git diff --check correcto. Avisos previos de Sentry conservados.
- Capturas 09-cobros-mobile.png, 09-cobros-desktop.png, 09-cobros-manual.png, 09-cobros-connected.png y 09-cobros-error.png.

## Limites

OAuth, webhook, payload de guardado, porcentaje, minimo, plazo, permisos y planes intactos. No se prueba conexion/desconexion real ni guardado real por tratarse de un rediseño visual. No hay dependencias nuevas ni SQL. Entrega local sin commit o deploy.
