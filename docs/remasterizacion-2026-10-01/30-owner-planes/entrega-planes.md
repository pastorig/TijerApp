# Entrega 23: planes owner

## Cambios

- Encabezado compacto y descripcion directa.
- Grupos sin contenedor decorativo adicional.
- Acciones Editar y Registrar pago lado a lado en movil, con alto minimo de 44px.
- Nombres ajustables, etiquetas de 12px, inputs de 16px en movil y acento dorado solido.
- Formularios presentados abajo en movil y centrados en escritorio, con altura limitada al viewport y scroll interno.
- Botones de cierre tactiles y demo plegable con aria-expanded.
- Error de planes persistente con reintento; no se confunde con listado vacio.
- Se corrige un bucle de recarga: el toast cambiaba la dependencia del callback de carga. Se usa error inline y callback estable.

## Compatibilidad

No se modifican tarifas, precios de fundador, estados de suscripcion, periodos, validacion de monto inusual, payloads ni endpoints de guardado. No hay SQL ni dependencias nuevas.

## Verificacion

Prueba visual aislada con datos simulados: 360, 390, 768, 1024 y 1440px sin desbordes; apertura y cierre de ambos formularios; error y reintento de planes. Capturas 23-owner-planes-mobile/desktop.png, 23-owner-editar-mobile.png y 23-owner-pago-mobile.png en las visualizaciones de esta conversacion.

No se registraron pagos ni cambios de plan reales. Esta entrega no acredita mejoras de foco/teclado de los dialogs ni recuperacion de errores del historial de pagos, que requieren una revision posterior.
