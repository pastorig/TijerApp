# Entrega local: turnero

Fecha: 2026-10-01. Rama: design/admin-shell-remaster. Sin deploy.

## Cambios

- Cabecera compacta, sin texto explicativo redundante; accion de agregar turno de 44 px.
- Calendario con fecha legible, seleccion estable sin escalado, controles tactiles y apertura de mes identificable.
- Busqueda con input de 16 px en movil para evitar zoom automatico y boton de limpiar de 44 px.
- Filtros con contadores y estado seleccionado accesible; vistas Lista/Calendario mas legibles.
- Tarjetas con horarios y precios mas contenidos, nombre completo y acciones en una fila movil.
- Sin movimiento de tarjetas al pasar el cursor; transicion del calendario corta y respetuosa de movimiento reducido.

## Limites

No cambian consultas, permisos, duraciones, proyecciones, conflictos, confirmacion, WhatsApp, cancelacion ni eliminacion. El calendario horario conserva su motor y geometria. No hay SQL ni dependencias nuevas.

## Verificacion

- npm run build: correcto, TypeScript y 223 paginas generadas; sin rutas temporales de preview.
- npm run test:unit: correcto.
- npm run lint -- --ignore-pattern '.gstack/**': sin errores; un aviso previo por toUsageRecords sin uso. La exclusion evita el EPERM de la carpeta de herramientas registrado en la fase anterior.

Pruebas visuales locales con datos interceptados, sin lectura ni escritura en produccion: navegacion, seleccion de filtros, busqueda, vista calendario, estados vacio/error, nombres largos y ausencia de desbordamiento en 360, 390, 768, 1024 y 1440 px.

Capturas: 03-agenda-mobile.png, 03-agenda-desktop.png, 03-agenda-calendario.png y variantes empty/error/long en la carpeta local tijerapp-remaster de visualizaciones.

Para revisar manualmente: entrar al turnero, cambiar dia y barbero, alternar Lista/Calendario y comprobar que las acciones habituales mantienen su comportamiento.
