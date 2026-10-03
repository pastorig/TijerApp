# Galeria - entrega local

Fecha: 2026-10-02.

## Cambios

- Encabezado compacto y area de subida abierta, sin card envolvente.
- Miniaturas 4:3 estables y cards con radio de 8 px.
- Controles de ordenar/eliminar de 44 px, visibles sin hover.
- Descripciones con label accesible e inputs de 16 px mobile.
- Boton de archivos accesible por teclado, sin depender de un label clickeable.
- Error de carga distinto de galeria vacia, con reintento; subida deshabilitada hasta obtener la lista correctamente.
- Carga y resultados anunciados con status.

## Archivos

- src/components/admin/AdminGalleryManager.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/gallery.tsx
- Esta entrega e indice general.

## Verificacion

- Playwright: 360/390/768/1024/1440, lista con dos imagenes locales, controles de orden, confirmacion de eliminar cancelada, vacio, error y reintento.
- Fotos simuladas usando assets existentes; sin subida, reordenamiento o eliminacion real.
- Build correcto, TypeScript y 223 paginas; test:unit correcto.
- Lint con exclusion .gstack sin errores; warning previo toUsageRecords en scripts/test-crm-export.ts.
- Capturas 11-galeria-mobile.png, 11-galeria-desktop.png, 11-galeria-empty.png y 11-galeria-error.png.

## Limites y pendientes

Almacenamiento, limites, confirmacion y endpoints intactos. No se verifico upload real ni persistencia real de captions. El comportamiento previo de caption optimista sin rollback ante fallo sigue pendiente de un cambio funcional separado. Fallback de imagen rota y progreso detallado de subida tambien quedan pendientes. No se presenta esta entrega como cumplimiento total de esos puntos de la spec.

Sin SQL, dependencias, commit ni despliegue.
