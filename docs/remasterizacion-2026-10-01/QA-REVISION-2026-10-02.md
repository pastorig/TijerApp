# Revision QA y pendientes - 2 de octubre de 2026

## Estado de publicacion
El rediseño sigue local en la rama design/admin-shell-remaster. Esta revision no hizo commit, push ni deploy. No se modificaron credenciales, pagos, planes, configuraciones o reservas reales. No se ejecutaron migraciones.

## Alcance y limites
Se recorrio el admin real de Primebarber con una cuenta QA y lectura de Supabase, sobre el servidor local. Esto prueba la interfaz local contra los datos actuales, NO el despliegue de produccion.
Se revisaron caminos de codigo de reserva, disponibilidad, invitacion de equipo, permisos, notificaciones y ventanas del owner.
Las 13 superficies publicas y de acceso tienen capturas y comprobaciones responsive del bloque anterior. No se verificaron todos los estados de todas las rutas ni cada una de las 60 rutas API. No es una certificacion de seguridad ni de accesibilidad.
No se hicieron reservas reales ni confirmaciones/cancelaciones/reprogramaciones persistentes: hay triggers que encolan push y flujos que envian email. Bloquear peticiones en el navegador NO bloquea un cron o trigger del servidor. Esos escenarios necesitan aislar los destinatarios antes de ejecutar escrituras.
No se probaron pagos, envios de Correo Argentino, entrega real de email, cron, push ni registros nuevos.

## Comprobaciones del admin real
Inicio, turnero, clientes, barberos, equipo, reportes, cierre, cobros, configuracion, galeria, recordatorios, lista de espera, reseñas, fidelizacion y cupones:
- HTTP 200 en las 15 rutas.
- Sin errores JavaScript capturados durante el recorrido.
- Sin desbordamiento horizontal de documento a 360, 390, 768 y 1440 px.
- No se observaron respuestas HTTP fallidas en la ventana de observacion. Esta ventana no garantiza que todo trabajo diferido haya terminado.
- Las alertas examinadas eran consejos de onboarding o un contenedor vacio de Next, no errores de datos. Contar role=alert no equivale a contar errores.
- En equipo se cargo el administrador real, y se mostro Invitar admin.
- Menu mobile: 18 pasos de Tab permanecen dentro; Escape cierra y devuelve el foco al disparador.

## Aislamiento real comprobado con la cuenta QA
- appointments de Primebarber: HTTP 200 y una fila visible en consulta limitada a una fila.
- appointments de SV Barber: HTTP 200 y cero filas visibles.
- GET equipo de SV Barber: HTTP 403.
- GET planes del owner: HTTP 403.
Esto es evidencia puntual, no prueba de todas las tablas ni permisos de escritura. No se imprimieron identificadores de reservas, contraseñas ni tokens.

## Fallo corregido en esta revision
### Historial de pagos del owner: recargas en bucle
ToastProvider recreaba su API en cada render. PaymentsHistory depende de toast en su useCallback y effect. Un toast de error cambiaba esa dependencia y disparaba otra carga, otro toast y otra carga.
La prueba aislada reprodujo 287 consultas nuevas en 2,5 segundos de observacion.
Se estabilizo la API con useMemo y dependencias push/dismiss, ya estables.
La misma prueba paso despues de corregirlo. No se modifico el calculo de planes ni el registro de pagos.
Archivos: src/components/ui/Toast.tsx y scripts/capture-owner-insights.mjs (--history-error).

## Pendientes prioritarios detectados por codigo

### P1 - Disponibilidad: cerrar ante errores de base
src/lib/server/slot-availability.ts:95-141 usa data o valores por defecto sin comprobar error en shopRes, schedulesRes, overrideRes, blocksRes y apptsRes.
Si falla una consulta, puede calcular disponibilidad sin pausas, bloqueos o turnos existentes.
Recomendacion: rechazar la operacion con error recuperable; no transformar un fallo en agenda libre. Probar cada consulta fallando.
Hallazgo por codigo; no se interrumpio Supabase real para reproducirlo.

### P1 - Reservas: validar servicio y barbero activos en servidor
src/app/api/appointments/book/route.ts:221-240 comprueba servicio, barberia, barbero y deleted_at, pero no is_active del servicio. La disponibilidad consultada tampoco verifica un barbero activo/no eliminado.
Una peticion construida fuera del selector puede usar un servicio desactivado. El nombre del barbero tambien se acepta del cliente (299-302), en lugar de resolverlo de la base.
Recomendacion: obtener barbero activo real y servicio activo antes de validar el horario; resolver su nombre en servidor.
No se enviaron peticiones manipuladas que pudieran crear filas.

