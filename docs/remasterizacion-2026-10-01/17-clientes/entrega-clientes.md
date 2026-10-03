# Entrega local: clientes

Fecha: 2026-10-01. Rama: design/admin-shell-remaster. Sin deploy.

## Cambios

- Cabecera compacta, nombre de barberia como contexto y acciones de CSV legibles.
- Busqueda de 16 px en movil, filtros tactiles con contador y estado seleccionado accesible.
- Filas compactas sin movimiento al filtrar ni al pasar el cursor; nombres y telefonos legibles.
- Ficha con titulo contenido, resumen, comportamiento, datos e historial; secciones sin recuadros anidados.
- Etiquetas con controles tactiles, input identificado y texto de mayor contraste.
- Historial y metricas admiten nombres largos sin ocultar informacion.
- Error de carga separado del estado sin clientes.

## Correccion puntual

La busqueda por nombre incluia clientes ajenos: el texto sin numeros generaba una cadena vacia de telefono, presente en todos los telefonos. Se exige que la consulta telefonica tenga digitos antes de compararla. Una prueba reprodujo el fallo antes del cambio y paso despues.

## Compatibilidad

Sin cambios en consultas, permisos, guardado, exportacion, importacion, eliminacion, asociacion por telefono ni calculos de visitas/segmentos. La correccion de busqueda es la unica modificacion funcional. No hay SQL, dependencias nuevas ni escrituras en produccion.

## Evidencia visual

- npm run build: correcto, incluidos TypeScript y 223 paginas generadas.
- npm run test:unit: correcto.
- npm run lint -- --ignore-pattern '.gstack/**': sin errores; aviso previo por toUsageRecords sin uso. Se mantiene la exclusion de la carpeta de herramientas cuyo EPERM fue documentado antes.
- Pruebas visuales: filtros de segmento, agregar/quitar etiqueta sin guardar, carga, error y retorno a listado con busqueda conservada.

Capturas 04-clientes-mobile.png, 04-clientes-desktop.png, 04-ficha-mobile.png, 04-ficha-desktop.png y estados empty/error/long en la carpeta local tijerapp-remaster de visualizaciones.

Pruebas con datos interceptados: buscar por nombre y telefono, sin coincidencias, abrir ficha, volver conservando busqueda, estados vacio/error y nombres largos; anchos 360, 390, 768, 1024 y 1440 px.

Para revisar manualmente: buscar un cliente, abrir ficha, leer historial, editar datos y etiquetas, guardar, volver y comprobar filtros. Importacion, eliminacion y guardado real no se ejecutaron contra produccion durante este rediseño.
