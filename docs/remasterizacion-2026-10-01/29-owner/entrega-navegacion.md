# Entrega 20: navegacion owner

## Alcance

Navegacion y contenedor del panel owner. El dashboard de metricas y la gestion de barberias quedan para una entrega posterior.

- Menu movil con dialogo nativo, cierre con Escape y control del foco.
- Bloqueo del scroll de fondo y restauracion del foco al cerrar.
- Cierre automatico al pasar a escritorio.
- Accesos tactiles amplios, jerarquia compacta y sidebar de escritorio consistente.
- Animacion reutilizada con respeto por movimiento reducido.
- Mensaje visual si falla el cierre de sesion.
- Sin cambios en permisos, datos, rutas de destino ni comportamiento de logout.

## Verificacion

Prueba aislada con contenido demostrativo, sin llamadas externas ni modificaciones de datos. Se comprobaron teclado, Escape, foco, scroll, cambio de viewport y ausencia de desbordamiento a 360, 390, 768, 1024 y 1440 px.

Capturas: 20-owner-mobile.png, 20-owner-menu.png y 20-owner-desktop.png, en el directorio de visualizaciones de esta conversacion.

Build y pruebas unitarias correctos. Las rutas de prueba se eliminan al terminar y no forman parte del build.