### P1 - Invitaciones: no resetear cuentas existentes desde otra barberia
src/app/api/admin/team/route.ts:323-372 resetea la contraseña de usuarios existentes que no sean platform_owner, aunque pertenezcan a otras barberias.
El dueño de una barberia puede provocar perdida de acceso o cambio de credenciales de un admin ajeno al invitar su email. No hay que resetear la cuenta global para asignarle una nueva membresia.
El chequeo de platform_owner no comprueba error: un fallo de consulta podria caer en la rama que resetea.
Recomendacion: conservar credenciales existentes y enviar invitacion/aviso, con flujo de aceptacion si corresponde. Reset de contraseña solo iniciado por el titular o por un proceso owner explicitamente autorizado.
No se invitaron usuarios ni se resetearon contraseñas.

### P1 - Contraseñas temporales y entrega de invitaciones
src/app/api/admin/team/route.ts:18-27 genera claves con Math.random, no un generador criptografico.
El envio en linea 123 no examina el error que Resend puede devolver sin lanzar excepcion: puede devolverse exito aunque no se entrego la invitacion.
Para platform_owner se evita cambiar contraseña, pero sendInvitationEmail sigue recibiendo la temporal generada y el template la muestra: email con clave que no funciona.
Recomendacion: aleatoriedad criptografica; credenciales solo para cuentas nuevas; evaluar resultado de envio y comunicar por separado acceso creado/email enviado.
No se enviaron emails reales.

### P2 - Solapamiento concurrente de intervalos
La migracion 20260526120000_appointments_unique_active_slot.sql protege el mismo inicio, barbero y fecha. No protege por si sola intervalos que se pisan con inicios diferentes.
La disponibilidad se lee antes del INSERT. Dos peticiones concurrentes a inicios distintos pueden pasar una lectura desactualizada si sus intervalos se superponen.
Recomendacion: comprobar las restricciones efectivas del esquema remoto y diseñar una garantia transaccional por intervalo antes de cambiar SQL. Una busqueda de las migraciones no encontro una exclusion de rangos, pero eso no demuestra su ausencia en la base real.
No se realizaron reservas concurrentes.

### P2 - Paginacion del equipo
src/app/api/admin/team/route.ts:182,287 busca solamente la primera pagina de 200 usuarios globales de Auth. El limite de cinco admins por barberia no limita la cantidad global de usuarios.
Con mas de 200 cuentas puede mostrar usuario desconocido o intentar crear otra cuenta para un email existente.
Recomendacion: resolver por email/ids mediante mecanismo de servidor apropiado o paginar sin confundir el tamaño global con el del equipo.

### P2 - Acceso owner y APIs de admin no uniformes
AdminAuthGuard permite platform_owner, pero /api/admin/appointments y /api/admin/barbers comprueban solo membresia en barbershop_admins.
Un owner global que entra por el guard puede recibir 403 al ejecutar algunas acciones si no tiene membresia local.
Recomendacion: definir el contrato de administracion global y unificarlo en helpers server. No abrir permisos de forma general para arreglar solo la UI.
Hallazgo de consistencia por codigo; no se uso una cuenta owner real para ejecutar cambios.

### P2 - Ventanas accesibles pendientes
Los modales EditPlan y RegisterPayment en OwnerPlansManager tienen role=dialog y aria-modal, pero no nombre accesible, gestion de foco ni Escape/trampa de foco.
CommercialNavMobileMenu tiene Escape y bloqueo de scroll, pero no contiene el foco ni lo situa en el panel al abrir.
No dar por terminada la accesibilidad del conjunto porque el menu admin pase. Reutilizar el patron existente del admin o un dialog compartido y probar apertura/cierre/Tab/Shift+Tab.

### P3 - Documentacion desactualizada
AGENTS.md aun describe owner, registro, gestion visual de barberos y pagos como no implementados, aunque existen.
Actualizar esa fotografia antes de nuevas fases para que otros agentes no trabajen con restricciones antiguas.

## Validaciones finales
- Build y TypeScript: correctos, 223 paginas generadas.
- test:unit: todas las suites finalizaron correctamente.
- Lint: cero errores y una advertencia previa en scripts/test-crm-export.ts por toUsageRecords sin usar.
- git diff --check: sin errores de espacios; avisos de conversion LF/CRLF.
- Avisos previos de deprecacion de Sentry y de tipo de modulo de Node: siguen presentes.
- Prueba de regresion de historial: fallo antes de corregir y paso despues.
No se midieron Core Web Vitals de produccion ni contraste completo WCAG. El zoom CSS del bloque publico no reemplaza una prueba de zoom real de navegador/lector de pantalla.

## Orden recomendado antes del deploy
1. Resolver validacion de disponibilidad y actividad del servicio/barbero.
2. Corregir invitaciones existentes, aleatoriedad y resultado de email.
3. Terminar ventanas accesibles.
4. Aislar integraciones de Primebarber para pruebas persistentes de reserva, token, confirmacion, cancelacion, reprogramacion, borrado logico y concurrencia.
5. Revisar esquema remoto y garantias de intervalos sin borrar datos.
6. Comprobar produccion/cron/pagos/envios en sandbox especifico.
7. Separar cambios ajenos, revisar diff, commit/push/deploy autorizado y smoke test.

