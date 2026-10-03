# Resenas admin - entrega local

Fecha: 2026-10-02.

## Cambios

- Resumen compacto 2x2 en mobile; tipografia operativa sin degradados o elevacion al hover.
- Distribucion en seccion abierta, filtros tactiles de 44 px y seleccion con aria-pressed.
- Comentarios mayores a 220 caracteres desplegables con Leer completa/Ver menos y aria-expanded.
- Nombres y contexto completos; rating con etiqueta accesible de N de 5 estrellas.
- Error con reintento conservando filtro; no se muestra como ausencia de opiniones.
- Carga anunciada mediante status.

## Archivos

- src/components/admin/AdminReviewsManager.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/reviews.tsx
- Esta entrega e indice.

## Verificacion

- Playwright con datos simulados: 360/390/768/1024/1440, filtro sin coincidencias, comentarios largos desplegados, vacio, error/reintento.
- Build correcto, TypeScript y 223 paginas; test:unit correcto.
- Lint excluyendo .gstack sin errores, warning previo toUsageRecords en scripts/test-crm-export.ts.
- Capturas 14-resenas-mobile.png, 14-resenas-desktop.png, 14-resenas-empty.png, 14-resenas-long.png y 14-resenas-error.png.

## Limites

Promedio, distribucion, fuente interna y enlaces WhatsApp intactos. No se modifica Google ni se mezclan valoraciones externas. No se alteraron resenas reales ni se abrieron conversaciones. Sin SQL, dependencias, commit o deploy.
