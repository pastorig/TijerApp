# Entrega 24: alta privada de barberia

## Cambios

- Encabezado y secciones mas compactos.
- Apertura y cierre lado a lado en movil.
- Nombre de servicio a ancho completo, precio y duracion en dos columnas.
- Campos de 16px y alto minimo de 44px en movil.
- Botones Agregar, Quitar y mostrar contrasena con mejor superficie tactil.
- Mostrar contrasena es accesible con teclado y expone aria-pressed.
- Descripcion de dos filas y menor separacion entre campos.
- Correccion de IDs repetidos: contador independiente de la cantidad actual de servicios.

## Compatibilidad

Se conservan validaciones, payload de alta, creacion de cuenta/barbero/servicios, permisos y credenciales elegidas o automaticas. Sin SQL ni dependencias nuevas.

## Evidencia

Prueba visual aislada en 360, 390, 768, 1024 y 1440px sin desbordes. Se quitaron y agregaron servicios para verificar que editar una fila no afecta otra. Se comprobaron visibilidad de contrasena y generacion automatica.

Capturas 24-owner-alta-mobile.png y 24-owner-alta-desktop.png en las visualizaciones de esta conversacion.

No se ejecutaron altas reales ni se enviaron emails. La prueba de interfaz no reemplaza una prueba de alta extremo a extremo en un entorno de testing.
