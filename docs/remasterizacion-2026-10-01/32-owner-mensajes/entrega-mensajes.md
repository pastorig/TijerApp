# Entrega 25: mensajes owner

## Cambios

- Encabezado compacto y filtros en grid 2x2 en movil.
- Estado de filtro accesible con aria-pressed.
- Tarjetas de menor padding y textos secundarios de 12px.
- Nombres, emails y mensajes largos ajustables sin desbordes.
- Acciones y links de contacto de 44px.
- Atendidos y eliminados conservan contraste; estado explicito con etiqueta.
- Error de carga separado del estado vacio y contador desconocido indicado con guion.
- Reintento manteniendo el filtro; carga anunciada con role=status.

## Compatibilidad

Sin cambios en permisos, helpers, consultas, contacto por WhatsApp/email o handlers de atender, reabrir, eliminar y restaurar. No se agregaron envios automaticos, SQL ni dependencias.

## Evidencia

Prueba aislada a 360, 390, 768, 1024 y 1440px sin desbordes. Filtros pending/handled/all/deleted, textos largos, vacio, error y reintento conservando filtro verificados.

Capturas 25-owner-mensajes-mobile/desktop.png, 25-owner-mensajes-error.png y 25-owner-mensajes-vacio.png en las visualizaciones de esta conversacion.

Las mutaciones reales y la eliminacion definitiva no fueron ejecutadas durante las pruebas.
