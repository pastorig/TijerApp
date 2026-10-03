# Reportes - entrega local

Fecha: 2026-10-02.

## Cambios

- Jerarquia compacta, tipografia legible y menos espacio vertical.
- Periodo en controles de 44 px, seleccion accesible con aria-pressed y rango debajo de los filtros.
- Metricas sin degradados ni desplazamientos al pasar el mouse; cifras estables.
- Tablas con desplazamiento interno para importes y nombres largos sin desbordar la pagina.
- Carga anunciada y error con reintento que conserva periodo y barbero.

## Archivos

- src/components/admin/AdminReportes.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/reports.tsx

## Verificacion

- Playwright: anchos 360, 390, 768, 1024 y 1440; filtros de periodo/barbero, vacio, nombres/importes largos y error/reintento.
- Capturas 07-reportes-mobile.png, 07-reportes-desktop.png y 07-reportes-error.png.
- Datos simulados: no se consultaron ni modificaron datos de produccion durante la prueba visual.
- Build correcto: TypeScript y 223 paginas.
- test:unit correcto.
- Lint con exclusion de .gstack sin errores; warning previo toUsageRecords en scripts/test-crm-export.ts.
- git diff --check correcto. Avisos previos de Sentry conservados.

## Limites

No se modificaron calculos, consultas, comisiones, exportacion PDF, planes ni permisos. No se probo descarga real del PDF en este lote; se preservo su componente y sus entradas. Cierre de caja se abordara por separado. Sin dependencias, SQL, commit ni despliegue.
