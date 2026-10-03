# Entrega 21: resumen owner

## Alcance

Se actualiza OwnerInsights. El listado operativo de OwnerDashboard no se modifica y queda para la siguiente entrega.

- Ingreso mensual destacado y proyeccion anual con mejor lectura.
- Grid compacto: principal a ancho completo y dos tarjetas secundarias en movil.
- Estados de actividad legibles, sin depender exclusivamente del color.
- Distribucion integrada sin contenedor decorativo adicional.
- Textos mas claros, etiquetas de al menos 12px y nombres largos ajustables.
- Se retiran gradientes, glow y movimiento hover de las metricas.
- Carga anunciada con espacio reservado.
- Error de metricas: no muestra cifras como si fueran resultados validos.
- Error de planes: importes no disponibles y accion Reintentar.
- Excepciones de carga capturadas y reintento protegido al desmontar.
- Un conjunto vacio no muestra el mensaje de que todas las barberias tienen actividad.

## Compatibilidad

Sin cambios en formulas MRR/ARR, precios de fundador, exclusiones demo, consultas, permisos, endpoints, SQL o dependencias. El reintento usa las mismas fuentes de datos.

## Evidencia

Prueba aislada con respuestas de demostracion e interceptacion de red; no se enviaron mutaciones a Supabase.

- Viewports 360, 390, 768, 1024 y 1440px sin desbordamiento horizontal.
- Error y recuperacion de metricas.
- Error y recuperacion de planes.
- Capturas mobile, desktop y ambos errores: 21-owner-insights-*.png en las visualizaciones de esta conversacion.
- Lint sin errores, una advertencia previa en scripts/test-crm-export.ts.
- Build correcto: 223 paginas; avisos previos de Sentry.
- Suite unitaria correcta.

No se prueban en esta entrega acciones del listado de barberias ni se publica a produccion.
