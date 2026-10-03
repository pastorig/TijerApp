# Entrega local: barberos, servicios y horarios

Fecha: 2026-10-01. Rama: design/admin-shell-remaster. Sin deploy.

## Cambios

- Cabecera contenida y seleccion de profesional con estado accesible.
- Ficha sin marcos anidados; Perfil, Servicios y Horarios siguen separados.
- Controles tactiles de al menos 44 px; inputs de 16 px en movil.
- Servicios con precio, duracion y estado legibles; acciones y formularios existentes conservados.
- Horario semanal, bloqueos y excepciones por fecha identificados por separado.
- Jornada semanal con switches tactiles; pausas admiten reorganizacion en pantallas angostas.
- Alta de barbero en dialogo nativo, con foco contenido, Escape, bloqueo del scroll del fondo y retorno de foco al cerrar.
- Carga anunciada y errores separados del estado sin barberos.

## Compatibilidad

No cambian consultas, guardado, limites de plan, comisiones, activacion, eliminacion, disponibilidad ni calculos de aprovechamiento. Modificar una excepcion conserva su alcance por fecha; no se alteraron handlers de horarios. No hay SQL ni dependencias nuevas.

## Verificacion visual

- npm run build: correcto, TypeScript y 223 paginas generadas; sin rutas temporales de preview.
- npm run test:unit: correcto.
- npm run lint -- --ignore-pattern '.gstack/**': sin errores; un aviso previo por toUsageRecords sin uso. Se conserva la exclusion de la carpeta de herramientas documentada en entregas anteriores.

Datos interceptados localmente sin lecturas ni escrituras en produccion: seleccion de dos profesionales, pestañas, abrir/cancelar edicion y alta de servicios, abrir/cancelar perfil, dialogo de alta y Escape, estados vacio/error/nombres largos, anchos 360, 390, 768, 1024 y 1440 px sin desbordes.

Capturas 05-barberos-mobile.png, 05-barberos-desktop.png, 05-servicios-mobile.png, 05-horarios-mobile.png, 05-horarios-desktop.png y variantes empty/error/long en la carpeta local tijerapp-remaster de visualizaciones.

## Revision manual

Entrar a Barberos, elegir profesional y recorrer Perfil/Servicios/Horarios. Revisar precios y duraciones, apertura/cierre semanal y pausa. Comprobar que una excepcion por fecha no cambia la regla semanal. El guardado real y las operaciones destructivas no se ejecutaron contra produccion durante esta remasterizacion.
