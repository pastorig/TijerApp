# Entrega 22: listado operativo owner

## Cambios

- Encabezado reducido para dar prioridad a la operacion.
- Filas de barberias compactas, sin animacion hover ni recorte de nombres largos.
- Links admin y pagina publica en dos columnas en movil.
- Ordenamiento con etiquetas visibles y estado aria-pressed.
- Busqueda de 16px en movil y boton de limpieza de 44px.
- Menu de acciones con apertura tactil de 44px.
- Textos secundarios de al menos 12px, colores existentes y acento dorado solido.
- Las metricas y el listado no se renderizan tras un error de carga.
- Barberias inactivas identificadas como archivadas, sin cambiar su estado real.

## Compatibilidad

No se modificaron consultas, permisos, reglas de eliminacion, restauracion, reseteo de credenciales o links. No hay cambios SQL ni dependencias nuevas. Las acciones sensibles mantienen sus confirmaciones existentes.

## Evidencia

Pruebas aisladas con datos simulados: viewports 360, 390, 768, 1024 y 1440px sin desbordes, nombres largos, ordenamiento, busqueda sin resultados y limpieza, destino del link admin, apertura del menu y cierre con Escape.

Capturas 22-owner-listado-mobile.png y 22-owner-listado-desktop.png en las visualizaciones de esta conversacion. No se ejecutaron eliminaciones, reseteos ni restauraciones reales.

Los dialogs de acciones sensibles, alta, planes y mensajes no se consideran remasterizados por esta entrega.
