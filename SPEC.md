# SPEC.md

## Objetivo general

TijerApp es un SaaS de gestion de turnos para barberias. La plataforma permite que cada barberia publique una pagina publica, reciba reservas online, administre su agenda y trabaje con uno o varios barberos sin duplicar proyectos por cliente.

El objetivo del producto es ordenar reservas, reducir ausencias y dar a las barberias una herramienta mobile-first, rapida y profesional para operar durante el dia de trabajo.

## Vision SaaS multi-barberia

TijerApp debe funcionar como una plataforma multi-tenant:

- La home `/` pertenece a TijerApp como producto.
- Cada barberia tiene una pagina publica por slug, por ejemplo `/sv-barber`.
- Cada barberia tiene su flujo de reserva por slug, por ejemplo `/sv-barber/reservar`.
- Cada barberia tiene su panel admin por slug, por ejemplo `/sv-barber/admin`.
- En esta fase se mantiene un login admin por barberia.
- En el futuro existira un panel owner para el dueno de la plataforma TijerApp.

Cada barberia debe poder tener:

- Nombre.
- Servicios.
- Precios.
- Horarios.
- Barberos.
- Instagram.
- WhatsApp.
- Reglas de cancelacion.
- Configuracion de duracion de turnos.

## SV Barber como cliente demo

SV Barber es solo el primer cliente/demo de TijerApp. Sus datos sirven para validar la experiencia publica, el flujo de reserva y el panel admin.

SV Barber no debe tratarse como marca principal del producto ni como caso unico. Cualquier referencia a SV Barber debe vivir como dato de barberia demo o contexto puntual de una ruta por slug.

Datos demo actuales:

- Barberia: SV Barber.
- Slug: `sv-barber`.
- Barbero: Santi Vargas.
- Servicio: Corte - $8500 - 30 minutos.
- Servicio: Corte + barba - $10000 - 30 minutos.
- Horario inicial: 16:00 a 21:00.
- Intervalos: 30 minutos.

## MVP actual

El MVP actual incluye:

- Next.js con App Router, TypeScript, Tailwind CSS y ESLint.
- Home general de TijerApp.
- Landing publica por barberia.
- Formulario publico de reserva.
- Integracion con Supabase para guardar reservas.
- Bloqueo de horarios ocupados por barberia, fecha y barbero.
- Multi-barbero en datos demo y reservas.
- Apertura de WhatsApp por link `wa.me`.
- Login admin con Supabase Auth.
- Panel admin por barberia.
- Confirmacion y cancelacion de turnos.
- Accion separada para enviar WhatsApp al cliente.

## Reglas de negocio

- Un turno activo puede tener estado `pending` o `confirmed`.
- Un turno `cancelled` no debe bloquear horarios.
- Los horarios ocupados se bloquean por `barbershop_slug`, `barber_id`, fecha y hora.
- La cancelacion minima recomendada es 1 hora antes.
- Clientes que faltan sin avisar pueden perder prioridad en futuras reservas.
- Cada barbero puede tener sus propios servicios, precios y duraciones.
- Una barberia puede activar o desactivar barberos.
- La barberia demo usa turnos de 30 minutos entre 16:00 y 21:00.

## Flujo completo de reserva

1. El cliente entra a la pagina publica de una barberia por slug.
2. El sistema muestra identidad, servicios y llamado a reservar.
3. El cliente entra a `/[barbershopSlug]/reservar`.
4. Si hay un barbero activo, el sistema lo selecciona automaticamente.
5. Si hay varios barberos activos, el cliente selecciona barbero.
6. Los servicios disponibles dependen del barbero seleccionado.
7. El cliente elige fecha y horario.
8. TijerApp consulta Supabase para bloquear horarios ocupados del barbero.
9. El cliente completa nombre, telefono y comentario opcional.
10. El sistema valida campos y disponibilidad.
11. Si la disponibilidad sigue libre, guarda el turno en Supabase.
12. Si el guardado funciona, abre WhatsApp con el mensaje de reserva.
13. La barberia ve el turno en su panel admin.

## Flujo admin actual

1. El admin entra a `/[barbershopSlug]/admin`.
2. Si no tiene sesion, se redirige a `/[barbershopSlug]/admin/login`.
3. El login muestra TijerApp como marca principal y la barberia como contexto.
4. El panel lista turnos de la barberia.
5. El admin puede confirmar un turno con el boton `Confirmar turno`.
6. El admin puede enviar un mensaje con `Enviar WhatsApp`.
7. Confirmar turno no abre WhatsApp.
8. Enviar WhatsApp no cambia el estado.
9. El admin puede cancelar turnos.
10. Los turnos cancelados quedan visibles, pero no bloquean disponibilidad.

## Flujo futuro de WhatsApp API

La integracion actual usa links `wa.me`. En el futuro, WhatsApp API debera:

- Enviar confirmaciones automaticas.
- Enviar recordatorios.
- Permitir respuestas del cliente.
- Registrar confirmaciones, cancelaciones o reprogramaciones.
- Mantener los mensajes desacoplados de la UI.

## Estructura futura de paneles

Home TijerApp:

- Presentacion general del producto.
- Acceso a login.
- Acceso a demos o futuras paginas comerciales.

Panel publico de barberia:

- Landing por slug.
- Servicios.
- Barberos.
- Flujo de reserva.
- Informacion de contacto.

Panel admin de barberia:

- Resumen por fecha.
- Agenda de turnos.
- Confirmacion.
- Cancelacion.
- Envio de WhatsApp.
- Futura gestion de servicios, horarios y barberos.

Panel owner futuro:

- Gestion de barberias cliente.
- Altas privadas.
- Planes y suscripciones.
- Monitoreo de uso.
- Configuracion global de TijerApp.

## Integraciones futuras

- WhatsApp API real.
- Google Calendar.
- Pagos online.
- Emails transaccionales.
- Analitica.
- Observabilidad.
- Gestion visual de barberias, servicios y barberos.

## Enfoque escalable

TijerApp debe crecer sin atarse a SV Barber:

- Configuracion por barberia.
- Slugs como frontera publica y admin.
- Datos de servicios y barberos modelados por cliente.
- Helpers de Supabase separados de la UI.
- Integraciones encapsuladas en `src/lib`.
- Componentes reutilizables y mobile-first.
- Preparacion para roles, owner panel y planes comerciales.
